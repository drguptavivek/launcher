import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user-service';
import { JWTService } from '../services/jwt-service';
import { AuthorizationService } from '../services/authorization-service';
import { db, sessions } from '../lib/db';
import { logger } from '../lib/logger';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    code: string;
    teamId: string;
    displayName: string;
    email: string | null;
    isActive: boolean;
    // Enhanced with multi-role support
    roles: Array<{
      id: string;
      name: string;
      displayName: string;
      hierarchyLevel: number;
      teamId?: string;
      regionId?: string;
    }>;
    // Computed effective permissions for caching
    effectivePermissions?: Array<{
      resource: string;
      action: string;
      scope: string;
      inheritedFrom: string;
    }>;
    // Legacy role field for backward compatibility
    role: string;
  };
  session?: {
    id: string;
    sessionId: string;
    userId: string;
    teamId: string;
    deviceId: string;
    startedAt: Date;
    expiresAt: Date;
    overrideUntil: Date | null;
    status: string;
  };
}

export enum UserRole {
  // Field Operations Roles
  TEAM_MEMBER = 'TEAM_MEMBER',
  FIELD_SUPERVISOR = 'FIELD_SUPERVISOR',
  REGIONAL_MANAGER = 'REGIONAL_MANAGER',

  // Technical Operations Roles
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  AUDITOR = 'AUDITOR',

  // Specialized Roles
  DEVICE_MANAGER = 'DEVICE_MANAGER',
  POLICY_ADMIN = 'POLICY_ADMIN',
  NATIONAL_SUPPORT_ADMIN = 'NATIONAL_SUPPORT_ADMIN'
}

// Legacy compatibility mappings - using constants instead of enum duplicates
export const LEGACY_ROLE_MAPPING = {
  SUPERVISOR: UserRole.FIELD_SUPERVISOR,
  ADMIN: UserRole.SYSTEM_ADMIN
} as const;

// Helper functions for backward compatibility
export function getRoleFromLegacyRole(legacyRole: string): UserRole | null {
  switch (legacyRole) {
    case 'SUPERVISOR':
      return UserRole.FIELD_SUPERVISOR;
    case 'ADMIN':
      return UserRole.SYSTEM_ADMIN;
    default:
      return Object.values(UserRole).includes(legacyRole as UserRole)
        ? legacyRole as UserRole
        : null;
  }
}

export enum Resource {
  TEAMS = 'TEAMS',
  USERS = 'USERS',
  DEVICES = 'DEVICES',
  SUPERVISOR_PINS = 'SUPERVISOR_PINS',
  TELEMETRY = 'TELEMETRY',
  POLICY = 'POLICY',
  AUTH = 'AUTH',
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
  AUDIT_LOGS = 'AUDIT_LOGS',
  SUPPORT_TICKETS = 'SUPPORT_TICKETS',
  ORGANIZATION = 'ORGANIZATION',
  PROJECTS = 'PROJECTS'
}

export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  MANAGE = 'MANAGE',     // Full control including permissions
  EXECUTE = 'EXECUTE',    // Execute operations (e.g., overrides)
  AUDIT = 'AUDIT',        // Read-only audit access
  ASSIGN = 'ASSIGN'      // Assign users/teams to projects
}

