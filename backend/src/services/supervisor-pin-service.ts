import { eq, and, like, desc, count } from 'drizzle-orm';
import { db, supervisorPins, teams } from '../lib/db';
import { NewSupervisorPin, SupervisorPin } from '../lib/db/schema';
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';
import { hashPassword, verifyPassword } from '../lib/crypto';

// Generate UUID helper
function generateId(): string {
  return randomUUID();
}

// Response types
interface SupervisorPinCreateResult {
  success: boolean;
  supervisorPin?: SupervisorPin;
  error?: {
    code: string;
    message: string;
  };
}

interface SupervisorPinListResult {
  success: boolean;
  supervisorPins?: SupervisorPin[];
  total?: number;
  error?: {
    code: string;
    message: string;
  };
}

interface SupervisorPinUpdateResult {
  success: boolean;
  supervisorPin?: SupervisorPin;
  error?: {
    code: string;
    message: string;
  };
}

interface SupervisorPinVerifyResult {
  success: boolean;
  supervisorPin?: SupervisorPin;
  error?: {
    code: string;
    message: string;
  };
}

interface SupervisorPinDeleteResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export class SupervisorPinService {
  // Create a new supervisor PIN
  static async createSupervisorPin(pinData: {
    teamId: string;
    name: string;
    pin: string;
  }): Promise<SupervisorPinCreateResult> {
    try {
      logger.info('Creating new supervisor PIN', {
        teamId: pinData.teamId,
        name: pinData.name
      });

      // Validate required fields
      if (!pinData.teamId || !pinData.name || !pinData.pin) {
        return {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'teamId, name, and pin are required',
          },
        };
      }

      // Validate team exists
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, pinData.teamId))
        .limit(1);

      if (!team) {
        return {
          success: false,
          error: {
            code: 'TEAM_NOT_FOUND',
            message: 'Team not found',
          },
        };
      }

      // Check if team already has an active supervisor PIN
      const [existingPin] = await db
        .select()
        .from(supervisorPins)
        .where(and(
          eq(supervisorPins.teamId, pinData.teamId),
          eq(supervisorPins.isActive, true)
        ))
        .limit(1);

      if (existingPin) {
        return {
          success: false,
          error: {
            code: 'SUPERVISOR_PIN_EXISTS',
            message: 'Team already has an active supervisor PIN',
          },
        };
      }

      // Validate PIN strength
      if (pinData.pin.length < 4) {
        return {
          success: false,
          error: {
            code: 'WEAK_PIN',
            message: 'Supervisor PIN must be at least 4 characters long',
          },
        };
      }

      // Hash PIN using shared crypto helper for consistency
      const hashedPin = await hashPassword(pinData.pin);

      // Create new supervisor PIN
      const newSupervisorPin: NewSupervisorPin = {
        id: generateId(),
        teamId: pinData.teamId,
        name: pinData.name.trim(),
        pinHash: hashedPin.hash,
        salt: hashedPin.salt,
        isActive: true,
      };

      const [createdSupervisorPin] = await db.insert(supervisorPins).values(newSupervisorPin).returning();

      logger.info('Supervisor PIN created successfully', {
        supervisorPinId: createdSupervisorPin.id,
        teamId: createdSupervisorPin.teamId,
        name: createdSupervisorPin.name
      });

      // Return supervisor PIN without PIN hash
      const { ...supervisorPinResponse } = createdSupervisorPin;
      return {
        success: true,
        supervisorPin: supervisorPinResponse,
      };
    } catch (error) {
      logger.error('Error creating supervisor PIN', { error, pinData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create supervisor PIN',
        },
      };
    }
  }

  // List supervisor PINs
  static async listSupervisorPins(options: {
    page?: number;
    limit?: number;
    search?: string;
    teamId?: string;
    isActive?: boolean;
  } = {}): Promise<SupervisorPinListResult> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;

      logger.info('Listing supervisor PINs', { page, limit, options });

      let query = db
        .select({
          id: supervisorPins.id,
          teamId: supervisorPins.teamId,
          name: supervisorPins.name,
          isActive: supervisorPins.isActive,
          createdAt: supervisorPins.createdAt,
          updatedAt: supervisorPins.updatedAt,
        })
        .from(supervisorPins);

      // Add filters
      const conditions = [];

      if (options.search) {
        conditions.push(like(supervisorPins.name, `%${options.search}%`));
      }

      if (options.teamId) {
        conditions.push(eq(supervisorPins.teamId, options.teamId));
      }

      if (options.isActive !== undefined) {
        conditions.push(eq(supervisorPins.isActive, options.isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count for pagination
      const countQuery = db.select({ count: count() }).from(supervisorPins);
      const searchCountQuery = conditions.length > 0
        ? countQuery.where(and(...conditions))
        : countQuery;

      const [{ total }] = await searchCountQuery;

      // Get paginated results
      const supervisorPinsList = await query
        .orderBy(desc(supervisorPins.createdAt))
        .limit(limit)
        .offset(offset);

      logger.info('Supervisor PINs listed successfully', {
        count: supervisorPinsList.length,
        total,
        page
      });

      return {
        success: true,
        supervisorPins: supervisorPinsList,
        total,
      };
    } catch (error) {
      logger.error('Error listing supervisor PINs', { error, options });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list supervisor PINs',
        },
      };
    }
  }

  // Get supervisor PIN by ID
  static async getSupervisorPin(supervisorPinId: string): Promise<SupervisorPinVerifyResult> {
    try {
      if (!supervisorPinId) {
        return {
          success: false,
          error: {
            code: 'MISSING_SUPERVISOR_PIN_ID',
            message: 'Supervisor PIN ID is required',
          },
        };
      }

      logger.info('Getting supervisor PIN', { supervisorPinId });

      const [supervisorPin] = await db
        .select({
          id: supervisorPins.id,
          teamId: supervisorPins.teamId,
          name: supervisorPins.name,
          pinHash: supervisorPins.pinHash,
          salt: supervisorPins.salt,
          isActive: supervisorPins.isActive,
          createdAt: supervisorPins.createdAt,
          updatedAt: supervisorPins.updatedAt,
        })
        .from(supervisorPins)
        .where(eq(supervisorPins.id, supervisorPinId))
        .limit(1);

      if (!supervisorPin) {
        return {
          success: false,
          error: {
            code: 'SUPERVISOR_PIN_NOT_FOUND',
            message: 'Supervisor PIN not found',
          },
        };
      }

      logger.info('Supervisor PIN retrieved successfully', {
        supervisorPinId,
        teamId: supervisorPin.teamId,
        name: supervisorPin.name
      });

      return {
        success: true,
        supervisorPin,
      };
    } catch (error) {
      logger.error('Error getting supervisor PIN', { error, supervisorPinId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get supervisor PIN',
        },
      };
    }
  }

  // Get active supervisor PIN by team ID
  static async getActiveSupervisorPin(teamId: string): Promise<SupervisorPinVerifyResult> {
    try {
      if (!teamId) {
        return {
          success: false,
          error: {
            code: 'MISSING_TEAM_ID',
            message: 'Team ID is required',
          },
        };
      }

      logger.info('Getting active supervisor PIN for team', { teamId });

      const [supervisorPin] = await db
        .select({
          id: supervisorPins.id,
          teamId: supervisorPins.teamId,
          name: supervisorPins.name,
          pinHash: supervisorPins.pinHash,
          salt: supervisorPins.salt,
          isActive: supervisorPins.isActive,
          createdAt: supervisorPins.createdAt,
          updatedAt: supervisorPins.updatedAt,
        })
        .from(supervisorPins)
        .where(and(
          eq(supervisorPins.teamId, teamId),
          eq(supervisorPins.isActive, true)
        ))
        .limit(1);

      if (!supervisorPin) {
        return {
          success: false,
          error: {
            code: 'ACTIVE_SUPERVISOR_PIN_NOT_FOUND',
            message: 'No active supervisor PIN found for this team',
          },
        };
      }

      logger.info('Active supervisor PIN retrieved successfully', {
        supervisorPinId: supervisorPin.id,
        teamId: supervisorPin.teamId,
        name: supervisorPin.name
      });

      return {
        success: true,
        supervisorPin,
      };
    } catch (error) {
      logger.error('Error getting active supervisor PIN', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get active supervisor PIN',
        },
      };
    }
  }

  // Update supervisor PIN
  static async updateSupervisorPin(
    supervisorPinId: string,
    updateData: {
      name?: string;
      pin?: string;
      isActive?: boolean;
    }
  ): Promise<SupervisorPinUpdateResult> {
    try {
      if (!supervisorPinId) {
        return {
          success: false,
          error: {
            code: 'MISSING_SUPERVISOR_PIN_ID',
            message: 'Supervisor PIN ID is required',
          },
        };
      }

      // Validate supervisor PIN exists
      const existingSupervisorPin = await this.getSupervisorPin(supervisorPinId);
      if (!existingSupervisorPin.success) {
        return {
          success: false,
          error: existingSupervisorPin.error,
        };
      }

      logger.info('Updating supervisor PIN', { supervisorPinId, updateData });

      // Prepare update object
      const updateFields: Partial<NewSupervisorPin> = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) {
        const nameTrimmed = updateData.name.trim();
        if (nameTrimmed.length === 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_NAME',
              message: 'Supervisor PIN name cannot be empty',
            },
          };
        }
        updateFields.name = nameTrimmed;
      }

      if (updateData.pin) {
        if (updateData.pin.length < 4) {
          return {
            success: false,
            error: {
              code: 'WEAK_PIN',
              message: 'Supervisor PIN must be at least 4 characters long',
            },
          };
        }

        const hashedPin = await hashPassword(updateData.pin);
        updateFields.pinHash = hashedPin.hash;
        updateFields.salt = hashedPin.salt;
      }

      if (updateData.isActive !== undefined) {
        updateFields.isActive = updateData.isActive;
      }

      // Update supervisor PIN in database
      const [updatedSupervisorPin] = await db
        .update(supervisorPins)
        .set(updateFields)
        .where(eq(supervisorPins.id, supervisorPinId))
        .returning();

      logger.info('Supervisor PIN updated successfully', {
        supervisorPinId,
        name: updatedSupervisorPin.name
      });

      return {
        success: true,
        supervisorPin: updatedSupervisorPin,
      };
    } catch (error) {
      logger.error('Error updating supervisor PIN', { error, supervisorPinId, updateData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update supervisor PIN',
        },
      };
    }
  }

  // Delete (deactivate) supervisor PIN
  static async deleteSupervisorPin(supervisorPinId: string): Promise<SupervisorPinDeleteResult> {
    try {
      if (!supervisorPinId) {
        return {
          success: false,
          error: {
            code: 'MISSING_SUPERVISOR_PIN_ID',
            message: 'Supervisor PIN ID is required',
          },
        };
      }

      logger.info('Deactivating supervisor PIN', { supervisorPinId });

      // Check if supervisor PIN exists
      const existingSupervisorPin = await this.getSupervisorPin(supervisorPinId);
      if (!existingSupervisorPin.success) {
        return {
          success: false,
          error: existingSupervisorPin.error,
        };
      }

      // Soft delete by deactivating
      await db
        .update(supervisorPins)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(supervisorPins.id, supervisorPinId));

      logger.info('Supervisor PIN deactivated successfully', { supervisorPinId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting supervisor PIN', { error, supervisorPinId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete supervisor PIN',
        },
      };
    }
  }

  // Verify supervisor PIN
  static async verifySupervisorPin(teamId: string, pin: string): Promise<{
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      // Get active supervisor PIN for team
      const supervisorPinResult = await this.getActiveSupervisorPin(teamId);

      if (!supervisorPinResult.success) {
        return {
          success: false,
          error: supervisorPinResult.error,
        };
      }

      const supervisorPin = supervisorPinResult.supervisorPin!;

      // Verify PIN
      const isValid = await verifyPassword(pin, supervisorPin.pinHash, supervisorPin.salt);

      if (!isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_SUPERVISOR_PIN',
            message: 'Invalid supervisor PIN',
          },
        };
      }

      // Update last accessed timestamp
      await db
        .update(supervisorPins)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(supervisorPins.id, supervisorPin.id));

      return { success: true };
    } catch (error) {
      logger.error('Error verifying supervisor PIN', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify supervisor PIN',
        },
      };
    }
  }

  // Rotate supervisor PIN
  static async rotateSupervisorPin(
    teamId: string,
    newPin: string,
    name?: string
  ): Promise<SupervisorPinCreateResult> {
    try {
      logger.info('Rotating supervisor PIN', { teamId, name });

      // Get current active PIN
      const currentPinResult = await this.getActiveSupervisorPin(teamId);

      if (currentPinResult.success) {
        // Deactivate current PIN
        await this.deleteSupervisorPin(currentPinResult.supervisorPin!.id);
      }

      // Create new PIN
      return await this.createSupervisorPin({
        teamId,
        name: name || 'Supervisor PIN',
        pin: newPin,
      });
    } catch (error) {
      logger.error('Error rotating supervisor PIN', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to rotate supervisor PIN',
        },
      };
    }
  }

  // Get supervisor PIN statistics
  static async getSupervisorPinStats(teamId?: string): Promise<{
    success: boolean;
    stats?: {
      totalSupervisorPins: number;
      activeSupervisorPins: number;
    };
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      let query = db
        .select({
          total: count(),
          active: count(),
        })
        .from(supervisorPins);

      const conditions = [];
      if (teamId) {
        conditions.push(eq(supervisorPins.teamId, teamId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const [stats] = await query;

      return {
        success: true,
        stats: {
          totalSupervisorPins: stats.total || 0,
          activeSupervisorPins: stats.active || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting supervisor PIN stats', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get supervisor PIN statistics',
        },
      };
    }
  }
}
