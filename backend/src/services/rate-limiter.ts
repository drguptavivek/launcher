import { logger } from '../lib/logger';
import { env } from '../lib/config';
import { generateJTI } from '../lib/crypto';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAttempt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * In-memory rate limiter with Redis-ready interface
 */
export class RateLimiter {
  private static storage = new Map<string, RateLimitEntry>();
  private static cleanupInterval: NodeJS.Timeout;

  static {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Check if a request is allowed based on rate limits
   */
  static async checkLimit(
    key: string,
    limit: number = env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: number = env.RATE_LIMIT_WINDOW_MS
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.storage.get(key);

    // Initialize or reset entry if window has passed
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        lastAttempt: now,
      };
      this.storage.set(key, entry);
    }

    // Check if limit is exceeded
    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      logger.warn('Rate limit exceeded', {
        key,
        limit,
        windowMs,
        currentCount: entry.count,
        retryAfter,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }

    // Increment counter
    entry.count++;
    entry.lastAttempt = now;

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Rate limit for login attempts (more restrictive)
   */
  static async checkLoginLimit(deviceId: string, ipAddress: string): Promise<RateLimitResult> {
    // Check both device-based and IP-based rate limits
    // Device-based rate limiting
    const deviceKey = `login:device:${deviceId}`;
    const deviceLimit = env.NODE_ENV === 'test' ? 15 : env.LOGIN_RATE_LIMIT_MAX;
    const deviceWindowMs = env.NODE_ENV === 'test' ? 2 * 1000 : 15 * 60 * 1000; // 2 seconds for tests, 15 minutes for production
    const deviceResult = await this.checkLimit(deviceKey, deviceLimit, deviceWindowMs);

    // IP-based rate limiting
    const ipKey = `login:ip:${ipAddress}`;
    const ipLimit = env.NODE_ENV === 'test' ? 15 : env.LOGIN_RATE_LIMIT_MAX;
    const ipWindowMs = env.NODE_ENV === 'test' ? 2 * 1000 : 15 * 60 * 1000; // 2 seconds for tests, 15 minutes for production
    const ipResult = await this.checkLimit(ipKey, ipLimit, ipWindowMs);

    // Return the more restrictive result
    if (!deviceResult.allowed && !ipResult.allowed) {
      return {
        allowed: false,
        remaining: Math.min(deviceResult.remaining, ipResult.remaining),
        resetTime: Math.min(deviceResult.resetTime, ipResult.resetTime),
        retryAfter: Math.min(deviceResult.retryAfter || 0, ipResult.retryAfter || 0) || undefined,
      };
    } else if (!deviceResult.allowed) {
      return deviceResult;
    } else if (!ipResult.allowed) {
      return ipResult;
    }

    // Both allowed - return minimum remaining
    return {
      allowed: true,
      remaining: Math.min(deviceResult.remaining, ipResult.remaining),
      resetTime: Math.min(deviceResult.resetTime, ipResult.resetTime),
    };
  }

  /**
   * Rate limit for PIN attempts (even more restrictive)
   */
  static async checkPinLimit(userId: string, deviceId: string): Promise<RateLimitResult> {
    const key = `pin:${userId}:${deviceId}`;
    const windowMs = env.NODE_ENV === 'test' ? 2 * 1000 : 15 * 60 * 1000; // 2 seconds for tests, 15 minutes for production
    return this.checkLimit(key, env.PIN_RATE_LIMIT_MAX, windowMs);
  }

  /**
   * Rate limit for supervisor PIN attempts
   */
  static async checkSupervisorPinLimit(ipAddress: string): Promise<RateLimitResult> {
    const key = `supervisor:${ipAddress}`;
    // Use lower limit during testing to ensure rate limiting is triggered
    const limit = env.NODE_ENV === 'test' ? 5 : 10;
    const windowMs = env.NODE_ENV === 'test' ? 2 * 1000 : 15 * 60 * 1000; // 2 seconds for tests, 15 minutes for production
    return this.checkLimit(key, limit, windowMs);
  }

  /**
   * Rate limit for telemetry submissions
   */
  static async checkTelemetryLimit(deviceId: string): Promise<RateLimitResult> {
    const key = `telemetry:${deviceId}`;
    return this.checkLimit(key, 1000, 60 * 1000); // 1000 requests per minute
  }

  /**
   * Reset rate limit for a specific key
   */
  static resetLimit(key: string): void {
    this.storage.delete(key);
    logger.info('Rate limit reset', { key });
  }

  /**
   * Get current rate limit status
   */
  static getStatus(key: string): RateLimitEntry | null {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }

    return { ...entry };
  }