// Role-based access control matrix - Updated for 9-role system with complete resource coverage
export const RBAC_MATRIX: Record<UserRole, Record<Resource, Action[]>> = {
  // Field Operations Roles
  [UserRole.TEAM_MEMBER]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST],
    [Resource.USERS]: [Action.READ, Action.LIST],
    [Resource.DEVICES]: [Action.READ, Action.LIST],
    [Resource.SUPERVISOR_PINS]: [], // No access to supervisor PINs
    [Resource.TELEMETRY]: [Action.READ, Action.LIST],
    [Resource.POLICY]: [Action.READ],
    [Resource.AUTH]: [Action.READ],
    [Resource.SYSTEM_SETTINGS]: [], // No system settings access
    [Resource.AUDIT_LOGS]: [], // No audit access
    [Resource.SUPPORT_TICKETS]: [Action.READ, Action.LIST], // Can view own tickets
    [Resource.ORGANIZATION]: [Action.READ], // Limited organization view
    [Resource.PROJECTS]: [Action.READ, Action.LIST, Action.EXECUTE] // Can view and execute own assigned projects
  },

  [UserRole.FIELD_SUPERVISOR]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST],
    [Resource.USERS]: [Action.READ, Action.LIST, Action.UPDATE], // Can manage team users
    [Resource.DEVICES]: [Action.CREATE, Action.READ, Action.UPDATE, Action.LIST], // Can manage devices
    [Resource.SUPERVISOR_PINS]: [Action.READ, Action.LIST], // Can view supervisor PINs
    [Resource.TELEMETRY]: [Action.READ, Action.LIST],
    [Resource.POLICY]: [Action.READ],
    [Resource.AUTH]: [Action.READ, Action.EXECUTE], // Can perform supervisor overrides
    [Resource.SYSTEM_SETTINGS]: [], // No system settings access
    [Resource.AUDIT_LOGS]: [Action.READ], // Can view team audit logs
    [Resource.SUPPORT_TICKETS]: [Action.CREATE, Action.READ, Action.LIST, Action.UPDATE],
    [Resource.ORGANIZATION]: [Action.READ],
    [Resource.PROJECTS]: [Action.READ, Action.LIST, Action.UPDATE, Action.ASSIGN] // Can manage team projects
  },

  [UserRole.REGIONAL_MANAGER]: {
    [Resource.TEAMS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.LIST], // Can manage teams in region
    [Resource.USERS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.LIST], // Full user management in region
    [Resource.DEVICES]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.SUPERVISOR_PINS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.LIST], // Can manage PINs in region
    [Resource.TELEMETRY]: [Action.READ, Action.LIST],
    [Resource.POLICY]: [Action.READ, Action.UPDATE], // Can update regional policies
    [Resource.AUTH]: [Action.READ, Action.LIST, Action.EXECUTE],
    [Resource.SYSTEM_SETTINGS]: [], // No system settings access
    [Resource.AUDIT_LOGS]: [Action.READ, Action.LIST], // Regional audit access
    [Resource.SUPPORT_TICKETS]: [Action.CREATE, Action.READ, Action.LIST, Action.UPDATE, Action.DELETE],
    [Resource.ORGANIZATION]: [Action.READ, Action.UPDATE], // Can update regional org settings
    [Resource.PROJECTS]: [Action.READ, Action.LIST, Action.CREATE, Action.UPDATE, Action.DELETE, Action.ASSIGN] // Full regional project management
  },

  // Technical Operations Roles
  [UserRole.SUPPORT_AGENT]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST],
    [Resource.USERS]: [Action.READ, Action.LIST, Action.UPDATE], // Limited user support access
    [Resource.DEVICES]: [Action.READ, Action.LIST, Action.UPDATE], // Can help with device issues
    [Resource.SUPERVISOR_PINS]: [Action.READ], // Can view but not manage
    [Resource.TELEMETRY]: [Action.READ, Action.LIST], // For troubleshooting
    [Resource.POLICY]: [Action.READ],
    [Resource.AUTH]: [Action.READ],
    [Resource.SYSTEM_SETTINGS]: [], // No system settings access
    [Resource.AUDIT_LOGS]: [Action.READ], // For investigation
    [Resource.SUPPORT_TICKETS]: [Action.MANAGE], // Full ticket management
    [Resource.ORGANIZATION]: [Action.READ],
    [Resource.PROJECTS]: [Action.READ, Action.LIST] // Read-only access
  },

  [UserRole.SYSTEM_ADMIN]: {
    [Resource.TEAMS]: [Action.MANAGE], // Full team management
    [Resource.USERS]: [Action.MANAGE], // Full user management
    [Resource.DEVICES]: [Action.MANAGE], // Full device management
    [Resource.SUPERVISOR_PINS]: [Action.MANAGE], // Full PIN management
    [Resource.TELEMETRY]: [Action.MANAGE], // Full telemetry access
    [Resource.POLICY]: [Action.MANAGE], // Full policy management
    [Resource.AUTH]: [Action.MANAGE], // Full auth management
    [Resource.SYSTEM_SETTINGS]: [Action.MANAGE], // Full system settings access
    [Resource.AUDIT_LOGS]: [Action.MANAGE], // Full audit access
    [Resource.SUPPORT_TICKETS]: [Action.MANAGE],
    [Resource.ORGANIZATION]: [Action.MANAGE], // Full org management
    [Resource.PROJECTS]: [Action.MANAGE] // Full system access
  },

  [UserRole.AUDITOR]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST, Action.AUDIT], // Read-only audit access
    [Resource.USERS]: [Action.READ, Action.LIST, Action.AUDIT],
    [Resource.DEVICES]: [Action.READ, Action.LIST, Action.AUDIT],
    [Resource.SUPERVISOR_PINS]: [Action.READ, Action.AUDIT],
    [Resource.TELEMETRY]: [Action.READ, Action.LIST, Action.AUDIT],
    [Resource.POLICY]: [Action.READ, Action.AUDIT],
    [Resource.AUTH]: [Action.READ, Action.AUDIT],
    [Resource.SYSTEM_SETTINGS]: [Action.READ, Action.AUDIT], // Read-only system settings audit
    [Resource.AUDIT_LOGS]: [Action.MANAGE], // Full audit log access
    [Resource.SUPPORT_TICKETS]: [Action.READ, Action.AUDIT],
    [Resource.ORGANIZATION]: [Action.READ, Action.AUDIT],
    [Resource.PROJECTS]: [Action.READ, Action.LIST, Action.AUDIT] // Audit access only
  },

  // Specialized Roles
  [UserRole.DEVICE_MANAGER]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST],
    [Resource.USERS]: [Action.READ, Action.LIST],
    [Resource.DEVICES]: [Action.MANAGE], // Full device management specialization
    [Resource.SUPERVISOR_PINS]: [], // No PIN access
    [Resource.TELEMETRY]: [Action.MANAGE], // Full telemetry access for device monitoring
    [Resource.POLICY]: [Action.READ], // Can view policies
    [Resource.AUTH]: [Action.READ],
    [Resource.SYSTEM_SETTINGS]: [], // Limited system access for device config only
    [Resource.AUDIT_LOGS]: [Action.READ], // Device-related audit logs
    [Resource.SUPPORT_TICKETS]: [Action.CREATE, Action.READ, Action.LIST, Action.UPDATE], // Device-related tickets
    [Resource.ORGANIZATION]: [Action.READ],
    [Resource.PROJECTS]: [Action.READ, Action.LIST] // Read-only access (focuses on devices)
  },

  [UserRole.POLICY_ADMIN]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST],
    [Resource.USERS]: [Action.READ, Action.LIST],
    [Resource.DEVICES]: [Action.READ, Action.LIST],
    [Resource.SUPERVISOR_PINS]: [Action.READ, Action.LIST],
    [Resource.TELEMETRY]: [Action.READ, Action.LIST],
    [Resource.POLICY]: [Action.MANAGE], // Full policy management specialization
    [Resource.AUTH]: [Action.READ],
    [Resource.SYSTEM_SETTINGS]: [], // Limited system access for policy config
    [Resource.AUDIT_LOGS]: [Action.READ], // Policy-related audit logs
    [Resource.SUPPORT_TICKETS]: [Action.CREATE, Action.READ, Action.LIST, Action.UPDATE], // Policy-related tickets
    [Resource.ORGANIZATION]: [Action.READ],
    [Resource.PROJECTS]: [Action.READ, Action.LIST] // Read-only access (focuses on policy)
  },

  [UserRole.NATIONAL_SUPPORT_ADMIN]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST], // Can view all teams nationally
    [Resource.USERS]: [Action.READ, Action.LIST, Action.UPDATE], // Can support users nationally
    [Resource.DEVICES]: [Action.READ, Action.LIST, Action.UPDATE], // Can support devices nationally
    [Resource.SUPERVISOR_PINS]: [Action.READ, Action.LIST], // View supervisor PINs nationally
    [Resource.TELEMETRY]: [Action.MANAGE], // Full telemetry access for national monitoring
    [Resource.POLICY]: [Action.READ, Action.UPDATE], // Can update operational policies
    [Resource.AUTH]: [Action.READ, Action.EXECUTE], // Can perform overrides nationally
    [Resource.SYSTEM_SETTINGS]: [], // NO system settings access - important security boundary
    [Resource.AUDIT_LOGS]: [Action.READ, Action.LIST], // National audit access
    [Resource.SUPPORT_TICKETS]: [Action.MANAGE], // National ticket management
    [Resource.ORGANIZATION]: [Action.READ, Action.UPDATE], // National org updates
    [Resource.PROJECTS]: [Action.MANAGE] // Full national access
  }
};

