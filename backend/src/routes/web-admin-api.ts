import { Request, Response, NextFunction } from 'express';
import { WebAdminAuthService, VALID_WEB_ADMIN_ROLES } from '../services/web-admin-auth-service';
import { JWTUtils } from '../lib/crypto';
import { logger } from '../lib/logger';

const webAdminAuthService = new WebAdminAuthService();

// Web Admin Authentication Routes
export function webAdminApiRouter(req: Request, res: Response, next: NextFunction) {
  const { method, originalUrl } = req;

  logger.info('Web Admin API route requested', {
    method,
    url: originalUrl,
    requestId: req.headers['x-request-id'],
  });

  // Web Admin Login
  if (method === 'POST' && originalUrl === '/api/web-admin/auth/login') {
    return webAdminLogin(req, res);
  }

  // Web Admin Who Am I
  if (method === 'GET' && originalUrl === '/api/web-admin/auth/whoami') {
    return webAdminWhoAmI(req, res);
  }

  // Web Admin Logout
  if (method === 'POST' && originalUrl === '/api/web-admin/auth/logout') {
    return webAdminLogout(req, res);
  }

  // Web Admin Refresh Token
  if (method === 'POST' && originalUrl === '/api/web-admin/auth/refresh') {
    return webAdminRefresh(req, res);
  }

  // Create Web Admin User (for initial setup)
  if (method === 'POST' && originalUrl === '/api/web-admin/auth/create-admin') {
    return createWebAdmin(req, res);
  }

  // If no route matches, pass to next handler
  next();
}

async function webAdminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown';

    logger.info('web_admin_login_attempt', {
      email,
      userAgent,
      ipAddress,
      timestamp: new Date()
    });

    const result = await webAdminAuthService.login({ email, password });

    if (!result.success) {
      logger.warn('web_admin_login_failed', {
        email,
        reason: result.error?.code,
        userAgent,
        ipAddress
      });

      return res.status(401).json({
        ok: false,
        error: result.error
      });
    }

    // Set HTTP-only cookies for tokens
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 20 * 60 // 20 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60 // 12 hours
    });

    res.cookie('auth_type', 'web_admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60 // 12 hours
    });

    logger.info('web_admin_login_success', {
      adminId: result.user?.id,
      email: result.user?.email,
      role: result.user?.role,
      userAgent,
      ipAddress
    });

    return res.json({
      ok: true,
      user: result.user,
      message: 'Login successful'
    });

  } catch (error: any) {
    logger.error('web_admin_login_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during login'
      }
    });
  }
}

async function webAdminWhoAmI(req: Request, res: Response) {
  try {
    const accessToken = req.headers['authorization']?.replace('Bearer ', '') || req.cookies?.access_token;

    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No access token provided'
        }
      });
    }

    // Verify JWT token and extract user ID
    const decoded = JWTUtils.verifyAccessToken(accessToken);
    if (!decoded.success) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    // Check if this is a web admin token
    if (decoded.payload.type !== 'web_admin') {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type for web admin authentication'
        }
      });
    }

    const result = await webAdminAuthService.whoami(decoded.payload.sub);

    if (!result.success) {
      return res.status(401).json({
        ok: false,
        error: result.error
      });
    }

    return res.json({
      ok: true,
      user: result.user
    });

  } catch (error: any) {
    logger.error('web_admin_whoami_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      }
    });
  }
}

async function webAdminLogout(req: Request, res: Response) {
  try {
    const accessToken = req.headers['authorization']?.replace('Bearer ', '') || req.cookies?.access_token;

    if (accessToken) {
      const decoded = JWTUtils.verifyAccessToken(accessToken);
      if (decoded.success) {
        logger.info('web_admin_logout', {
          adminId: decoded.payload.sub,
          timestamp: new Date()
        });
      }
    }

    // Clear cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.clearCookie('auth_type', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return res.json({
      ok: true,
      message: 'Logout successful'
    });

  } catch (error: any) {
    logger.error('web_admin_logout_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during logout'
      }
    });
  }
}

async function webAdminRefresh(req: Request, res: Response) {
  try {
    const refreshToken = req.headers['authorization']?.replace('Bearer ', '') || req.cookies?.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No refresh token provided'
        }
      });
    }

    // Verify refresh token
    const decoded = JWTUtils.verifyRefreshToken(refreshToken);
    if (!decoded.success || decoded.payload.user_type !== 'web_admin') {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }

    // Get user information
    const whoamiResult = await webAdminAuthService.whoami(decoded.payload.sub);
    if (!whoamiResult.success) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        }
      });
    }

    // Generate new access token
    const newAccessToken = JWTUtils.signAccessToken({
      sub: decoded.payload.sub,
      email: whoamiResult.user!.email,
      role: whoamiResult.user!.role,
      type: 'web_admin'
    });

    return res.json({
      ok: true,
      accessToken: newAccessToken,
      user: whoamiResult.user
    });

  } catch (error: any) {
    logger.error('web_admin_refresh_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during token refresh'
      }
    });
  }
}

async function createWebAdmin(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, first name, and last name are required'
        }
      });
    }

    // Validate role if provided
    if (role && !VALID_WEB_ADMIN_ROLES.includes(role)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ROLE',
          message: `Invalid role. Valid web admin roles are: ${VALID_WEB_ADMIN_ROLES.join(', ')}`
        }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long'
        }
      });
    }

    const result = await webAdminAuthService.createWebAdminUser({
      email,
      password,
      firstName,
      lastName,
      role
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'CREATION_FAILED',
          message: result.error || 'Failed to create admin user'
        }
      });
    }

    logger.info('web_admin_user_created_via_api', {
      adminId: result.user?.id,
      email: result.user?.email,
      role: result.user?.role
    });

    return res.json({
      ok: true,
      user: result.user,
      message: 'Admin user created successfully'
    });

  } catch (error: any) {
    logger.error('web_admin_create_admin_endpoint_error', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred while creating admin user'
      }
    });
  }
}