import { db, users, teams, userRoleAssignments, roles } from '../lib/db';
import { logger } from '../lib/logger';
import {
  eq,
  and,
  or,
  inArray,
  isNull,
  not,
  lt,
  gt,
  sql
} from 'drizzle-orm';
import { MobileUserAuthService, PermissionContext } from './mobile-user-auth-service';

// ===== INTERFACES & TYPES =====

/**
 * Access scope enumeration for boundary enforcement
 */
export enum AccessScope {
  ORGANIZATION = 'ORGANIZATION',
  REGION = 'REGION',
  TEAM = 'TEAM',
  USER = 'USER'
}

/**
 * Boundary enforcement result
 */
export interface BoundaryResult {
  allowed: boolean;
  reason?: string;
  scope?: AccessScope;
  accessedThrough?: string;
  requiresAudit?: boolean;
}

/**
 * Team boundary validation context
 */
export interface TeamBoundaryContext {
  userId: string;
  targetTeamId?: string;
  targetRegionId?: string;
  targetResourceId?: string;
  action: string;
  resourceType: string;
  organizationId?: string;
  requestId?: string;
  ipAddress?: string;
}

/**
 * User team access information
 */
export interface UserTeamAccess {
  userId: string;
  primaryTeamId: string;
  accessibleTeamIds: string[];
  accessibleRegionIds: string[];
  crossTeamRoles: string[];
  isSystemAdmin: boolean;
  isNationalSupport: boolean;
  isRegionalManager: boolean;
  accessScope: AccessScope;
}

/**
 * Boundary violation details
 */
export interface BoundaryViolation {
  userId: string;
  violationType: 'TEAM_BOUNDARY' | 'REGION_BOUNDARY' | 'ORGANIZATION_BOUNDARY' | 'RESOURCE_ACCESS';
  attemptedAccess: string;
  requiredScope: AccessScope;
  userScope: AccessScope;
  resourceId?: string;
  action: string;
  timestamp: Date;
  context: TeamBoundaryContext;
}

// ===== TEAM BOUNDARY SERVICE =====

/**
 * Team Boundary Service for Cross-Team Role Support
 *
 * This service enforces team, region, and organizational access boundaries
 * while providing special handling for cross-team roles like NATIONAL_SUPPORT_ADMIN
 * and SYSTEM_ADMIN. It integrates with the existing RBAC system to provide
 * comprehensive access control with audit trails.
 *
 * Key Features:
 * - Cross-team access validation with proper scope enforcement
 * - Special handling for SYSTEM_ADMIN, NATIONAL_SUPPORT_ADMIN, and REGIONAL_MANAGER roles
 * - Team context validation and region-based access control
 * - Comprehensive audit logging for security monitoring
 * - Integration with AuthorizationService for permission checking
 */
export class TeamBoundaryService {
  // Cross-team access roles that can bypass team boundaries
  private static readonly CROSS_TEAM_ACCESS_ROLES = [
    'SYSTEM_ADMIN',
    'NATIONAL_SUPPORT_ADMIN',
    'AUDITOR',
    'REGIONAL_MANAGER'
  ];

  // System settings protection - only SYSTEM_ADMIN can access
  private static readonly SYSTEM_RESOURCES = [
    'SYSTEM_SETTINGS',
    'ROLE_MANAGEMENT',
    'PERMISSION_MANAGEMENT',
    'ORGANIZATION_CONFIG'
  ];

  // National support admin restricted resources
  private static readonly NATIONAL_SUPPORT_RESTRICTED_RESOURCES = [
    'SYSTEM_SETTINGS',
    'ROLE_MANAGEMENT',
    'PERMISSION_MANAGEMENT',
    'ORGANIZATION_CONFIG'
  ];

