import { Router } from 'express';
import { AuthService } from '../../services/auth-service';
import { logger } from '../../lib/logger';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

// POST /api/v1/auth/login - Mobile device login
router.post('/login', async (req, res) => {
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

    const ipAddress = Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || 'Unknown';
    const userAgent = Array.isArray(req.headers['user-agent'])
      ? req.headers['user-agent'][0]
      : (req.headers['user-agent'] as string) || 'Unknown';

    logger.info('mobile_login_attempt', {
      deviceId,
      userCode,
      userAgent,
      ipAddress,
      timestamp: new Date(),
    });

    const result = await AuthService.login(
      { deviceId, userCode, pin },
      ipAddress,
      userAgent
    );

    if (!result.success) {
      logger.warn('mobile_login_failed', {
        deviceId,
        userCode,
        reason: result.error?.code,
        userAgent,
        ipAddress,
      });

      let statusCode = 401;
      if (result.error?.code === 'RATE_LIMITED') {
        statusCode = 429;
      } else if (result.error?.code === 'APP_ACCESS_DENIED') {
        statusCode = 403;
      }

      return res.status(statusCode).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('mobile_login_success', {
      sessionId: result.session?.sessionId,
      userId: result.session?.userId,
      deviceId,
      userAgent,
      ipAddress,
    });

    return res.json({
      ok: true,
      session: {
        session_id: result.session?.sessionId,
        user_id: result.session?.userId,
        device_id: result.session?.deviceId,
        started_at: result.session?.startedAt,
        expires_at: result.session?.expiresAt,
        override_until: result.session?.overrideUntil,
      },
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      policy_version: result.policyVersion,
    });

  } catch (error: any) {
    logger.error('mobile_login_endpoint_error', {
      error: error.message,
      stack: error.stack,
      deviceId: req.body?.deviceId,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during login',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// POST /api/v1/auth/logout - End current session
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Extract session ID from token
    const token = req.headers.authorization || '';
    const sessionResult = await AuthService.whoami(token);

    if (!sessionResult.success) {
      return res.status(401).json({
        ok: false,
        error: sessionResult.error,
      });
    }

    const result = await AuthService.logout(sessionResult.session?.sessionId || '');

    if (!result.success) {
      return res.status(401).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('mobile_logout_success', {
      sessionId: sessionResult.session?.sessionId,
      userId: sessionResult.user?.id,
    });

    return res.json({
      ok: true,
      message: 'Logged out successfully',
      ended_at: result.endedAt?.toISOString(),
    });

  } catch (error: any) {
    logger.error('mobile_logout_endpoint_error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during logout',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', async (req: AuthenticatedRequest, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await AuthService.refreshToken(refresh_token);

    if (!result.success) {
      return res.status(401).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      access_token: result.accessToken,
      expires_at: result.expiresAt,
    });

  } catch (error: any) {
    logger.error('mobile_refresh_endpoint_error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during token refresh',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// GET /api/v1/auth/whoami - Get current user info
router.get('/whoami', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await AuthService.whoami(req.headers.authorization || '');

    if (!result.success) {
      return res.status(401).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      user: {
        id: result.user?.id,
        code: result.user?.code,
        team_id: result.user?.teamId,
        display_name: result.user?.displayName,
      },
      session: {
        session_id: result.session?.sessionId,
        device_id: result.session?.deviceId,
        expires_at: result.session?.expiresAt,
        override_until: result.session?.overrideUntil,
      },
      policy_version: result.policyVersion,
    });

  } catch (error: any) {
    logger.error('mobile_whoami_endpoint_error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// POST /api/v1/auth/session/end - Force end current session
router.post('/session/end', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Extract session ID from token
    const token = req.headers.authorization || '';
    const sessionResult = await AuthService.whoami(token);

    if (!sessionResult.success) {
      return res.status(401).json({
        ok: false,
        error: sessionResult.error,
      });
    }

    const result = await AuthService.endSession(sessionResult.session?.sessionId || '');

    if (!result.success) {
      return res.status(401).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('mobile_session_ended', {
      sessionId: sessionResult.session?.sessionId,
      userId: sessionResult.user?.id,
    });

    return res.json({
      ok: true,
      message: 'Session ended successfully',
    });

  } catch (error: any) {
    logger.error('mobile_end_session_endpoint_error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// POST /api/v1/auth/heartbeat - Send heartbeat
router.post('/heartbeat', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { deviceId, ts, battery } = req.body;

    if (!deviceId || !ts) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'deviceId and timestamp are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    // TODO: Update device last seen and record heartbeat telemetry
    logger.info('mobile_heartbeat', {
      deviceId,
      timestamp: ts,
      battery,
      userId: (req as any).user?.id,
    });

    return res.json({
      ok: true,
      message: 'Heartbeat received',
    });

  } catch (error: any) {
    logger.error('mobile_heartbeat_endpoint_error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

export default router;
