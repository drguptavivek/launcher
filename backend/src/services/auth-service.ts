import { db } from '../lib/db';
import { users, devices, sessions, userPins, supervisorPins, pinAttempts } from '../lib/db/schema';
import { verifyPassword, isValidUUID } from '../lib/crypto';
import { JWTService } from './jwt-service';
import { RateLimiter, PinLockoutService } from './rate-limiter';
import { JWTUtils } from '../lib/crypto';
import { logger } from '../lib/logger';
import { env } from '../lib/config';
import { eq, and } from 'drizzle-orm';
import { generateJTI, nowUTC, getExpiryTimestamp } from '../lib/crypto';

export interface LoginRequest {
  deviceId: string;
  userCode: string;
  pin: string;
}

export interface LoginResult {
  success: boolean;
  session?: {
    sessionId: string;
    userId: string;
    deviceId: string;
    startedAt: Date;
    expiresAt: Date;
    overrideUntil: Date | null;
  };
  accessToken?: string;
  refreshToken?: string;
  policyVersion: number;
  error?: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

export interface WhoAmIResult {
  success: boolean;
  user?: {
    id: string;
    code: string;
    teamId: string;
    displayName: string;
  };
  session?: {
    sessionId: string;
    deviceId: string;
    expiresAt: Date;
    overrideUntil: Date | null;
  };
  policyVersion: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface SupervisorOverrideRequest {
  supervisorPin: string;
  deviceId: string;
}

export interface SupervisorOverrideResult {
  success: boolean;
  overrideUntil?: Date;
  token?: string;
  error?: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

/**
 * Authentication Service
 */
export class AuthService {
  /**
   * Authenticate a user with device, user code, and PIN
   */
  static async login(
    request: LoginRequest,
    ipAddress: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const { deviceId, userCode, pin } = request;

    try {
      // Validate UUID format
      if (!isValidUUID(deviceId)) {
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found or inactive',
          },
        };
      }

      // Validate device exists and is active
      const device = await db.select()
        .from(devices)
        .where(and(eq(devices.id, deviceId), eq(devices.isActive, true)))
        .limit(1);

      if (device.length === 0) {
        // Don't record login attempt when userId is null - pin_attempts requires userId
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found or inactive',
          },
        };
      }

      // Find user by code
      const user = await db.select()
        .from(users)
        .where(and(eq(users.code, userCode), eq(users.isActive, true)))
        .limit(1);