/**
 * Check if a user role has permission for a specific action on a resource
 * @param role - User role to check
 * @param resource - Resource to access
 * @param action - Action to perform
 * @returns True if user has permission, false otherwise
 */
export function hasPermission(role: UserRole, resource: Resource, action: Action): boolean {
  const rolePermissions = RBAC_MATRIX[role];
  if (!rolePermissions) {
    return false;
  }

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  return resourcePermissions.includes(action);
}

/**
 * Get all permissions for a user role
 * @param role - User role
 * @returns Object with all resources and their allowed actions
 */
export function getRolePermissions(role: UserRole): Record<Resource, Action[]> {
  return RBAC_MATRIX[role] || {};
}

/**
 * Enhanced user context with multi-role support and effective permissions
 */
async function enhanceUserWithRoles(
  user: any,
  context: {
    requestId?: string;
    teamId?: string;
    sessionId?: string;
  }
): Promise<AuthenticatedRequest['user']> {
  try {
    // For override tokens, create minimal context with supervisor role
    if (user.code === 'SUPERVISOR') {
      return {
        ...user,
        roles: [{
          id: 'supervisor-override',
          name: 'FIELD_SUPERVISOR',
          displayName: 'Supervisor Override',
          hierarchyLevel: 4,
          teamId: user.teamId
        }],
        effectivePermissions: [], // Will be computed on-demand
        role: 'FIELD_SUPERVISOR' // Updated for new role system
      };
    }

    // Get user's effective permissions and roles from AuthorizationService
    const effectivePermissions = await AuthorizationService.computeEffectivePermissions(
      user.id,
      {
        teamId: context.teamId,
        sessionId: context.sessionId,
        requestId: context.requestId,
        userId: user.id
      }
    );

    // Extract role information from effective permissions
    const roles = effectivePermissions.roles.map(role => ({
      id: role.id,
      name: role.name,
      displayName: role.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      hierarchyLevel: role.hierarchyLevel,
      teamId: role.teamId,
      regionId: role.regionId
    }));

    // Create simplified effective permissions for caching
    const simplifiedPermissions = effectivePermissions.permissions.map(perm => ({
      resource: perm.resource,
      action: perm.action,
      scope: perm.scope,
      inheritedFrom: perm.inheritedFrom || 'unknown'
    }));

    // Determine primary role for backward compatibility (highest hierarchy level)
    const primaryRole = roles.length > 0
      ? roles.reduce((highest, current) =>
          current.hierarchyLevel > highest.hierarchyLevel ? current : highest
        ).name
      : 'TEAM_MEMBER';

    logger.info('User enhanced with multi-role context', {
      userId: user.id,
      roleCount: roles.length,
      permissionCount: simplifiedPermissions.length,
      primaryRole,
      roles: roles.map(r => r.name),
      requestId: context.requestId
    });

    return {
      ...user,
      roles,
      effectivePermissions: simplifiedPermissions,
      role: primaryRole // Backward compatibility
    };

  } catch (error) {
    logger.error('Failed to enhance user with roles', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id,
      requestId: context.requestId
    });

    // Fail gracefully with basic user info and TEAM_MEMBER role
    return {
      ...user,
      roles: [{
        id: 'fallback-role',
        name: 'TEAM_MEMBER',
        displayName: 'Team Member',
        hierarchyLevel: 1
      }],
      effectivePermissions: [],
      role: 'TEAM_MEMBER'
    };
  }
}

