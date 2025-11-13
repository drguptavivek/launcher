import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { PolicyService } from '../services/policy-service';
import { TelemetryService } from '../services/telemetry-service';
import { TeamService } from '../services/team-service';
import { UserService } from '../services/user-service';
import { DeviceService } from '../services/device-service';
import { SupervisorPinService } from '../services/supervisor-pin-service';
import { logger } from '../lib/logger';
import {
  authenticateToken,
  requireRole,
  requirePermission,
  requireTeamAccess,
  requireOwnerAccess,
  combineMiddleware,
  AuthenticatedRequest,
  UserRole,
  Resource,
  Action
} from '../middleware/auth';

// Helper function to chain middleware properly
function withAuth(req: Request, res: Response, next: NextFunction, handler: () => void) {
  return authenticateToken(req as AuthenticatedRequest, res, (err) => {
    if (err) return next(err);
    return handler();
  });
}

function withAuthAndPermission(resource: Resource, action: Action) {
  return (req: Request, res: Response, next: NextFunction, handler: () => void) => {
    return authenticateToken(req as AuthenticatedRequest, res, (err) => {
      if (err) return next(err);
      return requirePermission(resource, action)(req as AuthenticatedRequest, res, (err) => {
        if (err) return next(err);
        return handler();
      });
    });
  };
}

function withAuthAndRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction, handler: () => void) => {
    return authenticateToken(req as AuthenticatedRequest, res, (err) => {
      if (err) return next(err);
      return requireRole(roles)(req as AuthenticatedRequest, res, (err) => {
        if (err) return next(err);
        return handler();
      });
    });
  };
}

