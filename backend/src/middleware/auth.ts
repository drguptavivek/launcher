import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user-service';
import { logger } from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    code: string;
    teamId: string;
    displayName: string;
    email: string | null;
    role: 'TEAM_MEMBER' | 'SUPERVISOR' | 'ADMIN';
    isActive: boolean;
  };
}

export enum UserRole {
  TEAM_MEMBER = 'TEAM_MEMBER',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
}

export enum Resource {
  TEAMS = 'teams',
  USERS = 'users',
  DEVICES = 'devices',
  SUPERVISOR_PINS = 'supervisor_pins',
  TELEMETRY = 'telemetry',
  POLICY = 'policy',
  AUTH = 'auth'
}

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list'
}

// Role-based access control matrix
const RBAC_MATRIX: Record<UserRole, Record<Resource, Action[]>> = {
  [UserRole.ADMIN]: {
    [Resource.TEAMS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.USERS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.DEVICES]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.SUPERVISOR_PINS]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.TELEMETRY]: [Action.READ, Action.LIST],
    [Resource.POLICY]: [Action.READ, Action.LIST],
    [Resource.AUTH]: [Action.READ, Action.LIST]
  },
  [UserRole.SUPERVISOR]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST],
    [Resource.USERS]: [Action.READ, Action.LIST, Action.UPDATE], // Can update users but not delete
    [Resource.DEVICES]: [Action.CREATE, Action.READ, Action.UPDATE, Action.LIST], // Can manage devices
    [Resource.SUPERVISOR_PINS]: [Action.READ, Action.LIST], // Can only view supervisor PINs
    [Resource.TELEMETRY]: [Action.READ, Action.LIST],
    [Resource.POLICY]: [Action.READ],
    [Resource.AUTH]: [Action.READ]
  },
  [UserRole.TEAM_MEMBER]: {
    [Resource.TEAMS]: [Action.READ, Action.LIST],
    [Resource.USERS]: [Action.READ, Action.LIST],
    [Resource.DEVICES]: [Action.READ, Action.LIST],
    [Resource.SUPERVISOR_PINS]: [], // No access to supervisor PINs
    [Resource.TELEMETRY]: [Action.READ, Action.LIST],
    [Resource.POLICY]: [Action.READ],
    [Resource.AUTH]: [Action.READ]
  }
};

/**
 * Authentication middleware - verifies JWT token and sets user in request
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token required'
        }
      });
    }

    // For now, we'll simulate token verification
    // In a real implementation, you would verify JWT token here
    // and extract user information from the token payload

    // Temporary: Get user info from query params for testing
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    const userResult = await UserService.getUser(userId);

    if (!userResult.success || !userResult.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        }
      });
    }

    if (!userResult.user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
    }

    req.user = userResult.user as any;
    logger.info('User authenticated successfully', {
      userId: req.user?.id,
      userCode: req.user?.code,
      role: req.user?.role,
      requestId: req.headers['x-request-id']
    });

    next();
  } catch (error) {
    logger.error('Authentication error', { error, requestId: req.headers['x-request-id'] });
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
 * Role-based access control middleware factory
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
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
      userRole: req.user.role,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

/**
 * Resource-based access control middleware factory
 */
export const requirePermission = (resource: Resource, action: Action) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    const userRole = req.user.role as UserRole;
    const allowedActions = RBAC_MATRIX[userRole]?.[resource] || [];

    if (!allowedActions.includes(action)) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        userRole,
        resource,
        action,
        allowedActions,
        requestId: req.headers['x-request-id']
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions to ${action} ${resource}`
        }
      });
    }

    logger.info('Permission-based access granted', {
      userId: req.user.id,
      userRole,
      resource,
      action,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

/**
 * Team access middleware - ensures users can only access resources from their own team
 */
export const requireTeamAccess = (teamIdParam: string = 'teamId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // Admins can access any team
    if (req.user.role === UserRole.ADMIN) {
      return next();
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

    if (req.user.teamId !== resourceTeamId) {
      logger.warn('Access denied - team mismatch', {
        userId: req.user.id,
        userTeamId: req.user.teamId,
        requestedTeamId: resourceTeamId,
        requestId: req.headers['x-request-id']
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'TEAM_ACCESS_DENIED',
          message: 'Access denied to resources from this team'
        }
      });
    }

    logger.info('Team access granted', {
      userId: req.user.id,
      teamId: req.user.teamId,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

/**
 * Owner access middleware - ensures users can only access their own resources
 */
export const requireOwnerAccess = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // Admins can access any user's resources
    if (req.user.role === UserRole.ADMIN) {
      return next();
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

    if (req.user.id !== resourceUserId) {
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

    logger.info('Owner access granted', {
      userId: req.user.id,
      requestId: req.headers['x-request-id']
    });

    next();
  };
};

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