/**
 * Authentication middleware - verifies JWT token and sets user in request
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token required'
        }
      });
    }

    // Try to verify as access token first, then override token
    let verification = await JWTService.verifyToken(token, 'access');
    let tokenType = 'access';

    if (!verification.valid) {
      verification = await JWTService.verifyToken(token, 'override');
      tokenType = 'override';
    }

    if (!verification.valid || !verification.payload) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    const payload = verification.payload;
    const userId = payload.sub;
    const sessionId = payload['x-session-id'];

    // For override tokens, we need to handle differently
    let userResult: any;
    if (tokenType === 'override') {
      // Override tokens are issued to supervisor PIN IDs, not regular users
      // Create a minimal user context for supervisor access
      userResult = {
        success: true,
        user: {
          id: userId,
          code: 'SUPERVISOR',
          teamId: payload['x-team-id'] || '',
          displayName: 'Supervisor Override',
          email: null,
          role: 'SUPERVISOR' as const,
          isActive: true
        }
      };
    } else {
      userResult = await UserService.getUser(userId);

      if (!userResult.success || !userResult.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive'
          }
        });
      }
    }

    // Get session information
    let sessionData;
    if (sessionId) {
      const sessionQuery = await db.select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (sessionQuery.length > 0) {
        sessionData = sessionQuery[0];

        // Check if session is still open
        if (sessionData.status !== 'open') {
          return res.status(401).json({
            ok: false,
            error: {
              code: 'SESSION_INACTIVE',
              message: 'Session has been ended or expired'
            }
          });
        }
      }
    }

    // Enhanced user loading with multi-role support and effective permissions
    const enhancedUser = await enhanceUserWithRoles(userResult.user, {
      requestId: req.headers['x-request-id'] as string,
      teamId: sessionData?.teamId,
      sessionId: sessionData?.id
    });

    req.user = enhancedUser;
    req.session = sessionData ? {
      sessionId: sessionData.id,
      userId: sessionData.userId,
      teamId: sessionData.teamId,
      deviceId: sessionData.deviceId,
      startedAt: sessionData.startedAt,
      expiresAt: sessionData.expiresAt,
      overrideUntil: sessionData.overrideUntil,
      status: sessionData.status,
    } as any : undefined;
    logger.info('User authenticated successfully', {
      userId: req.user?.id,
      userCode: req.user?.code,
      role: req.user?.role,
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.error('Authentication error', { error, requestId: req.headers['x-request-id'] });

    // For AuthorizationService errors, fail gracefully with fallback user info
    if (error instanceof Error && error.message.includes('Service unavailable')) {
      // Create fallback user context - using minimal info since userResult might be undefined
      const fallbackUser = {
        id: 'fallback-user',
        code: 'FALLBACK',
        teamId: 'fallback-team',
        displayName: 'Fallback User',
        email: null,
        isActive: true,
        roles: [{
          id: 'fallback-role',
          name: 'TEAM_MEMBER',
          displayName: 'Team Member',
          hierarchyLevel: 1
        }],
        effectivePermissions: [],
        role: 'TEAM_MEMBER'
      };

      req.user = fallbackUser;
      next();
      return;
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

/**
 * Role-based access control middleware factory - Enhanced with multi-role support
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    try {
      // Check if user has any of the required roles using AuthorizationService
      const hasRequiredRole = await AuthorizationService.hasAnyRole(
        req.user.id,
        allowedRoles
      );

      if (!hasRequiredRole) {
        const userRoleNames = req.user.roles?.map(r => r.name) || [req.user.role];

        logger.warn('Access denied - insufficient role', {
          userId: req.user.id,
          userRoles: userRoleNames,
          primaryRole: req.user.role,
          requiredRoles: allowedRoles,
          requestId: req.headers['x-request-id']
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions to access this resource'
          }
        });
      }

      logger.info('Role-based access granted', {
        userId: req.user.id,
        userRoles: req.user.roles?.map(r => r.name) || [req.user.role],
        primaryRole: req.user.role,
        requiredRoles: allowedRoles,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      logger.error('Role check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requiredRoles: allowedRoles,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_CHECK_ERROR',
          message: 'Failed to verify user roles'
        }
      });
    }
  };
};

/**
 * Resource-based access control middleware factory - Enhanced with AuthorizationService
 */
