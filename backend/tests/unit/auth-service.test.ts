import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../../src/services/auth-service';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins, supervisorPins, sessions } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Mock only non-database dependencies
vi.mock('../../src/services/jwt-service', () => ({
  JWTService: {
    createToken: vi.fn().mockResolvedValue({
      token: 'test-access-token',
      expiresAt: new Date('2025-01-02T00:00:00Z'),
    }),
    verifyToken: vi.fn().mockResolvedValue({
      valid: true,
      payload: {
        sub: 'user-001',
        'x-session-id': 'session-001',
      },
    }),
    refreshToken: vi.fn().mockResolvedValue({
      token: 'new-access-token',
      expiresAt: new Date('2025-01-02T00:00:00Z'),
    }),
    revokeSessionTokens: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/services/rate-limiter', () => ({
  RateLimiter: {
    checkLoginLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkSupervisorPinLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkPinLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkTelemetryLimit: vi.fn().mockResolvedValue({ allowed: true }),
  },
  PinLockoutService: {
    isLockedOut: vi.fn().mockReturnValue(false),
    recordFailedAttempt: vi.fn().mockReturnValue({ isLockedOut: false, remainingAttempts: 3 }),
    clearFailedAttempts: vi.fn(),
    getLockoutStatus: vi.fn().mockReturnValue({
      isLockedOut: false,
      remainingTime: 0,
      attempts: 0,
    }),
    cleanup: vi.fn(),
  },
}));

vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked dependencies
import { JWTService } from '../../src/services/jwt-service';
import { RateLimiter, PinLockoutService } from '../../src/services/rate-limiter';

describe('AuthService - Real Database Tests (Security Critical)', () => {
  let teamId: string;
  let deviceId: string;
  let userId: string;
  let supervisorPinId: string;
  let userPinHash: { hash: string; salt: string };
  let supervisorPinHash: { hash: string; salt: string };

  beforeEach(async () => {
    // Generate test UUIDs
    teamId = uuidv4();
    deviceId = uuidv4();
    userId = uuidv4();
    supervisorPinId = uuidv4();

    // Clear rate limits and lockouts
    PinLockoutService.cleanup();

    // Create test team
    await db.insert(teams).values({
      id: teamId,
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'MH01',
      isActive: true,
    });

    // Create test device
    await db.insert(devices).values({
      id: deviceId,
      teamId,
      name: 'Test Device',
      isActive: true,
    });

    // Create test user
    await db.insert(users).values({
      id: userId,
      code: 'test001',
      teamId,
      displayName: 'Test User',
      isActive: true,
    });

    // Hash user PIN
    userPinHash = await hashPassword('123456');
    await db.insert(userPins).values({
      userId,
      pinHash: userPinHash.hash,
      salt: userPinHash.salt,
    });

    // Hash supervisor PIN
    supervisorPinHash = await hashPassword('789012');
    await db.insert(supervisorPins).values({
      id: supervisorPinId,
      teamId,
      name: 'Test Supervisor',
      pinHash: supervisorPinHash.hash,
      salt: supervisorPinHash.salt,
      isActive: true,
    });
  });

  afterEach(async () => {
    // Clean up test data in proper order to respect foreign key constraints
    await db.delete(sessions).where(eq(sessions.teamId, teamId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, teamId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));

    // Clear rate limits and lockouts
    PinLockoutService.cleanup();
    vi.clearAllMocks();
  });

  describe('login - Critical Authentication Security', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1',
        'TestAgent/1.0'
      );

      expect(result.success).toBe(true);
      expect(result.session?.userId).toBe(userId);
      expect(result.session?.deviceId).toBe(deviceId);
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBe('test-access-token');
      expect(result.policyVersion).toBe(3);

      // Verify session was created in database
      const sessionRecord = await db.select().from(sessions).where(eq(sessions.userId, userId)).limit(1);
      expect(sessionRecord).toHaveLength(1);
      expect(sessionRecord[0].status).toBe('open');
    });

    it('should reject login for nonexistent device', async () => {
      const result = await AuthService.login(
        {
          deviceId: uuidv4(), // Nonexistent device
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });

    it('should reject login for nonexistent user', async () => {
      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'nonexistent-user',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.error?.message).toBe('Invalid user code or PIN');
    });

    it('should reject login with wrong password', async () => {
      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'test001',
          pin: 'wrongpin',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.error?.message).toContain('Invalid user code or PIN');
    });

    it('should reject login for inactive device', async () => {
      // Deactivate the device
      await db.update(devices)
        .set({ isActive: false })
        .where(eq(devices.id, deviceId));

      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should reject login for inactive user', async () => {
      // Deactivate the user
      await db.update(users)
        .set({ isActive: false })
        .where(eq(users.id, userId));

      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login when user and device belong to different teams', async () => {
      // Create another team and device
      const otherTeamId = uuidv4();
      const otherDeviceId = uuidv4();

      await db.insert(teams).values({
        id: otherTeamId,
        name: 'Other Team',
        timezone: 'UTC',
        stateId: 'MH02',
        isActive: true,
      });

      await db.insert(devices).values({
        id: otherDeviceId,
        teamId: otherTeamId,
        name: 'Other Device',
        isActive: true,
      });

      const result = await AuthService.login(
        {
          deviceId: otherDeviceId, // Device from different team
          userCode: 'test001',     // User from original team
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');

      // Cleanup
      await db.delete(devices).where(eq(devices.id, otherDeviceId));
      await db.delete(teams).where(eq(teams.id, otherTeamId));
    });

    it('should reject login when user has no PIN set', async () => {
      // Remove user PIN
      await db.delete(userPins).where(eq(userPins.userId, userId));

      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid UUID format', async () => {
      const result = await AuthService.login(
        {
          deviceId: 'invalid-uuid',
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });

    it('should reject login when rate limited', async () => {
      vi.mocked(RateLimiter.checkLoginLimit).mockResolvedValueOnce({
        allowed: false,
        retryAfter: 60,
      });

      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.error?.message).toContain('Too many login attempts');
      expect(result.error?.retryAfter).toBe(60);
    });

    it('should reject login when user is locked out', async () => {
      vi.mocked(PinLockoutService.isLockedOut).mockReturnValueOnce(true);
      vi.mocked(PinLockoutService.getLockoutStatus).mockReturnValueOnce({
        isLockedOut: true,
        remainingTime: 300000,
        attempts: 5,
      });

      const result = await AuthService.login(
        {
          deviceId,
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCOUNT_LOCKED');
      expect(result.error?.message).toContain('temporarily locked');
      expect(result.error?.retryAfter).toBe(300);
    });
  });

  describe('logout - Secure Session Termination', () => {
    it('should logout successfully with valid session', async () => {
      // First create a session
      const sessionId = uuidv4();
      await db.insert(sessions).values({
        id: sessionId,
        userId,
        teamId,
        deviceId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        status: 'open',
        ipAddress: '192.168.1.1',
        lastActivityAt: new Date(),
      });

      const result = await AuthService.logout(sessionId);

      expect(result.success).toBe(true);
      expect(JWTService.revokeSessionTokens).toHaveBeenCalledWith(sessionId, undefined);
    });

    it('should return error for nonexistent session', async () => {
      const result = await AuthService.logout(uuidv4()); // Generate valid UUID that doesn't exist

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SESSION_NOT_FOUND');
      expect(result.error?.message).toBe('Session not found or already ended');
    });
  });

  describe('refreshToken - Secure Token Renewal', () => {
    it('should refresh token successfully', async () => {
      const result = await AuthService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.expiresAt).toBeDefined();
      expect(JWTService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should handle invalid refresh token', async () => {
      vi.mocked(JWTService.refreshToken).mockRejectedValueOnce(
        new Error('Invalid refresh token')
      );

      const result = await AuthService.refreshToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REFRESH_TOKEN');
      expect(result.error?.message).toContain('Invalid or expired refresh token');
    });
  });

  describe('whoami - User Information Security', () => {
    let testSessionId: string;

    beforeEach(async () => {
      // Create a session for whoami tests
      testSessionId = uuidv4();
      await db.insert(sessions).values({
        id: testSessionId,
        userId,
        teamId,
        deviceId,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        status: 'open',
        ipAddress: '192.168.1.1',
        lastActivityAt: new Date(),
      });
    });

    it('should return user information for valid token', async () => {
      vi.mocked(JWTService.verifyToken).mockResolvedValueOnce({
        valid: true,
        payload: {
          sub: userId,
          'x-session-id': testSessionId, // Use the actual session ID
        },
      });

      const result = await AuthService.whoami('Bearer valid-token');

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(userId);
      expect(result.user?.code).toBe('test001');
      expect(result.user?.displayName).toBe('Test User');
      expect(result.policyVersion).toBe(3);
    });

    it('should reject missing token', async () => {
      const result = await AuthService.whoami('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TOKEN');
      expect(result.error?.message).toBe('Authorization token required');
    });

    it('should reject invalid token format', async () => {
      const result = await AuthService.whoami('InvalidFormat');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TOKEN');
    });

    it('should reject invalid token', async () => {
      vi.clearAllMocks();
      vi.mocked(JWTService.verifyToken).mockResolvedValueOnce({
        valid: false,
        payload: null,
      });

      const result = await AuthService.whoami('Bearer invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TOKEN');
      expect(result.error?.message).toBe('Invalid or expired token');
    });
  });

  describe('supervisorOverride - Emergency Access Security', () => {
    it('should grant supervisor override with valid PIN', async () => {
      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '789012',
          deviceId,
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(true);
      expect(result.overrideUntil).toBeDefined();
      expect(result.token).toBe('test-access-token');
    });

    it('should reject override for nonexistent device', async () => {
      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '789012',
          deviceId: uuidv4(), // Nonexistent device
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });

    it('should reject override for invalid PIN', async () => {
      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: 'wrongpin',
          deviceId,
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SUPERVISOR_PIN');
      expect(result.error?.message).toBe('Invalid supervisor PIN');
    });

    it('should reject override when supervisor PIN is inactive', async () => {
      // Deactivate supervisor PIN
      await db.update(supervisorPins)
        .set({ isActive: false })
        .where(eq(supervisorPins.id, supervisorPinId));

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '789012',
          deviceId,
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_SUPERVISOR_PIN');
      expect(result.error?.message).toBe('No active supervisor PIN found for this team');
    });

    it('should reject override when no supervisor PIN exists for team', async () => {
      // Create device with different team
      const otherTeamId = uuidv4();
      const otherDeviceId = uuidv4();

      await db.insert(teams).values({
        id: otherTeamId,
        name: 'Other Team',
        timezone: 'UTC',
        stateId: 'MH02',
        isActive: true,
      });

      await db.insert(devices).values({
        id: otherDeviceId,
        teamId: otherTeamId,
        name: 'Other Device',
        isActive: true,
      });

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '789012',
          deviceId: otherDeviceId, // Device has no supervisor PIN
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_SUPERVISOR_PIN');

      // Cleanup
      await db.delete(devices).where(eq(devices.id, otherDeviceId));
      await db.delete(teams).where(eq(teams.id, otherTeamId));
    });

    it('should reject override when rate limited', async () => {
      vi.mocked(RateLimiter.checkSupervisorPinLimit).mockResolvedValueOnce({
        allowed: false,
        retryAfter: 300,
      });

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '789012',
          deviceId,
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.error?.retryAfter).toBe(300);
    });
  });
});