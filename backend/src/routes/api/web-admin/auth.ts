import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WebAdminAuthService } from '../../services/web-admin-auth-service';
import { JWTUtils } from '../../lib/crypto';
import { logger } from '../../lib/logger';

const router = new Hono();
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

/**
 * POST /api/web-admin/auth/login
 * Web Admin login endpoint
 */
router.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const credentials = c.req.valid('json');
    const userAgent = c.req.header('User-Agent') || 'Unknown';
    const ipAddress = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'Unknown';

    logger.info('web_admin_login_attempt', {
      email: credentials.email,
      userAgent,
      ipAddress,
      timestamp: new Date()
    });

    const result = await webAdminAuthService.login(credentials);

    if (!result.success) {
      logger.warn('web_admin_login_failed', {
        email: credentials.email,
        reason: result.error?.code,
        userAgent,
        ipAddress
      });

      return c.json({
        ok: false,
        error: result.error
      }, 401);
    }

    // Set HTTP-only cookies for tokens
    c.header('Set-Cookie', [
      `access_token=${result.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1200`, // 20 minutes
      `refresh_token=${result.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`, // 12 hours
      `auth_type=web_admin; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`
    ]);

    logger.info('web_admin_login_success', {
      adminId: result.user?.id,
      email: result.user?.email,
      role: result.user?.role,
      userAgent,
      ipAddress
    });

    return c.json({
      ok: true,
      user: result.user,
      message: 'Login successful'
    });

  } catch (error: any) {
    logger.error('web_admin_login_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return c.json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during login'
      }
    }, 500);
  }
});

/**
 * GET /api/web-admin/auth/whoami
 * Get current web admin user information
 */
router.get('/whoami', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.replace('Bearer ', '');
    const authType = c.req.header('Cookie')?.includes('auth_type=web_admin');

    if (!accessToken) {
      return c.json({
        ok: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No access token provided'
        }
      }, 401);
    }

    // Verify JWT token and extract user ID
    const decoded = JWTUtils.verifyAccessToken(accessToken);
    if (!decoded.success) {
      return c.json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      }, 401);
    }

    // Check if this is a web admin token
    if (decoded.payload.type !== 'web_admin') {
      return c.json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type for web admin authentication'
        }
      }, 401);
    }

    const result = await webAdminAuthService.whoami(decoded.payload.sub);

    if (!result.success) {
      return c.json({
        ok: false,
        error: result.error
      }, 401);
    }

    return c.json({
      ok: true,
      user: result.user
    });

  } catch (error: any) {
    logger.error('web_admin_whoami_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return c.json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      }
    }, 500);
  }
});

/**
 * POST /api/web-admin/auth/logout
 * Web Admin logout endpoint
 */
router.post('/logout', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.replace('Bearer ', '');

    if (accessToken) {
      const decoded = JWTUtils.verifyAccessToken(accessToken);
      if (decoded.success) {
        // TODO: Implement token revocation/blacklisting if needed
        logger.info('web_admin_logout', {
          adminId: decoded.payload.sub,
          timestamp: new Date()
        });
      }
    }

    // Clear cookies
    c.header('Set-Cookie', [
      'access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      'auth_type=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    ]);

    return c.json({
      ok: true,
      message: 'Logout successful'
    });

  } catch (error: any) {
    logger.error('web_admin_logout_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return c.json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during logout'
      }
    }, 500);
  }
});

/**
 * POST /api/web-admin/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (c) => {
  try {
    const refreshToken = c.req.header('Authorization')?.replace('Bearer ', '') ||
                        c.req.cookie('refresh_token');

    if (!refreshToken) {
      return c.json({
        ok: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token provided'
        }
      }, 401);
    }

    // Verify refresh token
    const decoded = JWTUtils.verifyRefreshToken(refreshToken);
    if (!decoded.success || decoded.payload.user_type !== 'web_admin') {
      return c.json({
        ok: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      }, 401);
    }

    // Get user information
    const whoamiResult = await webAdminAuthService.whoami(decoded.payload.sub);
    if (!whoamiResult.success) {
      return c.json({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        }
      }, 401);
    }

    // Generate new access token
    const newAccessToken = JWTUtils.signAccessToken({
      sub: decoded.payload.sub,
      email: whoamiResult.user!.email,
      role: whoamiResult.user!.role,
      type: 'web_admin'
    });

    return c.json({
      ok: true,
      accessToken: newAccessToken,
      user: whoamiResult.user
    });

  } catch (error: any) {
    logger.error('web_admin_refresh_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return c.json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during token refresh'
      }
    }, 500);
  }
});

/**
 * POST /api/web-admin/auth/create-admin
 * Create a new web admin user (for initial setup or super admin)
 */
router.post('/create-admin', zValidator('json', createAdminSchema), async (c) => {
  try {
    // TODO: Add proper authorization check - only existing admins should be able to create new admins
    // For now, this endpoint should be restricted or used only during initial setup

    const userData = c.req.valid('json');
    const result = await webAdminAuthService.createWebAdminUser(userData);

    if (!result.success) {
      return c.json({
        ok: false,
        error: {
          code: 'CREATION_FAILED',
          message: result.error || 'Failed to create admin user'
        }
      }, 400);
    }

    logger.info('web_admin_user_created_via_api', {
      adminId: result.user?.id,
      email: result.user?.email,
      role: result.user?.role
    });

    return c.json({
      ok: true,
      user: result.user,
      message: 'Admin user created successfully'
    });

  } catch (error: any) {
    logger.error('web_admin_create_admin_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return c.json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred while creating admin user'
      }
    }, 500);
  }
});

export default router;