export const requirePermission = (resource: Resource, action: Action) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    try {
      // Use AuthorizationService for comprehensive permission checking
      const permissionResult = await AuthorizationService.checkPermission(
        req.user.id,
        resource,
        action,
        {
          teamId: req.user.teamId,
          userId: req.user.id,
          sessionId: req.session?.sessionId,
          deviceId: req.session?.deviceId,
          requestId: req.headers['x-request-id'] as string,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      if (!permissionResult.allowed) {
        logger.warn('Access denied - insufficient permissions', {
          userId: req.user.id,
          userRoles: req.user.roles?.map(r => r.name) || [req.user.role],
          resource,
          action,
          reason: permissionResult.reason,
          grantedBy: permissionResult.grantedBy,
          cacheHit: permissionResult.cacheHit,
          evaluationTime: permissionResult.evaluationTime,
          requestId: req.headers['x-request-id']
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: permissionResult.reason || `Insufficient permissions to ${action} ${resource}`
          }
        });
      }

      logger.info('Permission-based access granted', {
        userId: req.user.id,
        userRoles: req.user.roles?.map(r => r.name) || [req.user.role],
        resource,
        action,
        grantedBy: permissionResult.grantedBy,
        cacheHit: permissionResult.cacheHit,
        evaluationTime: permissionResult.evaluationTime,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      logger.error('Permission check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        resource,
        action,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Failed to verify permissions'
        }
      });
    }
  };
};

