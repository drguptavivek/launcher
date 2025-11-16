import { eq, and, like, desc, count } from 'drizzle-orm';
import { db, users, teams, userPins, devices } from '../lib/db';
import { NewUser, User, NewUserPin } from '../lib/db/schema';
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';
import { hashPassword, verifyPassword } from '../lib/crypto';

// Generate UUID helper
function generateId(): string {
  return randomUUID();
}

// Response types
interface UserCreateResult {
  success: boolean;
  user?: User;
  error?: {
    code: string;
    message: string;
  };
}

interface UserListResult {
  success: boolean;
  users?: User[];
  total?: number;
  error?: {
    code: string;
    message: string;
  };
}

interface UserUpdateResult {
  success: boolean;
  user?: User;
  error?: {
    code: string;
    message: string;
  };
}

interface UserGetResult {
  success: boolean;
  user?: User;
  error?: {
    code: string;
    message: string;
  };
}

interface UserDeleteResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export class UserService {
  // Create a new user
  static async createUser(userData: {
    teamId: string;
    code: string;
    displayName: string;
    email?: string;
    role?: 'TEAM_MEMBER' | 'FIELD_SUPERVISOR' | 'REGIONAL_MANAGER' | 'SYSTEM_ADMIN' | 'SUPPORT_AGENT' | 'AUDITOR' | 'DEVICE_MANAGER' | 'POLICY_ADMIN' | 'NATIONAL_SUPPORT_ADMIN';
    pin: string;
  }): Promise<UserCreateResult> {
    try {
      logger.info('Creating new user', {
        teamId: userData.teamId,
        code: userData.code,
        displayName: userData.displayName
      });

      // Validate required fields
      if (!userData.teamId || !userData.code || !userData.displayName || !userData.pin) {
        return {
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'teamId, code, displayName, and pin are required',
          },
        };
      }

      // Validate team exists
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, userData.teamId))
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

      // Check if user code already exists in the team
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.teamId, userData.teamId),
          eq(users.code, userData.code.trim())
        ))
        .limit(1);

      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'USER_CODE_EXISTS',
            message: 'User code already exists in this team',
          },
        };
      }

      // Validate role
      const validRoles = [
        'TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER',
        'SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR',
        'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN'
      ];
      if (userData.role && !validRoles.includes(userData.role)) {
        return {
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role. Must be one of: TEAM_MEMBER, FIELD_SUPERVISOR, REGIONAL_MANAGER, SYSTEM_ADMIN, SUPPORT_AGENT, AUDITOR, DEVICE_MANAGER, POLICY_ADMIN, NATIONAL_SUPPORT_ADMIN',
          },
        };
      }

      // Validate PIN strength
      if (userData.pin.length < 4) {
        return {
          success: false,
          error: {
            code: 'WEAK_PIN',
            message: 'PIN must be at least 4 characters long',
          },
        };
      }

      // Hash PIN
      const hashedPin = await hashPassword(userData.pin);

      // Create new user
      const newUser: NewUser = {
        id: generateId(),
        teamId: userData.teamId,
        code: userData.code.trim(),
        displayName: userData.displayName.trim(),
        email: userData.email?.trim() || null,
        role: userData.role || 'TEAM_MEMBER',
      };

      // Start transaction
      const [createdUser] = await db.insert(users).values(newUser).returning();

      // Create user PIN
      const newUserPin: NewUserPin = {
        userId: createdUser.id,
        pinHash: hashedPin.hash,
        salt: hashedPin.salt,
      };

      await db.insert(userPins).values(newUserPin);

      logger.info('User created successfully', {
        userId: createdUser.id,
        userCode: createdUser.code,
        teamId: createdUser.teamId,
        role: createdUser.role
      });

      // Return user without PIN hash
      const { ...userResponse } = createdUser;
      return {
        success: true,
        user: userResponse,
      };
    } catch (error) {
      logger.error('Error creating user', { error, userData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
        },
      };
    }
  }

  // List users with pagination and search
  static async listUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    teamId?: string;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<UserListResult> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;

      logger.info('Listing users', { page, limit, options });

      let query = db
        .select({
          id: users.id,
          code: users.code,
          teamId: users.teamId,
          displayName: users.displayName,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users);

      // Add filters
      const conditions = [];

      if (options.search) {
        conditions.push(like(users.displayName, `%${options.search}%`));
      }

      if (options.teamId) {
        conditions.push(eq(users.teamId, options.teamId));
      }

      if (options.role) {
        conditions.push(eq(users.role, options.role as any));
      }

      if (options.isActive !== undefined) {
        conditions.push(eq(users.isActive, options.isActive));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count for pagination
      const countQuery = db.select({ count: count() }).from(users);
      const searchCountQuery = conditions.length > 0
        ? countQuery.where(and(...conditions))
        : countQuery;

      const countResult = await searchCountQuery;
      const total = countResult[0]?.count || 0;

      // Get paginated results
      const usersList = await query
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      logger.info('Users listed successfully', {
        count: usersList.length,
        total,
        page
      });

      return {
        success: true,
        users: usersList,
        total,
      };
    } catch (error) {
      logger.error('Error listing users', { error, options });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list users',
        },
      };
    }
  }

  // Get user by ID
  static async getUser(userId: string): Promise<UserGetResult> {
    try {
      if (!userId) {
        return {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
        };
      }

      logger.info('Getting user', { userId });

      const [user] = await db
        .select({
          id: users.id,
          code: users.code,
          teamId: users.teamId,
          displayName: users.displayName,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      logger.info('User retrieved successfully', {
        userId,
        userCode: user.code
      });

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error('Error getting user', { error, userId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user',
        },
      };
    }
  }

  // Update user
  static async updateUser(
    userId: string,
    updateData: {
      displayName?: string;
      email?: string;
      role?: 'TEAM_MEMBER' | 'FIELD_SUPERVISOR' | 'REGIONAL_MANAGER' | 'SYSTEM_ADMIN' | 'SUPPORT_AGENT' | 'AUDITOR' | 'DEVICE_MANAGER' | 'POLICY_ADMIN' | 'NATIONAL_SUPPORT_ADMIN';
      isActive?: boolean;
      pin?: string; // For PIN updates
    }
  ): Promise<UserUpdateResult> {
    try {
      if (!userId) {
        return {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
        };
      }

      // Validate user exists
      const existingUser = await this.getUser(userId);
      if (!existingUser.success) {
        return {
          success: false,
          error: existingUser.error,
        };
      }

      logger.info('Updating user', { userId, updateData });

      // Validate role if provided
      if (updateData.role) {
        const validRoles = [
        'TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER',
        'SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR',
        'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN'
      ];
        if (!validRoles.includes(updateData.role)) {
          return {
            success: false,
            error: {
              code: 'INVALID_ROLE',
              message: 'Invalid role. Must be one of: TEAM_MEMBER, FIELD_SUPERVISOR, REGIONAL_MANAGER, SYSTEM_ADMIN, SUPPORT_AGENT, AUDITOR, DEVICE_MANAGER, POLICY_ADMIN, NATIONAL_SUPPORT_ADMIN',
            },
          };
        }
      }

      // Prepare update object
      const updateFields: Partial<NewUser> = {
        updatedAt: new Date(),
      };

      if (updateData.displayName !== undefined) {
        const displayNameTrimmed = updateData.displayName.trim();
        if (displayNameTrimmed.length === 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_DISPLAY_NAME',
              message: 'Display name cannot be empty',
            },
          };
        }
        updateFields.displayName = displayNameTrimmed;
      }

      if (updateData.email !== undefined) {
        updateFields.email = updateData.email?.trim() || null;
      }

      if (updateData.role !== undefined) {
        updateFields.role = updateData.role;
      }

      if (updateData.isActive !== undefined) {
        updateFields.isActive = updateData.isActive;
      }

      // Update user in database
      const [updatedUser] = await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, userId))
        .returning();

      // Update PIN if provided
      if (updateData.pin) {
        if (updateData.pin.length < 4) {
          return {
            success: false,
            error: {
              code: 'WEAK_PIN',
              message: 'PIN must be at least 4 characters long',
            },
          };
        }

        const hashedPin = await hashPassword(updateData.pin);

        await db
          .update(userPins)
          .set({
            pinHash: hashedPin.hash,
            salt: hashedPin.salt,
            updatedAt: new Date(),
          })
          .where(eq(userPins.userId, userId));
      }

      logger.info('User updated successfully', {
        userId,
        displayName: updatedUser.displayName
      });

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      logger.error('Error updating user', { error, userId, updateData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user',
        },
      };
    }
  }

  // Delete user (soft delete by deactivating)
  static async deleteUser(userId: string): Promise<UserDeleteResult> {
    try {
      if (!userId) {
        return {
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
        };
      }

      logger.info('Deleting user', { userId });

      // Check if user exists
      const existingUser = await this.getUser(userId);
      if (!existingUser.success) {
        return {
          success: false,
          error: existingUser.error,
        };
      }

      // Soft delete by deactivating
      await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      logger.info('User deleted successfully', { userId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting user', { error, userId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user',
        },
      };
    }
  }

  // Verify user PIN
  static async verifyUserPin(userId: string, pin: string): Promise<{
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const [userPin] = await db
        .select()
        .from(userPins)
        .where(eq(userPins.userId, userId))
        .limit(1);

      if (!userPin) {
        return {
          success: false,
          error: {
            code: 'PIN_NOT_FOUND',
            message: 'User PIN not found',
          },
        };
      }

      const isValid = await verifyPassword(pin, userPin.pinHash, userPin.salt);

      if (!isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_PIN',
            message: 'Invalid PIN',
          },
        };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error verifying user PIN', { error, userId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify PIN',
        },
      };
    }
  }

  // Get user statistics
  static async getUserStats(teamId?: string): Promise<{
    success: boolean;
    stats?: {
      totalUsers: number;
      activeUsers: number;
      teamMembers: number;
      supervisors: number;
      admins: number;
    };
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const baseQuery = db.select().from(users);

      const conditions = [];
      if (teamId) {
        conditions.push(eq(users.teamId, teamId));
      }

      const filteredQuery = conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;

      const userQuery = db
        .select({
          total: count(),
          active: sql<number>`SUM(CASE WHEN ${users.isActive} THEN 1 ELSE 0 END)`,
          teamMembers: sql<number>`SUM(CASE WHEN ${users.role} = 'TEAM_MEMBER' THEN 1 ELSE 0 END)`,
          supervisors: sql<number>`SUM(CASE WHEN ${users.role} = 'FIELD_SUPERVISOR' THEN 1 ELSE 0 END)`,
          admins: sql<number>`SUM(CASE WHEN ${users.role} IN ('SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR', 'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN') THEN 1 ELSE 0 END)`,
        })
        .from(filteredQuery.as('filtered_users'));

      const [stats] = await userQuery;

      return {
        success: true,
        stats: {
          totalUsers: stats.total || 0,
          activeUsers: stats.active || 0,
          teamMembers: stats.teamMembers || 0,
          supervisors: stats.supervisors || 0,
          admins: stats.admins || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting user stats', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user statistics',
        },
      };
    }
  }
}