  /**
   * Clean up expired entries
   */
  private static cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime <= now) {
        this.storage.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { cleaned, totalEntries: this.storage.size });
    }
  }

  /**
   * Get rate limit statistics
   */
  static getStats(): {
    totalEntries: number;
    activeWindows: number;
    memoryUsage: number;
  } {
    const now = Date.now();
    let activeWindows = 0;
    let memoryUsage = 0;

    for (const entry of this.storage.values()) {
      if (entry.resetTime > now) {
        activeWindows++;
      }
      memoryUsage += JSON.stringify(entry).length;
    }

    return {
      totalEntries: this.storage.size,
      activeWindows,
      memoryUsage,
    };
  }

  /**
   * Clear all rate limits (useful for tests)
   */
  static clearAll(): void {
    this.storage.clear();
    logger.info('All rate limits cleared');
  }

  /**
   * Shutdown the rate limiter
   */
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
    logger.info('Rate limiter shutdown');
  }
}

/**
 * PIN Lockout Service
 */
export class PinLockoutService {
  private static lockouts = new Map<string, { lockedUntil: number; attempts: number }>();

  /**
   * Check if a user is locked out
   */
  static isLockedOut(userId: string, deviceId: string): boolean {
    const key = `${userId}:${deviceId}`;
    const lockout = this.lockouts.get(key);

    if (!lockout) {
      return false;
    }

    const now = Date.now();
    if (lockout.lockedUntil <= now) {
      this.lockouts.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Record a failed PIN attempt
   */
  static recordFailedAttempt(userId: string, deviceId: string): {
    isLockedOut: boolean;
    remainingAttempts: number;
    lockoutDuration?: number;
  } {
    const key = `${userId}:${deviceId}`;
    const lockout = this.lockouts.get(key) || { lockedUntil: 0, attempts: 0 };

    lockout.attempts++;

    // Lock out after 5 failed attempts with exponential backoff
    const maxAttempts = 5;
    const remainingAttempts = Math.max(0, maxAttempts - lockout.attempts);

    if (lockout.attempts >= maxAttempts) {
      // Exponential backoff: 5min, 10min, 20min, 40min, max 1hour
      const lockoutMinutes = Math.min(Math.pow(2, lockout.attempts - maxAttempts) * 5, 60);
      lockout.lockedUntil = Date.now() + lockoutMinutes * 60 * 1000;

      this.lockouts.set(key, lockout);

      logger.warn('User locked out due to failed PIN attempts', {
        userId,
        deviceId,
        attempts: lockout.attempts,
        lockoutMinutes,
      });

      return {
        isLockedOut: true,
        remainingAttempts: 0,
        lockoutDuration: lockoutMinutes * 60,
      };
    }

    this.lockouts.set(key, lockout);

    return {
      isLockedOut: false,
      remainingAttempts,
    };
  }

  /**
   * Clear failed attempts (successful PIN entry)
   */
  static clearFailedAttempts(userId: string, deviceId: string): void {
    const key = `${userId}:${deviceId}`;
    this.lockouts.delete(key);

    logger.info('PIN attempts cleared', { userId, deviceId });
  }

  /**
   * Get lockout status
   */
  static getLockoutStatus(userId: string, deviceId: string): {
    isLockedOut: boolean;
    remainingTime?: number;
    attempts: number;
  } {
    const key = `${userId}:${deviceId}`;
    const lockout = this.lockouts.get(key);

    if (!lockout) {
      return { isLockedOut: false, attempts: 0 };
    }

    const now = Date.now();
    if (lockout.lockedUntil <= now) {
      this.lockouts.delete(key);
      return { isLockedOut: false, attempts: 0 };
    }

    return {
      isLockedOut: true,
      remainingTime: lockout.lockedUntil - now,
      attempts: lockout.attempts,
    };
  }

  /**
   * Clear expired lockouts
   */
  static cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, lockout] of this.lockouts.entries()) {
      if (lockout.lockedUntil <= now) {
        this.lockouts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('PIN lockout cleanup', { cleaned, totalLockouts: this.lockouts.size });
    }
  }

  /**
   * Clear all lockouts (useful for tests)
   */
  static clearAll(): void {
    this.lockouts.clear();
    logger.info('All PIN lockouts cleared');
  }
}