/**
 * Team access middleware - ensures users can only access resources from their own team
 * Enhanced with cross-team role support
 */
export const requireTeamAccess = (teamIdParam: string = 'teamId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    const resourceTeamId = req.params[teamIdParam] || req.body[teamIdParam] || req.query[teamIdParam];

    if (!resourceTeamId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TEAM_ID',
          message: 'Team ID required for this operation'
        }
      });
    }

    try {
      // Use AuthorizationService for contextual access checking
      const contextualResult = await AuthorizationService.checkContextualAccess(
        req.user.id,
        {
          teamId: resourceTeamId,
          type: 'RESOURCE'
        },
        'READ', // Use READ as baseline permission for team access
        {
          teamId: req.user.teamId,
          userId: req.user.id,
          sessionId: req.session?.sessionId,
          requestId: req.headers['x-request-id'] as string
        }
      );

      if (!contextualResult.allowed) {
        logger.warn('Access denied - team boundary violation', {
          userId: req.user.id,
          userRoles: req.user.roles?.map(r => r.name) || [req.user.role],
          userTeamId: req.user.teamId,
          requestedTeamId: resourceTeamId,
          reason: contextualResult.reason,
          requestId: req.headers['x-request-id']
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'TEAM_ACCESS_DENIED',
            message: contextualResult.reason || 'Access denied to resources from this team'
          }
        });
      }

      logger.info('Team access granted', {
        userId: req.user.id,
        userRoles: req.user.roles?.map(r => r.name) || [req.user.role],
        userTeamId: req.user.teamId,
        requestedTeamId: resourceTeamId,
        crossTeamAccess: resourceTeamId !== req.user.teamId,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      logger.error('Team access check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        userTeamId: req.user.teamId,
        requestedTeamId: resourceTeamId,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'TEAM_ACCESS_CHECK_ERROR',
          message: 'Failed to verify team access'
        }
      });
    }
  };
};

/**
 * Owner access middleware - ensures users can only access their own resources
 * Enhanced with cross-team role support
 */