  /**
   * Main method to enforce team boundaries for access requests
   */
  static async enforceTeamBoundary(
    context: TeamBoundaryContext
  ): Promise<BoundaryResult> {
    const startTime = Date.now();
    const requestId = context.requestId || crypto.randomUUID();

    try {
      logger.info('Team boundary enforcement initiated', {
        userId: context.userId,
        targetTeamId: context.targetTeamId,
        action: context.action,
        resourceType: context.resourceType,
        requestId,
        context
      });

      // Get user's team access information
      const userAccess = await this.getUserTeamAccess(context.userId);

      // System admins have full organizational access
      if (userAccess.isSystemAdmin) {
        logger.info('System admin access granted', {
          userId: context.userId,
          action: context.action,
          resourceType: context.resourceType,
          requestId,
          evaluationTime: Date.now() - startTime
        });

        return {
          allowed: true,
          scope: AccessScope.ORGANIZATION,
          accessedThrough: 'SYSTEM_ADMIN',
          requiresAudit: TeamBoundaryService.requiresAuditLogging(context.resourceType, context.action)
        };
      }

      // National support admins have cross-team operational access
      if (userAccess.isNationalSupport) {
        const nationalSupportResult = await this.handleNationalSupportAccess(
          context,
          userAccess,
          requestId
        );

        // Always return national support result (allowed or denied)
        return nationalSupportResult;
      }

      // Regional managers can access teams in their region
      if (userAccess.isRegionalManager) {
        const regionalResult = await this.handleRegionalManagerAccess(
          context,
          userAccess,
          requestId
        );

        // Always return regional manager result (allowed or denied)
        return regionalResult;
      }

      // For users with cross-team roles
      if (userAccess.crossTeamRoles.length > 0) {
        const crossTeamResult = await this.handleCrossTeamAccess(
          context,
          userAccess,
          requestId
        );

        if (crossTeamResult.allowed) {
          return crossTeamResult;
        }
      }

      // Standard team-based access control
      const standardResult = await this.handleStandardTeamAccess(
        context,
        userAccess,
        requestId
      );

      const evaluationTime = Date.now() - startTime;

      // Log access decision for audit
      logger.info('Team boundary enforcement completed', {
        userId: context.userId,
        allowed: standardResult.allowed,
        reason: standardResult.reason,
        resourceType: context.resourceType,
        action: context.action,
        targetTeamId: context.targetTeamId,
        evaluationTime,
        requestId
      });

      return standardResult;

    } catch (error) {
      logger.error('Team boundary enforcement failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId,
        context,
        evaluationTime: Date.now() - startTime,
        requestId
      });

      // Fail secure: deny access on errors
      return {
        allowed: false,
        reason: 'BOUNDARY_ENFORCEMENT_ERROR'
      };
    }
  }

  /**
   * Get comprehensive user team access information
   */
  static async getUserTeamAccess(userId: string): Promise<UserTeamAccess> {
    try {
      // Get user with their primary team
      const userResult = await db
        .select({
          user: users,
          team: teams,
          assignments: {
            assignment: userRoleAssignments,
            role: roles
          }
        })
        .from(users)
        .leftJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(userRoleAssignments, eq(users.id, userRoleAssignments.userId))
        .leftJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(and(
          eq(users.id, userId),
          eq(users.isActive, true)
        ));

      if (userResult.length === 0) {
        logger.warn('User not found for team access evaluation', { userId });
        return this.createDefaultUserAccess(userId);
      }

      const user = userResult[0].user;
      const primaryTeam = userResult[0].team;
      const assignments = userResult
        .filter(row => row.assignments.assignment && row.assignments.role)
        .map(row => ({
          assignment: row.assignments.assignment!,
          role: row.assignments.role!
        }));

      // Extract team and region access from assignments
      const accessibleTeamIds = new Set<string>();
      const accessibleRegionIds = new Set<string>();
      const crossTeamRoles: string[] = [];

      if (primaryTeam) {
        accessibleTeamIds.add(primaryTeam.id);
      }

      for (const assignment of assignments) {
        if (assignment.assignment.teamId) {
          accessibleTeamIds.add(assignment.assignment.teamId);
        }
        if (assignment.assignment.regionId) {
          accessibleRegionIds.add(assignment.assignment.regionId);
        }
        if (this.CROSS_TEAM_ACCESS_ROLES.includes(assignment.role.name)) {
          crossTeamRoles.push(assignment.role.name);
        }
      }

      // Determine access scope based on roles
      const accessScope = this.determineAccessScope(crossTeamRoles);

      return {
        userId,
        primaryTeamId: primaryTeam?.id || '',
        accessibleTeamIds: Array.from(accessibleTeamIds),
        accessibleRegionIds: Array.from(accessibleRegionIds),
        crossTeamRoles,
        isSystemAdmin: crossTeamRoles.includes('SYSTEM_ADMIN'),
        isNationalSupport: crossTeamRoles.includes('NATIONAL_SUPPORT_ADMIN'),
        isRegionalManager: crossTeamRoles.includes('REGIONAL_MANAGER'),
        accessScope
      };

    } catch (error) {
      logger.error('Failed to get user team access', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });

      return this.createDefaultUserAccess(userId);
    }
  }

  /**
   * Handle NATIONAL_SUPPORT_ADMIN access with appropriate restrictions
   */
  private static async handleNationalSupportAccess(
    context: TeamBoundaryContext,
    userAccess: UserTeamAccess,
    requestId: string
  ): Promise<BoundaryResult> {
    // National support admins cannot access system settings
    if (this.NATIONAL_SUPPORT_RESTRICTED_RESOURCES.includes(context.resourceType)) {
      logger.warn('National support admin denied access to restricted resource', {
        userId: context.userId,
        resourceType: context.resourceType,
        action: context.action,
        requestId
      });

      return {
        allowed: false,
        reason: 'NATIONAL_SUPPORT_SYSTEM_ACCESS_DENIED',
        scope: AccessScope.ORGANIZATION
      };
    }

    // National support admins have cross-team operational access
    logger.info('National support admin cross-team access granted', {
      userId: context.userId,
      resourceType: context.resourceType,
      action: context.action,
      targetTeamId: context.targetTeamId,
      requestId
    });

    return {
      allowed: true,
      reason: 'NATIONAL_SUPPORT_CROSS_TEAM_ACCESS',
      scope: AccessScope.ORGANIZATION,
      accessedThrough: 'NATIONAL_SUPPORT_ADMIN',
      requiresAudit: true
    };
  }

  /**
   * Handle REGIONAL_MANAGER access within their region
   */
  private static async handleRegionalManagerAccess(
    context: TeamBoundaryContext,
    userAccess: UserTeamAccess,
    requestId: string
  ): Promise<BoundaryResult> {
    // Check if target team is in the manager's region
    if (context.targetTeamId && context.targetRegionId) {
      if (!userAccess.accessibleRegionIds.includes(context.targetRegionId)) {
        logger.warn('Regional manager access denied - region boundary violation', {
          userId: context.userId,
          targetTeamId: context.targetTeamId,
          targetRegionId: context.targetRegionId,
          accessibleRegions: userAccess.accessibleRegionIds,
          requestId
        });

        return {
          allowed: false,
          reason: 'REGIONAL_MANAGER_REGION_BOUNDARY_VIOLATION',
          scope: AccessScope.REGION
        };
      }

      // Verify the target team is actually in the claimed region
      const teamInRegion = await this.verifyTeamInRegion(
        context.targetTeamId,
        context.targetRegionId
      );

      if (!teamInRegion) {
        logger.warn('Regional manager access denied - team not in region', {
          userId: context.userId,
          targetTeamId: context.targetTeamId,
          targetRegionId: context.targetRegionId,
          requestId
        });

        return {
          allowed: false,
          reason: 'REGIONAL_MANAGER_TEAM_NOT_IN_REGION',
          scope: AccessScope.REGION
        };
      }
    }

    logger.info('Regional manager access granted', {
      userId: context.userId,
      resourceType: context.resourceType,
      action: context.action,
      targetTeamId: context.targetTeamId,
      targetRegionId: context.targetRegionId,
      requestId
    });

    return {
      allowed: true,
      reason: 'REGIONAL_MANAGER_ACCESS',
      scope: AccessScope.REGION,
      accessedThrough: 'REGIONAL_MANAGER',
      requiresAudit: true
    };
  }

  /**
   * Handle cross-team access for other cross-team roles
   */
  private static async handleCrossTeamAccess(
    context: TeamBoundaryContext,
    userAccess: UserTeamAccess,
    requestId: string
  ): Promise<BoundaryResult> {
    // Check if user has appropriate cross-team role for the resource
    const hasPermission = await this.verifyCrossTeamPermissions(
      context.userId,
      context.resourceType,
      context.action,
      userAccess.crossTeamRoles
    );

    if (!hasPermission) {
      logger.warn('Cross-team access denied - insufficient permissions', {
        userId: context.userId,
        resourceType: context.resourceType,
        action: context.action,
        crossTeamRoles: userAccess.crossTeamRoles,
        requestId
      });

      return {
        allowed: false,
        reason: 'CROSS_TEAM_PERMISSION_DENIED',
        scope: userAccess.accessScope
      };
    }

    logger.info('Cross-team access granted', {
      userId: context.userId,
      resourceType: context.resourceType,
      action: context.action,
      crossTeamRoles: userAccess.crossTeamRoles,
      requestId
    });

    return {
      allowed: true,
      reason: 'CROSS_TEAM_ACCESS_GRANTED',
      scope: userAccess.accessScope,
      accessedThrough: userAccess.crossTeamRoles.join(', '),
      requiresAudit: true
    };
  }

  /**
   * Handle standard team-based access control
   */
  private static async handleStandardTeamAccess(
    context: TeamBoundaryContext,
    userAccess: UserTeamAccess,
    requestId: string
  ): Promise<BoundaryResult> {
    // User must have an accessible team
    if (userAccess.accessibleTeamIds.length === 0) {
      logger.warn('Standard access denied - no team assignment', {
        userId: context.userId,
        requestId
      });

      return {
        allowed: false,
        reason: 'NO_TEAM_ASSIGNMENT',
        scope: AccessScope.USER
      };
    }

    // Check team boundary
    if (context.targetTeamId) {
      if (!userAccess.accessibleTeamIds.includes(context.targetTeamId)) {
        logger.warn('Standard access denied - team boundary violation', {
          userId: context.userId,
          targetTeamId: context.targetTeamId,
          accessibleTeams: userAccess.accessibleTeamIds,
          requestId
        });

        await this.logBoundaryViolation({
          userId: context.userId,
          violationType: 'TEAM_BOUNDARY',
          attemptedAccess: context.targetTeamId,
          requiredScope: AccessScope.TEAM,
          userScope: userAccess.accessScope,
          resourceId: context.targetResourceId,
          action: context.action,
          timestamp: new Date(),
          context
        });

        return {
          allowed: false,
          reason: 'TEAM_BOUNDARY_VIOLATION',
          scope: AccessScope.TEAM
        };
      }
    }

    logger.info('Standard team access granted', {
      userId: context.userId,
      resourceType: context.resourceType,
      action: context.action,
      targetTeamId: context.targetTeamId,
      requestId
    });

    return {
      allowed: true,
      reason: 'STANDARD_TEAM_ACCESS_GRANTED',
      scope: AccessScope.TEAM
    };
  }

  /**
   * Verify if a team is actually in the specified region
   */
  private static async verifyTeamInRegion(
    teamId: string,
    regionId: string
  ): Promise<boolean> {
    try {
      // For this implementation, we'll use the stateId as region identifier
      // In a real-world scenario, you might have a separate regions table
      const teamResult = await db
        .select({ stateId: teams.stateId })
        .from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.isActive, true)
        ))
        .limit(1);

      return teamResult.length > 0 && teamResult[0].stateId === regionId;

    } catch (error) {
      logger.error('Failed to verify team in region', {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        regionId
      });
      return false;
    }
  }

  /**
   * Verify cross-team permissions for specific roles
   */
  private static async verifyCrossTeamPermissions(
    userId: string,
    resourceType: string,
    action: string,
    crossTeamRoles: string[]
  ): Promise<boolean> {
    try {
      // Use MobileUserAuthService to check permissions
      for (const roleName of crossTeamRoles) {
        const hasPermission = await MobileUserAuthService.checkPermission(
          userId,
          resourceType,
          action,
          { teamId: undefined } // Context-less check for cross-team access
        );

        if (hasPermission.allowed) {
          return true;
        }
      }

      return false;

    } catch (error) {
      logger.error('Failed to verify cross-team permissions', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        resourceType,
        action,
        crossTeamRoles
      });
      return false;
    }
  }

  /**
   * Determine access scope based on user's roles
   */
  private static determineAccessScope(crossTeamRoles: string[]): AccessScope {
    if (crossTeamRoles.includes('SYSTEM_ADMIN')) {
      return AccessScope.ORGANIZATION;
    }
    if (crossTeamRoles.includes('NATIONAL_SUPPORT_ADMIN')) {
      return AccessScope.ORGANIZATION;
    }
    if (crossTeamRoles.includes('REGIONAL_MANAGER')) {
      return AccessScope.REGION;
    }
    if (crossTeamRoles.includes('AUDITOR')) {
      return AccessScope.ORGANIZATION;
    }
    return AccessScope.TEAM;
  }

  /**
   * Create default user access object for users without proper assignments
   */
  private static createDefaultUserAccess(userId: string): UserTeamAccess {
    return {
      userId,
      primaryTeamId: '',
      accessibleTeamIds: [],
      accessibleRegionIds: [],
      crossTeamRoles: [],
      isSystemAdmin: false,
      isNationalSupport: false,
      isRegionalManager: false,
      accessScope: AccessScope.USER
    };
  }

  /**
   * Check if access requires audit logging
   */
  private static requiresAuditLogging(resourceType: string, action: string): boolean {
    const sensitiveActions = ['DELETE', 'MANAGE', 'CREATE'];
    const sensitiveResources = [
      'SYSTEM_SETTINGS',
      'ROLE_MANAGEMENT',
      'PERMISSION_MANAGEMENT',
      'USER_MANAGEMENT'
    ];

    return sensitiveActions.includes(action) ||
           sensitiveResources.includes(resourceType);
  }

  /**
   * Log boundary violations for security monitoring
   */
  private static async logBoundaryViolation(violation: BoundaryViolation): Promise<void> {
    try {
      logger.warn('Team boundary violation detected', {
        auditAction: 'boundary.violation',
        userId: violation.userId,
        violationType: violation.violationType,
        attemptedAccess: violation.attemptedAccess,
        requiredScope: violation.requiredScope,
        userScope: violation.userScope,
        resourceId: violation.resourceId,
        action: violation.action,
        timestamp: violation.timestamp,
        context: violation.context,
        severity: 'HIGH'
      });

      // In a real implementation, you might want to:
      // 1. Store this in a dedicated security events table
      // 2. Send alerts to security team
      // 3. Implement rate limiting for repeated violations
      // 4. Consider temporary account suspension for repeated violations

    } catch (error) {
      logger.error('Failed to log boundary violation', {
        error: error instanceof Error ? error.message : String(error),
        violation
      });
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if user can access a specific team
   */
  static async canUserAccessTeam(
    userId: string,
    teamId: string,
    action: string = 'READ'
  ): Promise<boolean> {
    const result = await this.enforceTeamBoundary({
      userId,
      targetTeamId: teamId,
      action,
      resourceType: 'TEAMS'
    });

    return result.allowed;
  }

  /**
   * Get all teams a user can access
   */
  static async getUserAccessibleTeams(userId: string): Promise<string[]> {
    const userAccess = await this.getUserTeamAccess(userId);
    return userAccess.accessibleTeamIds;
  }

  /**
   * Check if user has cross-team access capabilities
   */
  static async hasCrossTeamAccess(userId: string): Promise<boolean> {
    const userAccess = await this.getUserTeamAccess(userId);
    return userAccess.crossTeamRoles.length > 0 ||
           userAccess.isSystemAdmin ||
           userAccess.isNationalSupport;
  }

  /**
   * Validate team context for operations
   */
  static async validateTeamContext(
    userId: string,
    teamId: string,
    operation: string
  ): Promise<BoundaryResult> {
    return this.enforceTeamBoundary({
      userId,
      targetTeamId: teamId,
      action: operation,
      resourceType: 'TEAMS'
    });
  }

  /**
   * Get user's access scope level
   */
  static async getUserAccessScope(userId: string): Promise<AccessScope> {
    const userAccess = await this.getUserTeamAccess(userId);
    return userAccess.accessScope;
  }

  /**
   * Check for potential privilege escalation attempts
   */
  static async detectPrivilegeEscalation(
    userId: string,
    requestedScope: AccessScope,
    currentContext: TeamBoundaryContext
  ): Promise<boolean> {
    const userAccess = await this.getUserTeamAccess(userId);

    // Define scope hierarchy
    const scopeHierarchy = {
      [AccessScope.USER]: 1,
      [AccessScope.TEAM]: 2,
      [AccessScope.REGION]: 3,
      [AccessScope.ORGANIZATION]: 4
    };

    const currentLevel = scopeHierarchy[userAccess.accessScope];
    const requestedLevel = scopeHierarchy[requestedScope];

    // Check if user is requesting higher scope than they have
    if (requestedLevel > currentLevel) {
      // Log potential privilege escalation attempt
      logger.warn('Potential privilege escalation detected', {
        auditAction: 'privilege.escalation.attempt',
        userId,
        currentScope: userAccess.accessScope,
        requestedScope,
        currentLevel,
        requestedLevel,
        context: currentContext
      });

      return true;
    }

    return false;
  }
}