// Auth middleware to verify JWT tokens
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.whoami(req.headers.authorization || '');

    if (!result.success) {
      return res.status(401).json({
        ok: false,
        error: {
          code: result.error?.code || 'UNAUTHORIZED',
          message: result.error?.message || 'Authentication required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    // Attach user and session info to request
    (req as any).user = result.user;
    (req as any).session = result.session;

    next();
  } catch (error) {
    logger.error('Auth middleware error', { error });
    return res.status(401).json({
      ok: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// POST /api/v1/auth/login
async function login(req: Request, res: Response) {
  try {
    const { deviceId, userCode, pin } = req.body;

    if (!deviceId || !userCode || !pin) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'deviceId, userCode, and pin are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await AuthService.login(
      { deviceId, userCode, pin },
      req.ip || 'unknown',
      req.headers['user-agent']
    );

    if (result.success) {
      return res.json({
        ok: true,
        session: {
          session_id: result.session?.sessionId,
          user_id: result.session?.userId,
          started_at: result.session?.startedAt?.toISOString(),
          expires_at: result.session?.expiresAt?.toISOString(),
          override_until: result.session?.overrideUntil?.toISOString(),
        },
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        policy_version: result.policyVersion,
      });
    } else {
      const statusCode = result.error?.code === 'RATE_LIMITED' ? 429 : 401;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'LOGIN_FAILED',
          message: result.error?.message || 'Login failed',
          request_id: req.headers['x-request-id'],
          ...(result.error?.retryAfter && { retry_after: result.error.retryAfter }),
        },
      });
    }
  } catch (error) {
    logger.error('Login endpoint error', { error, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// POST /api/v1/auth/logout
async function logout(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const session = (req as any).session;

    if (!session) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_SESSION',
          message: 'No active session found',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await AuthService.logout(session.sessionId, user.id);

    if (result.success) {
      return res.json({
        ok: true,
        message: 'Logged out successfully',
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: {
          code: result.error?.code || 'LOGOUT_FAILED',
          message: result.error?.message || 'Logout failed',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Logout endpoint error', { error });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during logout',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// POST /api/v1/auth/refresh
async function refreshToken(req: Request, res: Response) {
  try {
    const { refresh_token } = req.body;

    logger.debug('Refresh token request', {
      hasRefreshToken: !!refresh_token,
      tokenLength: refresh_token?.length,
      body: req.body
    });

    if (!refresh_token) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'refresh_token is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await AuthService.refreshToken(refresh_token);
    logger.debug('Refresh token result', { success: result.success });

    if (result.success) {
      return res.json({
        ok: true,
        access_token: result.accessToken,
        expires_at: result.expiresAt?.toISOString(),
      });
    } else {
      return res.status(401).json({
        ok: false,
        error: {
          code: result.error?.code || 'REFRESH_FAILED',
          message: result.error?.message || 'Token refresh failed',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Refresh token endpoint error', { error });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during token refresh',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/auth/whoami
async function whoami(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const session = (req as any).session;

    return res.json({
      user: {
        id: user.id,
        code: user.code,
        team_id: user.teamId,
        display_name: user.displayName,
      },
      session: {
        session_id: session.sessionId,
        device_id: session.deviceId,
        expires_at: session.expiresAt.toISOString(),
        override_until: session.overrideUntil?.toISOString(),
      },
      policy_version: 3,
    });
  } catch (error) {
    logger.error('Whoami endpoint error', { error });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user information',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// POST /api/v1/auth/session/end
async function endSession(req: Request, res: Response) {
  try {
    const session = (req as any).session;

    if (!session) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_SESSION',
          message: 'No active session found',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await AuthService.endSession(session.sessionId);

    if (result.success) {
      return res.json({
        ok: true,
        message: 'Session ended successfully',
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: {
          code: result.error?.code || 'SESSION_END_FAILED',
          message: result.error?.message || 'Failed to end session',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('End session endpoint error', { error });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while ending the session',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// POST /api/v1/supervisor/override/login
async function supervisorOverride(req: Request, res: Response) {
  try {
    const { supervisor_pin, deviceId } = req.body;

    if (!supervisor_pin || !deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'supervisor_pin and deviceId are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await AuthService.supervisorOverride(
      { supervisorPin: supervisor_pin, deviceId },
      req.ip || 'unknown'
    );

    if (result.success) {
      return res.json({
        ok: true,
        override_until: result.overrideUntil?.toISOString(),
        token: result.token,
      });
    } else {
      const statusCode = result.error?.code === 'RATE_LIMITED' ? 429 : 401;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'OVERRIDE_FAILED',
          message: result.error?.message || 'Supervisor override failed',
          request_id: req.headers['x-request-id'],
          ...(result.error?.retryAfter && { retry_after: result.error.retryAfter }),
        },
      });
    }
  } catch (error) {
    logger.error('Supervisor override endpoint error', { error });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during supervisor override',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/policy/:deviceId
async function getPolicy(req: Request, res: Response) {
  try {
    const deviceId = req.params.deviceId || (req.url && req.url.split('/').pop());

    if (!deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_DEVICE_ID',
          message: 'deviceId is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await PolicyService.issuePolicy(deviceId, req.ip);

    if (result.success) {
      return res.json({
        jws: result.jws,
        payload: result.payload,
      });
    } else {
      return res.status(result.error?.code === 'DEVICE_NOT_FOUND' ? 404 : 500).json({
        ok: false,
        error: {
          code: result.error?.code || 'POLICY_ERROR',
          message: result.error?.message || 'Failed to issue policy',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Policy endpoint error', { error });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching policy',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// POST /api/v1/telemetry
async function telemetry(req: Request, res: Response) {
  try {
    const batch = req.body;

    // Validate batch structure
    if (!batch || !Array.isArray(batch.events)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_BATCH',
          message: 'Invalid telemetry batch format. Expected { events: [...] }',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    // Validate batch size
    if (batch.events.length === 0) {
      return res.json({
        ok: true,
        accepted: 0,
        dropped: 0,
      });
    }

    const result = await TelemetryService.ingestBatch(batch, req.ip);

    if (result.success) {
      return res.json({
        ok: true,
        accepted: result.accepted,
        dropped: result.dropped,
      });
    } else {
      const statusCode = result.error?.code === 'DEVICE_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'TELEMETRY_ERROR',
          message: result.error?.message || 'Failed to process telemetry',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Telemetry endpoint error', { error });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while processing telemetry',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// ================== TEAM MANAGEMENT ENDPOINTS ==================

// POST /api/v1/teams - Create new team
async function createTeam(req: Request, res: Response) {
  try {
    const { name, timezone } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Team name is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.createTeam({
      name: name.trim(),
      timezone: timezone || 'UTC',
    });

    if (result.success) {
      return res.status(201).json({
        ok: true,
        team: {
          id: result.team?.id,
          name: result.team?.name,
          timezone: result.team?.timezone,
          created_at: result.team?.createdAt?.toISOString(),
          updated_at: result.team?.updatedAt?.toISOString(),
        },
      });
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error?.code || 'TEAM_CREATE_FAILED',
          message: result.error?.message || 'Failed to create team',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Create team endpoint error', { error, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating team',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/teams - List teams
async function listTeams(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const search = req.query.search as string;

    const result = await TeamService.listTeams({ page, limit, search });

    if (result.success) {
      return res.json({
        ok: true,
        teams: result.teams?.map(team => ({
          id: team.id,
          name: team.name,
          timezone: team.timezone,
          is_active: true, // teams don't have isActive field, all are active
          created_at: team.createdAt?.toISOString(),
          updated_at: team.updatedAt?.toISOString(),
        })) || [],
        pagination: {
          page,
          limit,
          total: result.total || 0,
          pages: Math.ceil((result.total || 0) / limit),
        },
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: {
          code: result.error?.code || 'TEAMS_LIST_FAILED',
          message: result.error?.message || 'Failed to list teams',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('List teams endpoint error', { error, query: req.query });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while listing teams',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/teams/:id - Get team by ID
async function getTeam(req: Request, res: Response) {
  try {
    const teamId = req.params.id;

    if (!teamId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_TEAM_ID',
          message: 'Team ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.getTeam(teamId);

    if (result.success) {
      return res.json({
        ok: true,
        team: {
          id: result.team?.id,
          name: result.team?.name,
          timezone: result.team?.timezone,
          created_at: result.team?.createdAt?.toISOString(),
          updated_at: result.team?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'TEAM_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'TEAM_GET_FAILED',
          message: result.error?.message || 'Failed to get team',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Get team endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while getting team',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// PUT /api/v1/teams/:id - Update team
async function updateTeam(req: Request, res: Response) {
  try {
    const teamId = req.params.id;
    const { name, timezone } = req.body;

    if (!teamId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_TEAM_ID',
          message: 'Team ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.updateTeam(teamId, {
      name: name?.trim(),
      timezone,
    });

    if (result.success) {
      return res.json({
        ok: true,
        team: {
          id: result.team?.id,
          name: result.team?.name,
          timezone: result.team?.timezone,
          created_at: result.team?.createdAt?.toISOString(),
          updated_at: result.team?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'TEAM_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'TEAM_UPDATE_FAILED',
          message: result.error?.message || 'Failed to update team',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Update team endpoint error', { error, params: req.params, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating team',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// DELETE /api/v1/teams/:id - Delete team
async function deleteTeam(req: Request, res: Response) {
  try {
    const teamId = req.params.id;

    if (!teamId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_TEAM_ID',
          message: 'Team ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.deleteTeam(teamId);

    if (result.success) {
      return res.json({
        ok: true,
        message: 'Team deleted successfully',
      });
    } else {
      const statusCode = result.error?.code === 'TEAM_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'TEAM_DELETE_FAILED',
          message: result.error?.message || 'Failed to delete team',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Delete team endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting team',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// ================== USER MANAGEMENT ENDPOINTS ==================

// POST /api/v1/users - Create new user
async function createUser(req: Request, res: Response) {
  try {
    const { teamId, code, displayName, email, role, pin } = req.body;

    if (!teamId || !code || !displayName || !pin) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'teamId, code, displayName, and pin are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.createUser({
      teamId,
      code: code.trim(),
      displayName: displayName.trim(),
      email: email?.trim(),
      role,
      pin,
    });

    if (result.success) {
      return res.status(201).json({
        ok: true,
        user: {
          id: result.user?.id,
          team_id: result.user?.teamId,
          code: result.user?.code,
          display_name: result.user?.displayName,
          email: result.user?.email,
          role: result.user?.role,
          is_active: result.user?.isActive,
          created_at: result.user?.createdAt?.toISOString(),
          updated_at: result.user?.updatedAt?.toISOString(),
        },
      });
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error?.code || 'USER_CREATE_FAILED',
          message: result.error?.message || 'Failed to create user',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Create user endpoint error', { error, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating user',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/users - List users
async function listUsers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const search = req.query.search as string;
    const teamId = req.query.team_id as string;
    const role = req.query.role as string;
    const isActive = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;

    const result = await UserService.listUsers({ page, limit, search, teamId, role, isActive });

    if (result.success) {
      return res.json({
        ok: true,
        users: result.users?.map(user => ({
          id: user.id,
          team_id: user.teamId,
          code: user.code,
          display_name: user.displayName,
          email: user.email,
          role: user.role,
          is_active: user.isActive,
          created_at: user.createdAt?.toISOString(),
          updated_at: user.updatedAt?.toISOString(),
        })) || [],
        pagination: {
          page,
          limit,
          total: result.total || 0,
          pages: Math.ceil((result.total || 0) / limit),
        },
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: {
          code: result.error?.code || 'USERS_LIST_FAILED',
          message: result.error?.message || 'Failed to list users',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('List users endpoint error', { error, query: req.query });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while listing users',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/users/:id - Get user by ID
async function getUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.getUser(userId);

    if (result.success) {
      return res.json({
        ok: true,
        user: {
          id: result.user?.id,
          team_id: result.user?.teamId,
          code: result.user?.code,
          display_name: result.user?.displayName,
          email: result.user?.email,
          role: result.user?.role,
          is_active: result.user?.isActive,
          created_at: result.user?.createdAt?.toISOString(),
          updated_at: result.user?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'USER_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'USER_GET_FAILED',
          message: result.error?.message || 'Failed to get user',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Get user endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while getting user',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// PUT /api/v1/users/:id - Update user
async function updateUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const { displayName, email, role, isActive, pin } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.updateUser(userId, {
      displayName: displayName?.trim(),
      email: email?.trim(),
      role,
      isActive,
      pin,
    });

    if (result.success) {
      return res.json({
        ok: true,
        user: {
          id: result.user?.id,
          team_id: result.user?.teamId,
          code: result.user?.code,
          display_name: result.user?.displayName,
          email: result.user?.email,
          role: result.user?.role,
          is_active: result.user?.isActive,
          created_at: result.user?.createdAt?.toISOString(),
          updated_at: result.user?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'USER_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'USER_UPDATE_FAILED',
          message: result.error?.message || 'Failed to update user',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Update user endpoint error', { error, params: req.params, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating user',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// DELETE /api/v1/users/:id - Delete user (soft delete)
async function deleteUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.deleteUser(userId);

    if (result.success) {
      return res.json({
        ok: true,
        message: 'User deactivated successfully',
      });
    } else {
      const statusCode = result.error?.code === 'USER_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'USER_DELETE_FAILED',
          message: result.error?.message || 'Failed to delete user',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Delete user endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting user',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// ================== DEVICE MANAGEMENT ENDPOINTS ==================

// POST /api/v1/devices - Create new device
async function createDevice(req: Request, res: Response) {
  try {
    const { teamId, name, androidId, appVersion } = req.body;

    if (!teamId || !name) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'teamId and name are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.createDevice({
      teamId,
      name: name.trim(),
      androidId: androidId?.trim(),
      appVersion: appVersion?.trim(),
    });

    if (result.success) {
      return res.status(201).json({
        ok: true,
        device: {
          id: result.device?.id,
          team_id: result.device?.teamId,
          name: result.device?.name,
          android_id: result.device?.androidId,
          app_version: result.device?.appVersion,
          is_active: result.device?.isActive,
          last_seen_at: result.device?.lastSeenAt?.toISOString(),
          last_gps_at: result.device?.lastGpsAt?.toISOString(),
          created_at: result.device?.createdAt?.toISOString(),
          updated_at: result.device?.updatedAt?.toISOString(),
        },
      });
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error?.code || 'DEVICE_CREATE_FAILED',
          message: result.error?.message || 'Failed to create device',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Create device endpoint error', { error, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating device',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/devices - List devices
async function listDevices(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const search = req.query.search as string;
    const teamId = req.query.team_id as string;
    const isActive = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;

    const result = await DeviceService.listDevices({ page, limit, search, teamId, isActive });

    if (result.success) {
      return res.json({
        ok: true,
        devices: result.devices?.map(device => ({
          id: device.id,
          team_id: device.teamId,
          name: device.name,
          android_id: device.androidId,
          app_version: device.appVersion,
          is_active: device.isActive,
          last_seen_at: device.lastSeenAt?.toISOString(),
          last_gps_at: device.lastGpsAt?.toISOString(),
          created_at: device.createdAt?.toISOString(),
          updated_at: device.updatedAt?.toISOString(),
        })) || [],
        pagination: {
          page,
          limit,
          total: result.total || 0,
          pages: Math.ceil((result.total || 0) / limit),
        },
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: {
          code: result.error?.code || 'DEVICES_LIST_FAILED',
          message: result.error?.message || 'Failed to list devices',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('List devices endpoint error', { error, query: req.query });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while listing devices',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/devices/:id - Get device by ID
async function getDevice(req: Request, res: Response) {
  try {
    const deviceId = req.params.id;

    if (!deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_DEVICE_ID',
          message: 'Device ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.getDevice(deviceId);

    if (result.success) {
      return res.json({
        ok: true,
        device: {
          id: result.device?.id,
          team_id: result.device?.teamId,
          name: result.device?.name,
          android_id: result.device?.androidId,
          app_version: result.device?.appVersion,
          is_active: result.device?.isActive,
          last_seen_at: result.device?.lastSeenAt?.toISOString(),
          last_gps_at: result.device?.lastGpsAt?.toISOString(),
          created_at: result.device?.createdAt?.toISOString(),
          updated_at: result.device?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'DEVICE_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'DEVICE_GET_FAILED',
          message: result.error?.message || 'Failed to get device',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Get device endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while getting device',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// PUT /api/v1/devices/:id - Update device
async function updateDevice(req: Request, res: Response) {
  try {
    const deviceId = req.params.id;
    const { name, androidId, appVersion, isActive } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_DEVICE_ID',
          message: 'Device ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.updateDevice(deviceId, {
      name: name?.trim(),
      androidId: androidId?.trim(),
      appVersion: appVersion?.trim(),
      isActive,
    });

    if (result.success) {
      return res.json({
        ok: true,
        device: {
          id: result.device?.id,
          team_id: result.device?.teamId,
          name: result.device?.name,
          android_id: result.device?.androidId,
          app_version: result.device?.appVersion,
          is_active: result.device?.isActive,
          last_seen_at: result.device?.lastSeenAt?.toISOString(),
          last_gps_at: result.device?.lastGpsAt?.toISOString(),
          created_at: result.device?.createdAt?.toISOString(),
          updated_at: result.device?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'DEVICE_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'DEVICE_UPDATE_FAILED',
          message: result.error?.message || 'Failed to update device',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Update device endpoint error', { error, params: req.params, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating device',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// DELETE /api/v1/devices/:id - Delete device (soft delete)
async function deleteDevice(req: Request, res: Response) {
  try {
    const deviceId = req.params.id;

    if (!deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_DEVICE_ID',
          message: 'Device ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.deleteDevice(deviceId);

    if (result.success) {
      return res.json({
        ok: true,
        message: 'Device deactivated successfully',
      });
    } else {
      const statusCode = result.error?.code === 'DEVICE_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'DEVICE_DELETE_FAILED',
          message: result.error?.message || 'Failed to delete device',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Delete device endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting device',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// ================== SUPERVISOR PIN MANAGEMENT ENDPOINTS ==================

// POST /api/v1/supervisor/pins - Create new supervisor PIN
async function createSupervisorPin(req: Request, res: Response) {
  try {
    const { teamId, name, pin } = req.body;

    if (!teamId || !name || !pin) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'teamId, name, and pin are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await SupervisorPinService.createSupervisorPin({
      teamId,
      name: name.trim(),
      pin,
    });

    if (result.success) {
      return res.status(201).json({
        ok: true,
        supervisor_pin: {
          id: result.supervisorPin?.id,
          team_id: result.supervisorPin?.teamId,
          name: result.supervisorPin?.name,
          is_active: result.supervisorPin?.isActive,
          created_at: result.supervisorPin?.createdAt?.toISOString(),
          updated_at: result.supervisorPin?.updatedAt?.toISOString(),
        },
      });
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error?.code || 'SUPERVISOR_PIN_CREATE_FAILED',
          message: result.error?.message || 'Failed to create supervisor PIN',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Create supervisor PIN endpoint error', { error, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating supervisor PIN',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/supervisor/pins - List supervisor PINs
async function listSupervisorPins(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const search = req.query.search as string;
    const teamId = req.query.team_id as string;
    const isActive = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;

    const result = await SupervisorPinService.listSupervisorPins({ page, limit, search, teamId, isActive });

    if (result.success) {
      return res.json({
        ok: true,
        supervisor_pins: result.supervisorPins?.map(pin => ({
          id: pin.id,
          team_id: pin.teamId,
          name: pin.name,
          is_active: pin.isActive,
          created_at: pin.createdAt?.toISOString(),
          updated_at: pin.updatedAt?.toISOString(),
        })) || [],
        pagination: {
          page,
          limit,
          total: result.total || 0,
          pages: Math.ceil((result.total || 0) / limit),
        },
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: {
          code: result.error?.code || 'SUPERVISOR_PINS_LIST_FAILED',
          message: result.error?.message || 'Failed to list supervisor PINs',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('List supervisor PINs endpoint error', { error, query: req.query });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while listing supervisor PINs',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/supervisor/pins/:id - Get supervisor PIN by ID
async function getSupervisorPin(req: Request, res: Response) {
  try {
    const supervisorPinId = req.params.id;

    if (!supervisorPinId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_SUPERVISOR_PIN_ID',
          message: 'Supervisor PIN ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await SupervisorPinService.getSupervisorPin(supervisorPinId);

    if (result.success) {
      return res.json({
        ok: true,
        supervisor_pin: {
          id: result.supervisorPin?.id,
          team_id: result.supervisorPin?.teamId,
          name: result.supervisorPin?.name,
          is_active: result.supervisorPin?.isActive,
          created_at: result.supervisorPin?.createdAt?.toISOString(),
          updated_at: result.supervisorPin?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'SUPERVISOR_PIN_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'SUPERVISOR_PIN_GET_FAILED',
          message: result.error?.message || 'Failed to get supervisor PIN',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Get supervisor PIN endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while getting supervisor PIN',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// PUT /api/v1/supervisor/pins/:id - Update supervisor PIN
async function updateSupervisorPin(req: Request, res: Response) {
  try {
    const supervisorPinId = req.params.id;
    const { name, pin, isActive } = req.body;

    if (!supervisorPinId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_SUPERVISOR_PIN_ID',
          message: 'Supervisor PIN ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await SupervisorPinService.updateSupervisorPin(supervisorPinId, {
      name: name?.trim(),
      pin,
      isActive,
    });

    if (result.success) {
      return res.json({
        ok: true,
        supervisor_pin: {
          id: result.supervisorPin?.id,
          team_id: result.supervisorPin?.teamId,
          name: result.supervisorPin?.name,
          is_active: result.supervisorPin?.isActive,
          created_at: result.supervisorPin?.createdAt?.toISOString(),
          updated_at: result.supervisorPin?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'SUPERVISOR_PIN_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'SUPERVISOR_PIN_UPDATE_FAILED',
          message: result.error?.message || 'Failed to update supervisor PIN',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Update supervisor PIN endpoint error', { error, params: req.params, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating supervisor PIN',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// DELETE /api/v1/supervisor/pins/:id - Delete supervisor PIN (soft delete)
async function deleteSupervisorPin(req: Request, res: Response) {
  try {
    const supervisorPinId = req.params.id;

    if (!supervisorPinId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_SUPERVISOR_PIN_ID',
          message: 'Supervisor PIN ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await SupervisorPinService.deleteSupervisorPin(supervisorPinId);

    if (result.success) {
      return res.json({
        ok: true,
        message: 'Supervisor PIN deactivated successfully',
      });
    } else {
      const statusCode = result.error?.code === 'SUPERVISOR_PIN_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'SUPERVISOR_PIN_DELETE_FAILED',
          message: result.error?.message || 'Failed to delete supervisor PIN',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Delete supervisor PIN endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting supervisor PIN',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// POST /api/v1/supervisor/pins/:teamId/rotate - Rotate supervisor PIN for team
async function rotateSupervisorPin(req: Request, res: Response) {
  try {
    const teamId = req.params.teamId;
    const { pin, name } = req.body;

    if (!teamId || !pin) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'teamId and pin are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await SupervisorPinService.rotateSupervisorPin(teamId, pin, name?.trim());

    if (result.success) {
      return res.status(201).json({
        ok: true,
        supervisor_pin: {
          id: result.supervisorPin?.id,
          team_id: result.supervisorPin?.teamId,
          name: result.supervisorPin?.name,
          is_active: result.supervisorPin?.isActive,
          created_at: result.supervisorPin?.createdAt?.toISOString(),
          updated_at: result.supervisorPin?.updatedAt?.toISOString(),
        },
        message: 'Supervisor PIN rotated successfully',
      });
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: result.error?.code || 'SUPERVISOR_PIN_ROTATE_FAILED',
          message: result.error?.message || 'Failed to rotate supervisor PIN',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Rotate supervisor PIN endpoint error', { error, params: req.params, body: req.body });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while rotating supervisor PIN',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// GET /api/v1/supervisor/pins/:teamId/active - Get active supervisor PIN for team
async function getActiveSupervisorPin(req: Request, res: Response) {
  try {
    const teamId = req.params.teamId;

    if (!teamId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_TEAM_ID',
          message: 'Team ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await SupervisorPinService.getActiveSupervisorPin(teamId);

    if (result.success) {
      return res.json({
        ok: true,
        supervisor_pin: {
          id: result.supervisorPin?.id,
          team_id: result.supervisorPin?.teamId,
          name: result.supervisorPin?.name,
          is_active: result.supervisorPin?.isActive,
          created_at: result.supervisorPin?.createdAt?.toISOString(),
          updated_at: result.supervisorPin?.updatedAt?.toISOString(),
        },
      });
    } else {
      const statusCode = result.error?.code === 'ACTIVE_SUPERVISOR_PIN_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json({
        ok: false,
        error: {
          code: result.error?.code || 'ACTIVE_SUPERVISOR_PIN_GET_FAILED',
          message: result.error?.message || 'Failed to get active supervisor PIN',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  } catch (error) {
    logger.error('Get active supervisor PIN endpoint error', { error, params: req.params });
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while getting active supervisor PIN',
        request_id: req.headers['x-request-id'],
      },
    });
  }
}

// Real API endpoint router
export function apiRouter(req: Request, res: Response, next: NextFunction) {
  const { method, originalUrl } = req;

  logger.info('Real API route requested', {
    method,
    url: originalUrl,
    requestId: req.headers['x-request-id'],
  });

  // Team management routes
  if (method === 'POST' && originalUrl === '/api/v1/teams') {
    return withAuthAndPermission(Resource.TEAMS, Action.CREATE)(req, res, next, () => createTeam(req, res));
  }

  if (method === 'GET' && originalUrl === '/api/v1/teams') {
    return withAuthAndPermission(Resource.TEAMS, Action.LIST)(req, res, next, () => listTeams(req, res));
  }

  if (method === 'GET' && originalUrl.startsWith('/api/v1/teams/') && req.params.id && !originalUrl.includes('/users') && !originalUrl.includes('/devices')) {
    return withAuthAndPermission(Resource.TEAMS, Action.READ)(req, res, next, () => getTeam(req, res));
  }

  if (method === 'PUT' && originalUrl.startsWith('/api/v1/teams/') && req.params.id) {
    return withAuthAndPermission(Resource.TEAMS, Action.UPDATE)(req, res, next, () => updateTeam(req, res));
  }

  if (method === 'DELETE' && originalUrl.startsWith('/api/v1/teams/') && req.params.id) {
    return withAuthAndPermission(Resource.TEAMS, Action.DELETE)(req, res, next, () => deleteTeam(req, res));
  }

  // Device management routes
  if (method === 'POST' && originalUrl === '/api/v1/devices') {
    return withAuthAndPermission(Resource.DEVICES, Action.CREATE)(req, res, next, () => createDevice(req, res));
  }

  if (method === 'GET' && originalUrl === '/api/v1/devices') {
    return withAuthAndPermission(Resource.DEVICES, Action.LIST)(req, res, next, () => listDevices(req, res));
  }

  if (method === 'GET' && originalUrl.startsWith('/api/v1/devices/') && req.params.id) {
    return withAuthAndPermission(Resource.DEVICES, Action.READ)(req, res, next, () => getDevice(req, res));
  }

  if (method === 'PUT' && originalUrl.startsWith('/api/v1/devices/') && req.params.id) {
    return withAuthAndPermission(Resource.DEVICES, Action.UPDATE)(req, res, next, () => updateDevice(req, res));
  }

  if (method === 'DELETE' && originalUrl.startsWith('/api/v1/devices/') && req.params.id) {
    return withAuthAndPermission(Resource.DEVICES, Action.DELETE)(req, res, next, () => deleteDevice(req, res));
  }

  // User management routes
  if (method === 'POST' && originalUrl === '/api/v1/users') {
    return withAuthAndPermission(Resource.USERS, Action.CREATE)(req, res, next, () => createUser(req, res));
  }

  if (method === 'GET' && originalUrl === '/api/v1/users') {
    return withAuthAndPermission(Resource.USERS, Action.LIST)(req, res, next, () => listUsers(req, res));
  }

  if (method === 'GET' && originalUrl.startsWith('/api/v1/users/') && req.params.id) {
    return withAuthAndPermission(Resource.USERS, Action.READ)(req, res, next, () => getUser(req, res));
  }

  if (method === 'PUT' && originalUrl.startsWith('/api/v1/users/') && req.params.id) {
    return withAuthAndPermission(Resource.USERS, Action.UPDATE)(req, res, next, () => updateUser(req, res));
  }

  if (method === 'DELETE' && originalUrl.startsWith('/api/v1/users/') && req.params.id) {
    return withAuthAndPermission(Resource.USERS, Action.DELETE)(req, res, next, () => deleteUser(req, res));
  }

  // Auth routes
  if (method === 'POST' && originalUrl === '/api/v1/auth/login') {
    return login(req, res);
  }

  if (method === 'POST' && originalUrl === '/api/v1/auth/logout') {
    return authenticateToken(req as AuthenticatedRequest, res, () => logout(req, res));
  }

  if (method === 'POST' && originalUrl === '/api/v1/auth/refresh') {
    return refreshToken(req, res);
  }

  if (method === 'GET' && originalUrl === '/api/v1/auth/whoami') {
    return authenticateToken(req as AuthenticatedRequest, res, () => whoami(req, res));
  }

  if (method === 'POST' && originalUrl === '/api/v1/auth/session/end') {
    return authenticateToken(req as AuthenticatedRequest, res, () => endSession(req, res));
  }

  // Supervisor PIN management routes
  if (method === 'POST' && originalUrl === '/api/v1/supervisor/pins') {
    return withAuthAndRole([UserRole.ADMIN])(req, res, next, () => createSupervisorPin(req, res));
  }

  if (method === 'GET' && originalUrl === '/api/v1/supervisor/pins') {
    return withAuthAndRole([UserRole.ADMIN, UserRole.SUPERVISOR])(req, res, next, () => listSupervisorPins(req, res));
  }

  if (method === 'GET' && originalUrl.startsWith('/api/v1/supervisor/pins/') && req.params.id && !originalUrl.includes('/rotate') && !originalUrl.includes('/active')) {
    return withAuthAndRole([UserRole.ADMIN, UserRole.SUPERVISOR])(req, res, next, () => getSupervisorPin(req, res));
  }

  if (method === 'PUT' && originalUrl.startsWith('/api/v1/supervisor/pins/') && req.params.id) {
    return withAuthAndRole([UserRole.ADMIN])(req, res, next, () => updateSupervisorPin(req, res));
  }

  if (method === 'DELETE' && originalUrl.startsWith('/api/v1/supervisor/pins/') && req.params.id) {
    return withAuthAndRole([UserRole.ADMIN])(req, res, next, () => deleteSupervisorPin(req, res));
  }

  if (method === 'POST' && originalUrl.startsWith('/api/v1/supervisor/pins/') && originalUrl.endsWith('/rotate')) {
    return withAuthAndRole([UserRole.ADMIN])(req, res, next, () => rotateSupervisorPin(req, res));
  }

  if (method === 'GET' && originalUrl.startsWith('/api/v1/supervisor/pins/') && originalUrl.endsWith('/active')) {
    return withAuthAndRole([UserRole.ADMIN, UserRole.SUPERVISOR])(req, res, next, () => getActiveSupervisorPin(req, res));
  }

  // Supervisor override routes
  if (method === 'POST' && originalUrl === '/api/v1/supervisor/override/login') {
    return supervisorOverride(req, res);
  }

  // Policy routes
  if (method === 'GET' && originalUrl.startsWith('/api/v1/policy/')) {
    return getPolicy(req, res);
  }

  // Telemetry routes
  if (method === 'POST' && originalUrl === '/api/v1/telemetry') {
    return telemetry(req, res);
  }

  // If no route matches, pass to next handler
  next();
}