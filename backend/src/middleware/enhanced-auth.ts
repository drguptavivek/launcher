import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user-service';
import { JWTService } from '../services/jwt-service';
import { AuthorizationService } from '../services/authorization-service';
import { db, sessions } from '../lib/db';
import { logger } from '../lib/logger';
import { eq } from 'drizzle-orm';

export interface EnhancedAuthenticatedRequest extends Request {
  user?: {
    id: string;
    code: string;
    teamId: string;
    displayName: string;
    email: string | null;
    isActive: boolean;
    roles?: Array<{
      id: string;
      name: string;
      hierarchyLevel: number;
      teamId?: string;
      regionId?: string;
    }>;
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
  authorization?: {
    userId: string;
    permissions: Array<{
      resource: string;
      action: string;
      scope: string;
      inheritedFrom: string;
      isCrossTeam: boolean;
    }>;
    computedAt: Date;
    expiresAt: Date;
  };
}

/**
 * Enhanced authentication middleware with RBAC integration
 */
export const enhancedAuthenticateToken = async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
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
    let userResult;
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

    // Get user's role information
    const userRoles = await AuthorizationService.computeEffectivePermissions(userResult.user?.id || '');

    req.user = {
      ...userResult.user,
      roles: userRoles.roles
    } as any;

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

    req.authorization = {
      userId: userRoles.userId,
      permissions: userRoles.permissions.map(p => ({
        resource: p.resource,
        action: p.action,
        scope: p.scope,
        inheritedFrom: p.inheritedFrom || '',
        isCrossTeam: p.isCrossTeam
      })),
      computedAt: userRoles.computedAt,
      expiresAt: userRoles.expiresAt
    };

    logger.info('User authenticated successfully', {
      userId: req.user?.id,
      userCode: req.user?.code,
      roleCount: req.user?.roles?.length,
      permissionCount: req.authorization?.permissions.length,
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.error('Enhanced authentication error', { error, requestId: req.headers['x-request-id'] });
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
 * Enhanced permission-based access control middleware
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.authorization) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // Check permission using AuthorizationService
    const permissionResult = await AuthorizationService.checkPermission(
      req.user.id,
      resource,
      action,
      {
        teamId: req.user.teamId,
        userId: req.user.id,
        sessionId: req.session?.sessionId,
        deviceId: req.session?.deviceId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id'] as string
      }
    );

    if (!permissionResult.allowed) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        resource,
        action,
        reason: permissionResult.reason,
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
      resource,
      action,
      grantedBy: permissionResult.grantedBy,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

/**
 * Enhanced team access middleware with contextual validation
 */
export const requireTeamAccess = (teamIdParam: string = 'teamId') => {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
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

    // Check contextual access using AuthorizationService
    const contextResult = await AuthorizationService.checkContextualAccess(
      req.user.id,
      { teamId: resourceTeamId as string, type: 'TEAM_RESOURCE' },
      'READ',
      {
        teamId: req.user.teamId,
        userId: req.user.id,
        requestId: req.headers['x-request-id'] as string
      }
    );

    if (!contextResult.allowed) {
      logger.warn('Access denied - team boundary violation', {
        userId: req.user.id,
        userTeamId: req.user.teamId,
        requestedTeamId: resourceTeamId,
        reason: contextResult.reason,
        requestId: req.headers['x-request-id']
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'TEAM_ACCESS_DENIED',
          message: contextResult.reason || 'Access denied to resources from this team'
        }
      });
    }

    logger.info('Team access granted', {
      userId: req.user.id,
      teamId: req.user.teamId,
      accessedTeamId: resourceTeamId,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

/**
 * Resource owner access middleware with enhanced context checking
 */
export const requireOwnerAccess = (userIdParam: string = 'userId') => {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
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

    // Check if user has cross-team access or is accessing own resources
    if (req.user.id !== resourceUserId.toString()) {
      // Check if user has cross-team access permissions
      const hasCrossTeamAccess = await AuthorizationService.hasAnyRole(req.user.id, [
        'NATIONAL_SUPPORT_ADMIN',
        'SYSTEM_ADMIN',
        'AUDITOR'
      ]);

      if (!hasCrossTeamAccess) {
        logger.warn('Access denied - owner access required', {
          userId: req.user.id,
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

      // Log cross-team access
      logger.info('Cross-team owner access granted', {
        userId: req.user.id,
        targetUserId: resourceUserId,
        requestId: req.headers['x-request-id']
      });
    } else {
      logger.info('Owner access granted', {
        userId: req.user.id,
        requestId: req.headers['x-request-id']
      });
    }

    next();
  };
};

/**
 * System settings access middleware with enhanced security
 */
export const requireSystemSettingsAccess = (action: string = 'READ') => {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // Use AuthorizationService for system settings access check
    const permissionResult = await AuthorizationService.checkPermission(
      req.user.id,
      'SYSTEM_SETTINGS',
      action,
      {
        teamId: req.user.teamId,
        userId: req.user.id,
        sessionId: req.session?.sessionId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id'] as string
      }
    );

    if (!permissionResult.allowed) {
      logger.warn('System settings access denied', {
        userId: req.user.id,
        action,
        reason: permissionResult.reason,
        requestId: req.headers['x-request-id']
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'SYSTEM_SETTINGS_ACCESS_DENIED',
          message: permissionResult.reason || 'Access to system settings denied'
        }
      });
    }

    // Additional audit logging for sensitive system settings operations
    if (['UPDATE', 'DELETE', 'MANAGE'].includes(action)) {
      logger.info('System settings modified', {
        action: 'system.settings.modify',
        userId: req.user?.id,
        operation: action,
        endpoint: req.path,
        method: req.method,
        requestId: req.headers['x-request-id'],
        requiresAudit: true
      });
    }

    logger.info('System settings access granted', {
      userId: req.user.id,
      action,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

/**
 * Helper function to combine multiple middleware
 */
export const combineMiddleware = (...middleware: Array<(req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => void>) => {
  return (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
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