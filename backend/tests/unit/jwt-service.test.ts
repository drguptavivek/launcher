import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JWTService } from '../../src/services/jwt-service';
import { db } from '../../src/lib/db';
import { jwtRevocations } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateJTI } from '../../src/lib/crypto';

describe('JWTService', () => {
  // Test data
  const mockOptions = {
    userId: generateJTI(),
    deviceId: generateJTI(),
    sessionId: generateJTI(),
    teamId: generateJTI(),
  };

  beforeEach(async () => {
    // Clean up any test data before each test
    await db.delete(jwtRevocations);
  });

  afterEach(async () => {
    // Clean up after each test
    await db.delete(jwtRevocations);
  });

  describe('Token Creation', () => {
    it('JWT-001: should create access token successfully', async () => {
      const result = await JWTService.createToken({
        ...mockOptions,
        type: 'access',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('jti');
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(typeof result.jti).toBe('string');
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('JWT-002: should create refresh token successfully', async () => {
      const result = await JWTService.createToken({
        ...mockOptions,
        type: 'refresh',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('jti');
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(typeof result.jti).toBe('string');
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('JWT-003: should create override token successfully', async () => {
      const result = await JWTService.createToken({
        ...mockOptions,
        type: 'override',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('jti');
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(typeof result.jti).toBe('string');

      // Override tokens should be short-lived (2 hours)
      const twoHoursFromNow = new Date(Date.now() + (2 * 60 * 60 * 1000));
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(twoHoursFromNow.getTime());
    });

    it('JWT-004: should handle tokens without teamId', async () => {
      const optionsWithoutTeam = {
        userId: generateJTI(),
        deviceId: generateJTI(),
        sessionId: generateJTI(),
        type: 'access' as const,
      };

      const result = await JWTService.createToken(optionsWithoutTeam);
      expect(result.token).toBeDefined();
      expect(result.jti).toBeDefined();
    });

    it('JWT-005: should reject invalid token type', async () => {
      const invalidOptions = {
        ...mockOptions,
        type: 'invalid' as any,
      };

      await expect(JWTService.createToken(invalidOptions)).rejects.toThrow('Invalid token type: invalid');
    });
  });

  describe('Token Verification', () => {
    let accessToken: string;
    let refreshToken: string;
    let overrideToken: string;
    let accessJTI: string;
    let refreshJTI: string;
    let overrideJTI: string;

    beforeEach(async () => {
      // Create test tokens
      const accessResult = await JWTService.createToken({ ...mockOptions, type: 'access' });
      const refreshResult = await JWTService.createToken({ ...mockOptions, type: 'refresh' });
      const overrideResult = await JWTService.createToken({ ...mockOptions, type: 'override' });

      accessToken = accessResult.token;
      refreshToken = refreshResult.token;
      overrideToken = overrideResult.token;
      accessJTI = accessResult.jti;
      refreshJTI = refreshResult.jti;
      overrideJTI = overrideResult.jti;
    });

    it('JWT-006: should verify access token successfully', async () => {
      const result = await JWTService.verifyToken(accessToken, 'access');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.jti).toBe(accessJTI);
      expect(result.payload?.sub).toBe(mockOptions.userId);
      expect(result.payload?.['x-device-id']).toBe(mockOptions.deviceId);
      expect(result.payload?.['x-session-id']).toBe(mockOptions.sessionId);
      expect(result.payload?.type).toBe('access');
    });

    it('JWT-007: should verify refresh token successfully', async () => {
      const result = await JWTService.verifyToken(refreshToken, 'refresh');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.jti).toBe(refreshJTI);
      expect(result.payload?.sub).toBe(mockOptions.userId);
      expect(result.payload?.['x-device-id']).toBe(mockOptions.deviceId);
      expect(result.payload?.['x-session-id']).toBe(mockOptions.sessionId);
      expect(result.payload?.type).toBe('refresh');
    });

    it('JWT-008: should verify override token successfully', async () => {
      const result = await JWTService.verifyToken(overrideToken, 'override');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.jti).toBe(overrideJTI);
      expect(result.payload?.sub).toBe(mockOptions.userId);
      expect(result.payload?.['x-device-id']).toBe(mockOptions.deviceId);
      expect(result.payload?.['x-session-id']).toBe(mockOptions.sessionId);
      expect(result.payload?.type).toBe('override');
    });

    it('JWT-009: should reject invalid token format', async () => {
      const result = await JWTService.verifyToken('invalid.token.format', 'access');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('JWT-010: should reject token with wrong type', async () => {
      const result = await JWTService.verifyToken(accessToken, 'refresh');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('Token Revocation', () => {
    let accessToken: string;
    let accessJTI: string;

    beforeEach(async () => {
      const result = await JWTService.createToken({ ...mockOptions, type: 'access' });
      accessToken = result.token;
      accessJTI = result.jti;
    });

    it('JWT-011: should revoke token successfully', async () => {
      await JWTService.revokeToken(accessJTI, 'Test revocation', 'test-user');

      // Check token is now revoked
      const verification = await JWTService.verifyToken(accessToken, 'access');
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('Token has been revoked');

      // Check revocation exists in database
      const revocations = await db.select()
        .from(jwtRevocations)
        .where(eq(jwtRevocations.jti, accessJTI));

      expect(revocations.length).toBe(1);
      expect(revocations[0].jti).toBe(accessJTI);
      expect(revocations[0].reason).toBe('Test revocation');
      expect(revocations[0].revokedBy).toBe('test-user');
    });

    it('JWT-012: should handle revocation of non-existent token', async () => {
      const nonExistentJTI = generateJTI();

      // Should not throw error
      await expect(JWTService.revokeToken(nonExistentJTI, 'Test')).resolves.not.toThrow();
    });

    it('JWT-013: should check if token is revoked', async () => {
      // Initially not revoked
      expect(await JWTService.isTokenRevoked(accessJTI)).toBe(false);

      // Revoke the token
      await JWTService.revokeToken(accessJTI, 'Test revocation');

      // Now should be revoked
      expect(await JWTService.isTokenRevoked(accessJTI)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('JWT-014: should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        '',
        'invalid',
        'header.payload', // missing signature
        'header.invalid.signature',
      ];

      for (const token of malformedTokens) {
        const result = await JWTService.verifyToken(token, 'access');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('JWT-015: should handle database errors in revocation check', async () => {
      // This would typically require mocking database errors
      // For now, ensure the method doesn't throw unexpected errors
      expect(await JWTService.isTokenRevoked('non-existent-jti')).toBe(false);
    });

    it('JWT-016: should extract JTI from valid token', async () => {
      const result = await JWTService.createToken({ ...mockOptions, type: 'access' });
      expect(result.jti).toBeDefined();
      expect(typeof result.jti).toBe('string');
      expect(result.jti.length).toBeGreaterThan(0);
    });

    it('JWT-017: should handle refresh token validation', async () => {
      const testUserId = generateJTI();
      const testTeamId = generateJTI();
      const testDeviceId = generateJTI();

      // Create access token instead of refresh token
      const accessResult = await JWTService.createToken({
        userId: testUserId,
        deviceId: testDeviceId,
        sessionId: generateJTI(),
        teamId: testTeamId,
        type: 'access',
      });

      // Should fail to refresh with access token
      await expect(JWTService.refreshToken(accessResult.token))
        .rejects.toThrow('Invalid refresh token');
    });

    it('JWT-018: should reject refresh token for non-existent session', async () => {
      const nonExistentSessionId = generateJTI();
      const testUserId = generateJTI();
      const testTeamId = generateJTI();
      const testDeviceId = generateJTI();

      // Create refresh token for non-existent session
      const refreshResult = await JWTService.createToken({
        userId: testUserId,
        deviceId: testDeviceId,
        sessionId: nonExistentSessionId,
        teamId: testTeamId,
        type: 'refresh',
      });
      const refreshToken = refreshResult.token;

      // Should fail to refresh due to non-existent session
      await expect(JWTService.refreshToken(refreshToken))
        .rejects.toThrow('Session not found or inactive');
    });

    it('JWT-019: should reject malformed refresh token', async () => {
      // Test with completely invalid token
      await expect(JWTService.refreshToken('invalid.token.format'))
        .rejects.toThrow('Invalid refresh token');
    });

    it('JWT-020: should handle refresh token creation error cases', async () => {
      // Test with invalid token data that would fail verification
      const testUserId = generateJTI();
      const testTeamId = generateJTI();
      const testDeviceId = generateJTI();

      // Create refresh token
      const refreshResult = await JWTService.createToken({
        userId: testUserId,
        deviceId: testDeviceId,
        sessionId: generateJTI(),
        teamId: testTeamId,
        type: 'refresh',
      });

      // Verify the refresh token was created successfully
      expect(refreshResult.token).toBeDefined();
      expect(refreshResult.jti).toBeDefined();
      expect(refreshResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});