import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WebAdminAuthService } from '../../../services/web-admin-auth-service';
import { JWTService } from '../../../services/jwt-service';
import { logger } from '../../../lib/logger';

const router = Router();
const webAdminAuthService = new WebAdminAuthService();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const createAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.string().optional()
});

// Validation middleware
const validateRequest = (schema: z.ZodObject<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
      }
      next(error);
    }
  };
};

/**
 * POST /api/web-admin/auth/login
 * Web Admin login endpoint
 */
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    logger.info('web_admin_login_attempt', {
      email,
      userAgent,
      ipAddress,
      timestamp: new Date(),
    });

    const result = await webAdminAuthService.login(
      { email, password }
    );

    if (!result.success) {
      logger.warn('web_admin_login_failed', {
        email,
        reason: result.error?.code,
        userAgent,
        ipAddress,
      });

      const statusCode = result.error?.code === 'RATE_LIMITED' ? 429 : 401;
      return res.status(statusCode).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('web_admin_login_success', {
      email,
      adminId: result.user?.id,
      role: result.user?.role,
      userAgent,
      ipAddress,
    });

    return res.json({
      ok: true,
      user: result.user,
      token: result.accessToken,
      refreshToken: result.refreshToken,
    });

  } catch (error: any) {
    logger.error('web_admin_login_error', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
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

/**
 * GET /api/web-admin/auth/whoami
 * Get current web admin user information
 */
router.get('/whoami', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token required'
        }
      });
    }

    const decoded = await JWTService.verifyToken(token, 'access');
    if (!decoded.valid || !decoded.payload) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    const adminId = decoded.payload.sub as string;
    const result = await webAdminAuthService.whoami(adminId);

    if (!result.success) {
      return res.status(401).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      user: result.user,
    });

  } catch (error: any) {
    logger.error('web_admin_whoami_error', {
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

/**
 * POST /api/web-admin/auth/logout
 * Logout web admin user
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token required'
        }
      });
    }

    // For logout, we just verify the token and return success
    // In a real implementation, you might want to add the token to a blacklist
    const decoded = await JWTService.verifyToken(token, 'access');
    if (!decoded.valid || !decoded.payload) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    const result = {
      success: true,
      user: {
        id: decoded.payload.sub,
        email: (decoded.payload as any).email,
        role: (decoded.payload as any).role
      },
      loggedOutAt: new Date().toISOString()
    };

    logger.info('web_admin_logout_success', {
      adminId: result.user?.id,
      email: result.user?.email,
    });

    return res.json({
      ok: true,
      message: 'Logout successful',
      logged_out_at: result.loggedOutAt,
    });

  } catch (error: any) {
    logger.error('web_admin_logout_error', {
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

/**
 * POST /api/web-admin/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }

    const result = await JWTService.refreshToken(refreshToken);

    if (!result.valid) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: result.error || 'Invalid refresh token'
        }
      });
    }

    return res.json({
      ok: true,
      token: result.accessToken,
      refreshToken: refreshToken, // Return the same refresh token
    });

  } catch (error: any) {
    logger.error('web_admin_refresh_error', {
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

/**
 * POST /api/web-admin/auth/create-admin
 * Create a new web admin user (protected endpoint)
 */
router.post('/create-admin', validateRequest(createAdminSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown';

    logger.info('web_admin_creation_attempt', {
      email,
      firstName,
      lastName,
      role,
      ipAddress,
    });

    const result = await webAdminAuthService.createWebAdminUser({
      email,
      password,
      firstName,
      lastName,
      role: role || 'SYSTEM_ADMIN'
    });

    if (!result.success) {
      logger.warn('web_admin_creation_failed', {
        email,
        reason: result.error,
        ipAddress,
      });

      return res.status(400).json({
        ok: false,
        error: {
          code: 'CREATION_FAILED',
          message: result.error || 'Failed to create admin user'
        }
      });
    }

    logger.info('web_admin_creation_success', {
      email,
      adminId: result.user?.id,
      role: result.user?.role,
      ipAddress,
    });

    return res.status(201).json({
      ok: true,
      user: result.user,
      message: 'Admin user created successfully',
    });

  } catch (error: any) {
    logger.error('web_admin_creation_error', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
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