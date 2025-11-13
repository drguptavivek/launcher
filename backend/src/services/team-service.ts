import { eq, and, like, desc, count } from 'drizzle-orm';
import { db, teams, users, devices } from '../lib/db';
import { NewTeam, Team } from '../lib/db/schema';
import { logger } from '../lib/logger';
import { randomUUID } from 'crypto';

// Generate UUID for team IDs
function generateId(): string {
  return randomUUID();
}

// Response types
interface TeamCreateResult {
  success: boolean;
  team?: Team;
  error?: {
    code: string;
    message: string;
  };
}

interface TeamListResult {
  success: boolean;
  teams?: Team[];
  total?: number;
  error?: {
    code: string;
    message: string;
  };
}

interface TeamUpdateResult {
  success: boolean;
  team?: Team;
  error?: {
    code: string;
    message: string;
  };
}

interface TeamGetResult {
  success: boolean;
  team?: Team;
  error?: {
    code: string;
    message: string;
  };
}

interface TeamDeleteResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export class TeamService {
  // Create a new team
  static async createTeam(teamData: {
    name: string;
    timezone?: string;
  }): Promise<TeamCreateResult> {
    try {
      logger.info('Creating new team', { teamName: teamData.name });

      // Validate required fields
      if (!teamData.name || teamData.name.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_NAME',
            message: 'Team name is required and cannot be empty',
          },
        };
      }

      // Check if team name already exists (case insensitive for SQLite)
      const existingTeam = await db
        .select()
        .from(teams)
        .where(like(teams.name, teamData.name.trim()))
        .limit(1);

      if (existingTeam.length > 0) {
        return {
          success: false,
          error: {
            code: 'TEAM_NAME_EXISTS',
            message: 'Team with this name already exists',
          },
        };
      }

      // Create new team
      const newTeam: NewTeam = {
        id: generateId(),
        name: teamData.name.trim(),
        timezone: teamData.timezone || 'UTC',
      };

      const [createdTeam] = await db.insert(teams).values(newTeam).returning();

      logger.info('Team created successfully', {
        teamId: createdTeam.id,
        teamName: createdTeam.name
      });

      return {
        success: true,
        team: createdTeam,
      };
    } catch (error) {
      logger.error('Error creating team', { error, teamData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create team',
        },
      };
    }
  }

  // List all teams with pagination and search
  static async listTeams(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<TeamListResult> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100); // Max 100 per page
      const offset = (page - 1) * limit;
      const search = options.search?.trim();

      logger.info('Listing teams', { page, limit, search });

      let query = db.select().from(teams);

      // Add search filter if provided
      if (search) {
        query = query.where(like(teams.name, `%${search}%`));
      }

      // Get total count for pagination
      const countQuery = db.select({ count: count() }).from(teams);
      const searchCountQuery = search
        ? countQuery.where(like(teams.name, `%${search}%`))
        : countQuery;

      const [{ total }] = await searchCountQuery;

      // Get paginated results
      const teamsList = await query
        .orderBy(desc(teams.createdAt))
        .limit(limit)
        .offset(offset);

      logger.info('Teams listed successfully', {
        count: teamsList.length,
        total,
        page
      });

      return {
        success: true,
        teams: teamsList,
        total,
      };
    } catch (error) {
      logger.error('Error listing teams', { error, options });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list teams',
        },
      };
    }
  }

  // Get team by ID
  static async getTeam(teamId: string): Promise<TeamGetResult> {
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

      logger.info('Getting team', { teamId });

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
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

      logger.info('Team retrieved successfully', { teamId, teamName: team.name });

      return {
        success: true,
        team,
      };
    } catch (error) {
      logger.error('Error getting team', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get team',
        },
      };
    }
  }

  // Update team
  static async updateTeam(
    teamId: string,
    updateData: {
      name?: string;
      timezone?: string;
    }
  ): Promise<TeamUpdateResult> {
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

      // Validate that team exists
      const existingTeam = await this.getTeam(teamId);
      if (!existingTeam.success) {
        return {
          success: false,
          error: existingTeam.error,
        };
      }

      logger.info('Updating team', { teamId, updateData });

      // Check if new name conflicts with existing team (if name is being updated)
      if (updateData.name) {
        const nameTrimmed = updateData.name.trim();
        if (nameTrimmed.length === 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_NAME',
              message: 'Team name cannot be empty',
            },
          };
        }

        // Check for name conflict (excluding current team)
        const conflictingTeam = await db
          .select()
          .from(teams)
          .where(and(
            like(teams.name, nameTrimmed)
          ))
          .limit(1);

        if (conflictingTeam.length > 0 && conflictingTeam[0].id !== teamId) {
          return {
            success: false,
            error: {
              code: 'TEAM_NAME_EXISTS',
              message: 'Team with this name already exists',
            },
          };
        }

        updateData.name = nameTrimmed;
      }

      // Prepare update object
      const updateFields: Partial<NewTeam> = {
        updatedAt: new Date(),
      };

      if (updateData.name !== undefined) {
        updateFields.name = updateData.name;
      }
      if (updateData.timezone !== undefined) {
        updateFields.timezone = updateData.timezone;
      }

      // Update team
      const [updatedTeam] = await db
        .update(teams)
        .set(updateFields)
        .where(eq(teams.id, teamId))
        .returning();

      logger.info('Team updated successfully', {
        teamId,
        teamName: updatedTeam.name
      });

      return {
        success: true,
        team: updatedTeam,
      };
    } catch (error) {
      logger.error('Error updating team', { error, teamId, updateData });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update team',
        },
      };
    }
  }

  // Delete team (soft delete by deactivating, or hard delete if no dependencies)
  static async deleteTeam(teamId: string): Promise<TeamDeleteResult> {
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

      logger.info('Deleting team', { teamId });

      // Check if team exists
      const existingTeam = await this.getTeam(teamId);
      if (!existingTeam.success) {
        return {
          success: false,
          error: existingTeam.error,
        };
      }

      // Check for dependencies
      const [userCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.teamId, teamId));

      const [deviceCount] = await db
        .select({ count: count() })
        .from(devices)
        .where(eq(devices.teamId, teamId));

      if (userCount.count > 0 || deviceCount.count > 0) {
        return {
          success: false,
          error: {
            code: 'TEAM_HAS_DEPENDENCIES',
            message: 'Cannot delete team with existing users or devices',
          },
        };
      }

      // Delete the team
      await db.delete(teams).where(eq(teams.id, teamId));

      logger.info('Team deleted successfully', { teamId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting team', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete team',
        },
      };
    }
  }

  // Get team statistics
  static async getTeamStats(teamId: string): Promise<{
    success: boolean;
    stats?: {
      userCount: number;
      deviceCount: number;
      activeUserCount: number;
      activeDeviceCount: number;
    };
    error?: {
      code: string;
      message: string;
    };
  }> {
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

      // Get user counts
      const userStats = await db
        .select({
          total: count(),
          active: count()
        })
        .from(users)
        .where(eq(users.teamId, teamId));

      // Get device counts
      const deviceStats = await db
        .select({
          total: count(),
          active: count()
        })
        .from(devices)
        .where(eq(devices.teamId, teamId));

      const stats = {
        userCount: userStats[0]?.total || 0,
        deviceCount: deviceStats[0]?.total || 0,
        activeUserCount: userStats[0]?.active || 0,
        activeDeviceCount: deviceStats[0]?.active || 0,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      logger.error('Error getting team stats', { error, teamId });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get team statistics',
        },
      };
    }
  }
}