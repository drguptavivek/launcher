import { JWTUtils, generateJTI, nowUTC } from '../lib/crypto';
import { db } from '../lib/db';
import { jwtRevocations, sessions } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { env } from '../lib/config';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  sub: string; // user_id
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  jti: string;
  'x-device-id': string;
  'x-session-id': string;
  'x-team-id'?: string;
  type: 'access' | 'refresh' | 'override';
}

export interface CreateTokenOptions {
  userId: string;
  deviceId: string;
  sessionId: string;
  teamId?: string;
  type: 'access' | 'refresh' | 'override';
}

export interface TokenResult {
  token: string;
  expiresAt: Date;
  jti: string;
}

/**
 * JWT Service with revocation support
 */
export class JWTService {
  /**
   * Create a new JWT token
   */
  static async createToken(options: CreateTokenOptions): Promise<TokenResult> {
    const { userId, deviceId, sessionId, teamId, type } = options;

    // For override tokens, include teamId, for access tokens include teamId, refresh tokens don't need teamId
    const payload = {
      userId,
      deviceId,
      sessionId,
      ...(teamId && { teamId }),
    };

    let result;
    switch (type) {
      case 'access':
        result = JWTUtils.createAccessToken(payload);
        break;
      case 'refresh':
        result = JWTUtils.createRefreshToken(payload);
        break;
      case 'override':
        result = await this.createOverrideToken(payload);
        break;
      default:
        throw new Error(`Invalid token type: ${type}`);
    }

    return {
      token: result.token,
      expiresAt: result.expiresAt,
      jti: this.extractJTI(result.token),
    };
  }

  /**
   * Verify and validate a JWT token
   */
  static async verifyToken(token: string, expectedType: 'access' | 'refresh' | 'override'): Promise<{
    valid: boolean;
    payload?: JWTPayload;
    error?: string;
    jti?: string;
  }> {
    let result;
    switch (expectedType) {
      case 'access':
        result = JWTUtils.verifyAccessToken(token);
        break;
      case 'refresh':
        result = JWTUtils.verifyRefreshToken(token);
        break;
      case 'override':
        result = await this.verifyOverrideToken(token);
        break;
      default:
        return { valid: false, error: 'Invalid token type' };
    }

    if (!result.valid || !result.jti) {
      return result;
    }

    // Check if token is revoked
    const isRevoked = await this.isTokenRevoked(result.jti);
    if (isRevoked) {
      return { valid: false, error: 'Token has been revoked' };
    }

    return result;
  }

  /**
   * Revoke a JWT token
   */
  static async revokeToken(jti: string, reason?: string, revokedBy?: string): Promise<void> {
    try {
      // Calculate expiry time (default to 1 year from now for safety)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await db.insert(jwtRevocations).values({
        id: generateJTI(),
        jti,
        revokedAt: nowUTC(),
        expiresAt,
        reason,
        revokedBy,
      });

      logger.info('Token revoked', { jti, reason, revokedBy });
    } catch (error) {
      logger.error('Failed to revoke token', { jti, error });
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Revoke all tokens for a session
   */
  static async revokeSessionTokens(sessionId: string, revokedBy?: string): Promise<void> {
    try {
      // Get the session to find the JTI
      const session = await db.select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (session.length === 0) {
        throw new Error('Session not found');
      }

      const sessionData = session[0];

      // Mark session as ended
      await db.update(sessions)
        .set({
          status: 'ended',
          endedAt: nowUTC()
        })
        .where(eq(sessions.id, sessionId));

      logger.info('Session revoked', { sessionId, revokedBy });
    } catch (error) {
      logger.error('Failed to revoke session', { sessionId, error });

      // Re-throw the original error so it can be properly handled
      if (error.message === 'Session not found') {
        throw error; // Re-throw session not found error
      }

      // For other database errors, wrap them
      throw new Error(`Database error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Check if a token is revoked
   */
  static async isTokenRevoked(jti: string): Promise<boolean> {
    try {
      const revoked = await db.select()
        .from(jwtRevocations)
        .where(eq(jwtRevocations.jti, jti))
        .limit(1);

      // Clean up expired revocations
      await this.cleanupExpiredRevocations();

      return revoked.length > 0;
    } catch (error) {
      logger.error('Failed to check token revocation', { jti, error });
      return false;
    }
  }

  /**
   * Create an override token (short-lived for supervisor access)
   */
  private static async createOverrideToken(payload: { userId: string; deviceId: string; sessionId: string }): Promise<{ token: string; expiresAt: Date }> {
    const now = Math.floor(Date.now() / 1000);
    const jti = generateJTI();

    // Override tokens are valid for 2 hours
    const ttlSeconds = 2 * 60 * 60; // 2 hours
    const expiresAt = new Date((now + ttlSeconds) * 1000);

    // Create JWT token directly with override type and custom TTL
    const token = jwt.sign(
      {
        sub: payload.userId,
        aud: 'surveylauncher-client',
        iss: 'surveylauncher-backend',
        iat: now,
        exp: now + ttlSeconds,
        jti,
        'x-device-id': payload.deviceId,
        'x-session-id': payload.sessionId,
        'x-team-id': '',
        type: 'override',
      },
      env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256' }
    );

    return {
      token,
      expiresAt,
    };
  }

  /**
   * Verify an override token
   */
  private static async verifyOverrideToken(token: string): Promise<{
    valid: boolean;
    payload?: any;
    error?: string;
    jti?: string;
  }> {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        audience: 'surveylauncher-client',
        issuer: 'surveylauncher-backend',
        algorithms: ['HS256'],
      }) as any;

      if (decoded.type !== 'override') {
        return { valid: false, error: 'Invalid token type for override' };
      }

      return {
        valid: true,
        payload: decoded,
        jti: decoded.jti,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract JTI from JWT token
   */
  private static extractJTI(token: string): string {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload.jti;
    } catch (error) {
      logger.error('Failed to extract JTI from token', { error });
      throw new Error('Invalid token format');
    }
  }

  /**
   * Clean up expired revocations
   */
  private static async cleanupExpiredRevocations(): Promise<void> {
    try {
      const now = nowUTC();
      await db.delete(jwtRevocations)
        .where(and(
          // You might need to adjust this based on your database capabilities
          // This is a simplified version - you'd typically use a date comparison
          // For now, this is a placeholder for the cleanup logic
        ));
    } catch (error) {
      // Don't fail the operation if cleanup fails
      logger.warn('Failed to cleanup expired revocations', { error });
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenResult> {
    // Verify the refresh token
    const verification = await this.verifyToken(refreshToken, 'refresh');
    if (!verification.valid || !verification.payload) {
      throw new Error('Invalid refresh token');
    }

    const payload = verification.payload;

    // Check if the session is still active
    const session = await db.select()
      .from(sessions)
      .where(eq(sessions.id, payload['x-session-id']))
      .limit(1);

    if (session.length === 0 || session[0].status !== 'open') {
      throw new Error('Session not found or inactive');
    }

    // Create new access token
    return this.createToken({
      userId: payload.sub,
      deviceId: payload['x-device-id'],
      sessionId: payload['x-session-id'],
      teamId: payload['x-team-id'],
      type: 'access',
    });
  }
}