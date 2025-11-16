import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../services/rate-limiter';
import { logger } from '../lib/logger';
import { env } from '../lib/config';

/**
 * Enhanced Security Headers Middleware
 * Adds comprehensive security headers beyond helmet defaults
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Additional security headers beyond helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: https:; font-src \'self\'; connect-src \'self\'');

  // Cache control for API endpoints
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Content Security Policy for development
  if (env.NODE_ENV === 'development') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  }

  next();
};

/**
 * Rate Limiting Middleware Factory
 * Creates rate limiting middleware for different endpoints
 */
export const rateLimitMiddleware = (
  keyGenerator: (req: Request) => string,
  options: {
    limit?: number;
    windowMs?: number;
    message?: string;
  } = {}
) => {
  const {
    limit = env.RATE_LIMIT_MAX_REQUESTS,
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    message = 'Too many requests, please try again later.'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const result = await RateLimiter.checkLimit(key, limit, windowMs);

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          key,
          limit,
          windowMs,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.headers['x-request-id'],
          path: req.path
        });

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter.toString());
        }

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter: result.retryAfter
          }
        });
      }

      // Add rate limit headers to successful responses
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      next();
    } catch (error) {
      logger.error('Rate limiting error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        requestId: req.headers['x-request-id']
      });

      // Fail open - allow request if rate limiting fails
      next();
    }
  };
};

/**
 * Login Rate Limiting Middleware
 * Specialized rate limiting for login endpoints
 */
export const loginRateLimit = rateLimitMiddleware(
  (req: Request) => `login:${req.ip}:${req.body?.deviceId || 'unknown'}`,
  {
    limit: env.NODE_ENV === 'test' ? 15 : env.LOGIN_RATE_LIMIT_MAX,
    windowMs: env.NODE_ENV === 'test' ? 2 * 1000 : 15 * 60 * 1000, // 2 seconds for tests, 15 minutes for production
    message: 'Too many login attempts. Please try again later.'
  }
);

/**
 * PIN Rate Limiting Middleware
 * Specialized rate limiting for PIN verification endpoints
 */
export const pinRateLimit = rateLimitMiddleware(
  (req: Request) => `pin:${req.ip}:${req.body?.userId || 'unknown'}`,
  {
    limit: env.NODE_ENV === 'test' ? 5 : env.PIN_RATE_LIMIT_MAX,
    windowMs: env.NODE_ENV === 'test' ? 2 * 1000 : 15 * 60 * 1000,
    message: 'Too many PIN attempts. Please try again later.'
  }
);

/**
 * Telemetry Rate Limiting Middleware
 * Specialized rate limiting for telemetry endpoints
 */
export const telemetryRateLimit = rateLimitMiddleware(
  (req: Request) => `telemetry:${req.ip}:${req.body?.deviceId || 'unknown'}`,
  {
    limit: 1000,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many telemetry submissions. Please reduce frequency.'
  }
);

/**
 * API Rate Limiting Middleware
 * General rate limiting for API endpoints
 */
export const apiRateLimit = rateLimitMiddleware(
  (req: Request) => `api:${req.ip}:${req.path}`,
  {
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    message: 'API rate limit exceeded. Please reduce request frequency.'
  }
);

/**
 * Request Size Limiting Middleware
 * Prevents overly large requests
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: `Request entity too large. Maximum size is ${maxSize / 1024 / 1024}MB.`
      }
    });
  }

  next();
};

/**
 * IP Blocking Middleware (Optional)
 * Blocks requests from suspicious IP ranges
 */
export const ipBlocker = (blockedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    if (blockedIPs.includes(clientIP)) {
      logger.warn('Blocked IP attempt', {
        ip: clientIP,
        path: req.path,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id']
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'IP_BLOCKED',
          message: 'Access denied from this IP address.'
        }
      });
    }

    next();
  };
};

/**
 * User Agent Filtering Middleware
 * Blocks requests from suspicious user agents
 */
export const userAgentFilter = (blockedPatterns: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';

    for (const pattern of blockedPatterns) {
      if (userAgent.includes(pattern)) {
        logger.warn('Blocked user agent attempt', {
          userAgent,
          ip: req.ip,
          path: req.path,
          requestId: req.headers['x-request-id']
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'USER_AGENT_BLOCKED',
            message: 'Access denied from this user agent.'
          }
        });
      }
    }

    next();
  };
};

/**
 * Request Timeout Middleware
 * Sets timeout for requests and handles slow requests
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          path: req.path,
          method: req.method,
          ip: req.ip,
          timeoutMs,
          requestId: req.headers['x-request-id']
        });

        return res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out. Please try again.'
          }
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};