      if (user.length === 0) {
        // Don't record login attempt when userId is null - pin_attempts requires userId
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid user code or PIN',
          },
        };
      }

      const userData = user[0];

      // Check if user is on the same team as the device
      if (userData.teamId !== device[0].teamId) {
        await this.recordLoginAttempt(deviceId, userData.id, false, ipAddress, 'TEAM_MISMATCH');
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid user code or PIN',
          },
        };
      }

      // Check PIN lockout status BEFORE rate limiting (account lockout takes priority)
      const isLockedOut = PinLockoutService.isLockedOut(userData.id, deviceId);
      if (isLockedOut) {
        const lockoutStatus = PinLockoutService.getLockoutStatus(userData.id, deviceId);
        await this.recordLoginAttempt(deviceId, userData.id, false, ipAddress, 'PIN_LOCKED_OUT');

        const retryAfter = lockoutStatus.remainingTime ? Math.ceil(lockoutStatus.remainingTime / 1000) : undefined;
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account temporarily locked due to too many failed attempts',
            retryAfter,
          },
        };
      }

      // Check rate limiting for login attempts (after user is identified and not locked out)
      const rateLimitResult = await RateLimiter.checkLoginLimit(deviceId, ipAddress);
      if (!rateLimitResult.allowed) {
        await this.recordLoginAttempt(deviceId, userData.id, false, ipAddress, 'RATE_LIMITED');
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
        };
      }

      // Verify PIN
      const userPin = await db.select()
        .from(userPins)
        .where(eq(userPins.userId, userData.id))
        .limit(1);

      if (userPin.length === 0) {
        await this.recordLoginAttempt(deviceId, userData.id, false, ipAddress, 'PIN_NOT_SET');
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid user code or PIN',
          },
        };
      }

      const pinValid = await verifyPassword(pin, userPin[0].pinHash, userPin[0].salt);
      if (!pinValid) {
        // Record failed attempt and check for lockout
        const lockoutResult = PinLockoutService.recordFailedAttempt(userData.id, deviceId);
        await this.recordLoginAttempt(deviceId, userData.id, false, ipAddress, 'INVALID_PIN');

        if (lockoutResult.isLockedOut) {
          return {
            success: false,
            policyVersion: 0,
            error: {
              code: 'ACCOUNT_LOCKED',
              message: 'Account temporarily locked due to too many failed attempts',
              retryAfter: lockoutResult.lockoutDuration,
            },
          };
        }

        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: `Invalid user code or PIN. ${lockoutResult.remainingAttempts} attempts remaining.`,
          },
        };
      }

      // Clear failed attempts on successful login
      PinLockoutService.clearFailedAttempts(userData.id, deviceId);

      // Create session
      const sessionId = generateJTI();
      const expiresAt = getExpiryTimestamp(env.SESSION_TIMEOUT_HOURS * 60); // Convert hours to minutes

      await db.insert(sessions).values({
        id: sessionId,
        userId: userData.id,
        teamId: userData.teamId,
        deviceId: device[0].id,
        startedAt: nowUTC(),
        expiresAt,
        ipAddress,
        userAgent,
        status: 'open',
        lastActivityAt: nowUTC(),
      });

      // Create JWT tokens
      const [accessToken, refreshToken] = await Promise.all([
        JWTService.createToken({
          userId: userData.id,
          deviceId: device[0].id,
          sessionId,
          teamId: userData.teamId,
          type: 'access',
        }),
        JWTService.createToken({
          userId: userData.id,
          deviceId: device[0].id,
          sessionId,
          teamId: userData.teamId,
          type: 'refresh',
        }),
      ]);

      // Update device last seen
      await db.update(devices)
        .set({
          lastSeenAt: nowUTC(),
          updatedAt: nowUTC(),
        })
        .where(eq(devices.id, deviceId));

      // Record successful login
      await this.recordLoginAttempt(deviceId, userData.id, true, ipAddress, 'SUCCESS');

      logger.info('User logged in successfully', {
        userId: userData.id,
        deviceId,
        sessionId,
        ipAddress,
      });

      return {
        success: true,
        session: {
          sessionId,
          userId: userData.id,
          deviceId: device[0].id,
          startedAt: new Date(),
          expiresAt,
          overrideUntil: null,
        },
        accessToken: accessToken.token,
        refreshToken: refreshToken.token,
        policyVersion: 3, // This would typically come from a configuration
      };
    } catch (error) {
      logger.error('Login error', { deviceId, userCode, error });
      return {
        success: false,
        policyVersion: 0,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login',
        },
      };
    }
  }

  /**
   * Logout a user by invalidating their session and tokens
   */
  static async logout(sessionId: string, revokedBy?: string): Promise<{
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      // First check if session exists
      const sessionData = await db.select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (sessionData.length === 0) {
        return {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found or already ended',
          },
        };
      }

      // Revoke session tokens
      await JWTService.revokeSessionTokens(sessionId, revokedBy);

      logger.info('User logged out', { sessionId, revokedBy });

      return { success: true };
    } catch (error) {
      logger.error('Failed to revoke session', { sessionId, error });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during logout',
        },
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    expiresAt?: Date;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      const result = await JWTService.refreshToken(refreshToken);

      if (!result.valid || !result.accessToken) {
        return {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: result.error || 'Invalid or expired refresh token',
          },
        };
      }

      return {
        success: true,
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      logger.error('Token refresh error', { error, message: error.message });
      return {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: `Invalid or expired refresh token: ${error.message}`,
        },
      };
    }
  }

  /**
   * Get user information from a valid access token
   */
  static async whoami(authorizationHeader: string): Promise<WhoAmIResult> {
    try {
      // Extract token from header
      const token = JWTUtils.extractTokenFromHeader(authorizationHeader);
      if (!token) {
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
          },
        };
      }

      // Verify token
      const verification = await JWTService.verifyToken(token, 'access');
      if (!verification.valid || !verification.payload) {
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        };
      }

      const payload = verification.payload;

      // Get user information
      const user = await db.select({
        id: users.id,
        code: users.code,
        teamId: users.teamId,
        displayName: users.displayName,
      })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (user.length === 0) {
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      // Get session information
      const session = await db.select()
        .from(sessions)
        .where(eq(sessions.id, payload['x-session-id']))
        .limit(1);

      if (session.length === 0 || session[0].status !== 'open') {
        return {
          success: false,
          policyVersion: 0,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found or inactive',
          },
        };
      }

      return {
        success: true,
        user: user[0],
        session: {
          sessionId: session[0].id,
          deviceId: session[0].deviceId,
          expiresAt: session[0].expiresAt,
          overrideUntil: session[0].overrideUntil,
        },
        policyVersion: 3,
      };
    } catch (error) {
      logger.error('Whoami error', { error });
      return {
        success: false,
        policyVersion: 0,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user information',
        },
      };
    }
  }

  /**
   * Supervisor override login
   */
  static async supervisorOverride(
    request: SupervisorOverrideRequest,
    ipAddress: string
  ): Promise<SupervisorOverrideResult> {
    const { deviceId } = request; // supervisorPin extracted in validation below

    try {
      // Check rate limiting for supervisor PIN attempts
      const rateLimitResult = await RateLimiter.checkSupervisorPinLimit(ipAddress);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many supervisor override attempts. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
        };
      }

      // Validate device exists
      const device = await db.select()
        .from(devices)
        .where(and(eq(devices.id, deviceId), eq(devices.isActive, true)))
        .limit(1);

      if (device.length === 0) {
        return {
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found or inactive',
          },
        };
      }

      // Find active supervisor PIN for the device's team
      const supervisorPinData = await db.select()
        .from(supervisorPins)
        .where(and(
          eq(supervisorPins.teamId, device[0].teamId),
          eq(supervisorPins.isActive, true)
        ))
        .limit(1);

      if (supervisorPinData.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_SUPERVISOR_PIN',
            message: 'No active supervisor PIN found for this team',
          },
        };
      }

      // Verify supervisor PIN
      const pinValid = await verifyPassword(
        request.supervisorPin,
        supervisorPinData[0].pinHash,
        supervisorPinData[0].salt
      );

      if (!pinValid) {
        logger.warn('Invalid supervisor PIN attempt', {
          deviceId,
          teamId: device[0].teamId,
          ipAddress,
        });

        return {
          success: false,
          error: {
            code: 'INVALID_SUPERVISOR_PIN',
            message: 'Invalid supervisor PIN',
          },
        };
      }

      // Create override token
      const now = nowUTC();
      const overrideUntil = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours

      const sessionId = generateJTI();
      const overrideToken = await JWTService.createToken({
        userId: supervisorPinData[0].id,
        deviceId,
        sessionId,
        type: 'override',
      });

      logger.info('Supervisor override granted', {
        supervisorId: supervisorPinData[0].id,
        deviceId,
        teamId: device[0].teamId,
        ipAddress,
        overrideUntil,
      });

      return {
        success: true,
        overrideUntil,
        token: overrideToken.token,
      };
    } catch (error) {
      logger.error('Supervisor override error', {
        deviceId,
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `An error occurred during supervisor override: ${error.message}`,
        },
      };
    }
  }

  /**
   * Record login attempt for audit purposes
   */
  private static async recordLoginAttempt(
    deviceId: string,
    userId: string | null,
    success: boolean,
    ipAddress: string,
    _reason: string // Reason parameter available for future audit logging
  ): Promise<void> {
    // Only record attempts when we have a valid userId
    // pin_attempts table requires userId to be non-null
    if (!userId) {
      return;
    }

    try {
      await db.insert(pinAttempts).values({
        id: generateJTI(),
        userId,
        deviceId,
        attemptType: 'user_pin',
        success,
        ipAddress,
        attemptedAt: nowUTC(),
      });
    } catch (error) {
      // Don't fail the login if audit logging fails
      logger.error('Failed to record login attempt', { deviceId, userId, error });
    }
  }

  /**
   * End a session
   */
  static async endSession(sessionId: string): Promise<{
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
  }> {
    try {
      // Revoke session tokens
      await JWTService.revokeSessionTokens(sessionId);

      logger.info('Session ended', { sessionId });

      return { success: true };
    } catch (error) {
      logger.error('Session end error', { sessionId, error });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while ending the session',
        },
      };
    }
  }
}