import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all external dependencies at the top level before imports
vi.mock('../../src/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock('../../src/lib/crypto', () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
  hashPassword: vi.fn().mockResolvedValue({ hash: 'hashed-pin', salt: 'salt' }),
  generateJTI: vi.fn().mockReturnValue('test-jti-123'),
  nowUTC: vi.fn().mockReturnValue(new Date('2025-01-01T00:00:00Z')),
  isWithinClockSkew: vi.fn().mockReturnValue(true),
  getExpiryTimestamp: vi.fn().mockReturnValue(new Date('2025-01-02T00:00:00Z')),
  isValidUUID: vi.fn((uuid: string) => {
    // Simple UUID validation for tests
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  }),
  JWTUtils: {
    extractTokenFromHeader: vi.fn((header: string) => {
      return header.startsWith('Bearer ') ? header.substring(7) : null;
    }),
    createAccessToken: vi.fn(),
    createRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
  },
  generateSecureRandom: vi.fn().mockReturnValue('random-string'),
  sha256: vi.fn().mockReturnValue('hash'),
}));

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

vi.mock('../../src/lib/config', () => ({
  env: {
    SESSION_TIMEOUT_HOURS: 8,
    NODE_ENV: 'test',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
}));

// Import after mocking
import { AuthService } from '../../src/services/auth-service';
import { db } from '../../src/lib/db';
import { JWTService } from '../../src/services/jwt-service';
import { RateLimiter, PinLockoutService } from '../../src/services/rate-limiter';
import { verifyPassword } from '../../src/lib/crypto';

// Get mocked functions
const mockVerifyPassword = vi.mocked(verifyPassword);
const mockDbSelect = vi.mocked(db.select);
const mockDbInsert = vi.mocked(db.insert);
const mockDbUpdate = vi.mocked(db.update);
const mockJWTService = vi.mocked(JWTService);
const mockRateLimiter = vi.mocked(RateLimiter);
const mockPinLockoutService = vi.mocked(PinLockoutService);

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default mocks
    mockVerifyPassword.mockResolvedValue(true);

    // Setup default successful device query
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'device-001',
            teamId: 'team-001',
            isActive: true,
          }]),
        }),
      }),
    } as any);

    // Setup default successful user query
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'user-001',
            code: 'test001',
            teamId: 'team-001',
            displayName: 'Test User',
            isActive: true,
          }]),
        }),
      }),
    } as any);

    // Setup default successful user PIN query
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            userId: 'user-001',
            pinHash: 'hashed-pin',
            salt: 'salt',
          }]),
        }),
      }),
    } as any);

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as any);

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    // Mock the private recordLoginAttempt method
    vi.spyOn(AuthService as any, 'recordLoginAttempt').mockResolvedValue(undefined);
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await AuthService.login(
        {
          deviceId: 'device-001',
          userCode: 'test001',
          pin: '123456',
        },
        '192.168.1.1',
        'TestAgent/1.0'
      );

      expect(result.success).toBe(true);
      expect(result.session?.userId).toBe('user-001');
      expect(result.session?.deviceId).toBe('device-001');
      expect(result.accessToken).toBe('test-access-token');
      expect(result.refreshToken).toBe('test-access-token');
      expect(result.policyVersion).toBe(3);
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

    it('should reject login for nonexistent device', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await AuthService.login(
        {
          deviceId: 'nonexistent-device',
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
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'device-001',
              teamId: 'team-001',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await AuthService.login(
        {
          deviceId: 'device-001',
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
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'device-001',
              teamId: 'team-001',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'user-001',
              code: 'test001',
              teamId: 'team-001',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              userId: 'user-001',
              pinHash: 'hashed-pin',
              salt: 'salt',
            }]),
          }),
        }),
      } as any);

      mockVerifyPassword.mockResolvedValueOnce(false);

      const result = await AuthService.login(
        {
          deviceId: 'device-001',
          userCode: 'test001',
          pin: 'wrongpin',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.error?.message).toContain('Invalid user code or PIN');
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
          deviceId: 'device-001',
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

    it('should reject login when rate limited', async () => {
      vi.mocked(RateLimiter.checkLoginLimit).mockResolvedValueOnce({
        allowed: false,
        retryAfter: 60,
      });

      const result = await AuthService.login(
        {
          deviceId: 'device-001',
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
  });

  describe('logout', () => {
    it('should logout successfully with valid session', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'session-001',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      const result = await AuthService.logout('session-001');

      expect(result.success).toBe(true);
    });

    it('should return error for nonexistent session', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await AuthService.logout('nonexistent-session');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SESSION_NOT_FOUND');
      expect(result.error?.message).toBe('Session not found or already ended');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const result = await AuthService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.expiresAt).toBeDefined();
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

  describe('whoami', () => {
    it('should return user information for valid token', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'user-001',
              code: 'test001',
              teamId: 'team-001',
              displayName: 'Test User',
            }]),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'session-001',
              userId: 'user-001',
              deviceId: 'device-001',
              isActive: true,
              expiresAt: new Date('2025-01-02T00:00:00Z'),
              overrideUntil: null,
            }]),
          }),
        }),
      } as any);

      const result = await AuthService.whoami('Bearer valid-token');

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('user-001');
      expect(result.session?.sessionId).toBe('session-001');
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
  });

  describe('supervisorOverride', () => {
    it('should grant supervisor override with valid PIN', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'device-001',
              teamId: 'team-001',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'supervisor-001',
              teamId: 'team-001',
              name: 'Test Supervisor',
              pinHash: 'hashed-supervisor-pin',
              salt: 'salt',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      mockVerifyPassword.mockResolvedValueOnce(true);

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '123456',
          deviceId: 'device-001',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(true);
      expect(result.overrideUntil).toBeDefined();
      expect(result.token).toBe('test-access-token');
    });

    it('should reject override for nonexistent device', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '123456',
          deviceId: 'nonexistent-device',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });

    it('should reject override for invalid PIN', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'device-001',
              teamId: 'team-001',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'supervisor-001',
              teamId: 'team-001',
              name: 'Test Supervisor',
              pinHash: 'hashed-supervisor-pin',
              salt: 'salt',
              isActive: true,
            }]),
          }),
        }),
      } as any);

      mockVerifyPassword.mockResolvedValueOnce(false);

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: 'wrongpin',
          deviceId: 'device-001',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SUPERVISOR_PIN');
      expect(result.error?.message).toBe('Invalid supervisor PIN');
    });
  });
});