export const requireOwnerAccess = (userIdParam: string = 'userId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];

    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID required for this operation'
        }
      });
    }

    try {
      // Check if user has cross-team access or admin-level permissions
      const hasCrossTeamAccess = await AuthorizationService.hasAnyRole(
        req.user.id,
        [
          UserRole.SYSTEM_ADMIN,
          UserRole.NATIONAL_SUPPORT_ADMIN,
          UserRole.AUDITOR,
          UserRole.REGIONAL_MANAGER
        ]
      );

      // Allow access if user is the owner or has cross-team access
      if (req.user.id !== resourceUserId && !hasCrossTeamAccess) {
        logger.warn('Access denied - owner access required', {
          userId: req.user.id,
          userRoles: req.user.roles?.map(r => r.name) || [req.user.role],
          requestedUserId: resourceUserId,
          requestId: req.headers['x-request-id']
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'OWNER_ACCESS_REQUIRED',
            message: 'Access denied to this resource'
          }
        });
      }

      logger.info('Owner access granted', {
        userId: req.user.id,
        userRoles: req.user.roles?.map(r => r.name) || [req.user.role],
        requestedUserId: resourceUserId,
        isOwner: req.user.id === resourceUserId,
        crossTeamAccess: hasCrossTeamAccess && req.user.id !== resourceUserId,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      logger.error('Owner access check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.id,
        requestedUserId: resourceUserId,
        requestId: req.headers['x-request-id']
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'OWNER_ACCESS_CHECK_ERROR',
          message: 'Failed to verify owner access'
        }
      });
    }
  };
};

/**
 * Web Admin Authentication middleware - verifies web admin JWT tokens
 * Separate from mobile authentication for proper security boundaries
 */
export const authenticateWebAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Web admin authorization token required'
        }
      });
    }

    // Verify web admin token
    const verification = await JWTService.verifyToken(token, 'web-admin');

    if (!verification.valid || !verification.payload) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_WEB_ADMIN_TOKEN',
          message: 'Invalid or expired web admin token'
        }
      });
    }

    const payload = verification.payload;
    const userId = payload.sub;

    // Get web admin user information
    const { WebAdminAuthService } = await import('../services/web-admin-auth-service');
    const webAdminAuthService = new WebAdminAuthService();
    const userResult = await webAdminAuthService.whoami(userId);

    if (!userResult.success || !userResult.user) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'WEB_ADMIN_USER_NOT_FOUND',
          message: 'Web admin user not found or inactive'
        }
      });
    }

    // Create enhanced user context for web admin
    const webAdminUser = {
      id: userResult.user.id,
      code: 'WEB_ADMIN',
      teamId: '', // Web admin not bound to team
      displayName: userResult.user.fullName,
      email: userResult.user.email,
      isActive: true,
      roles: [{
        id: userResult.user.id,
        name: userResult.user.role,
        displayName: userResult.user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        hierarchyLevel: getHierarchyLevel(userResult.user.role as UserRole)
      }],
      effectivePermissions: [],
      role: userResult.user.role
    };

    req.user = webAdminUser;

    logger.info('Web admin authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.error('Web admin authentication error', {
      error: error instanceof Error ? error.message : String(error),
      requestId: req.headers['x-request-id']
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'WEB_ADMIN_AUTH_ERROR',
        message: 'Web admin authentication failed'
      }
    });
  }
};

/**
 * Get hierarchy level for role sorting
 */
function getHierarchyLevel(role: UserRole): number {
  const hierarchy = {
    [UserRole.TEAM_MEMBER]: 1,
    [UserRole.FIELD_SUPERVISOR]: 2,
    [UserRole.REGIONAL_MANAGER]: 3,
    [UserRole.SUPPORT_AGENT]: 4,
    [UserRole.DEVICE_MANAGER]: 5,
    [UserRole.POLICY_ADMIN]: 6,
    [UserRole.AUDITOR]: 7,
    [UserRole.NATIONAL_SUPPORT_ADMIN]: 8,
    [UserRole.SYSTEM_ADMIN]: 9
  };
  return hierarchy[role] || 0;
}

/**
 * Helper function to combine multiple middleware
 */
export const combineMiddleware = (...middleware: Array<(req: AuthenticatedRequest, res: Response, next: NextFunction) => void>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const executeMiddleware = (index: number) => {
      if (index >= middleware.length) {
        return next();
      }

      middleware[index](req, res, (err?: any) => {
        if (err) {
          return next(err);
        }
        executeMiddleware(index + 1);
      });
    };

    executeMiddleware(0);
  };
};