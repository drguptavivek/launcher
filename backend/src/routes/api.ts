import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { PolicyService } from '../services/policy-service';
import { TelemetryService } from '../services/telemetry-service';
import { logger } from '../lib/logger';

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

// Real API endpoint router
export function apiRouter(req: Request, res: Response, next: NextFunction) {
  const { method, originalUrl } = req;

  logger.info('Real API route requested', {
    method,
    url: originalUrl,
    requestId: req.headers['x-request-id'],
  });

  // Auth routes
  if (method === 'POST' && originalUrl === '/api/v1/auth/login') {
    return login(req, res);
  }

  if (method === 'POST' && originalUrl === '/api/v1/auth/logout') {
    return requireAuth(req, res, () => logout(req, res));
  }

  if (method === 'POST' && originalUrl === '/api/v1/auth/refresh') {
    return refreshToken(req, res);
  }

  if (method === 'GET' && originalUrl === '/api/v1/auth/whoami') {
    return requireAuth(req, res, () => whoami(req, res));
  }

  if (method === 'POST' && originalUrl === '/api/v1/auth/session/end') {
    return requireAuth(req, res, () => endSession(req, res));
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