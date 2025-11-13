import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import all dependencies first
import { AuthService } from '../../src/services/auth-service';
import { db } from '../../src/lib/db';
import { verifyPassword, hashPassword, generateJTI, nowUTC, getExpiryTimestamp, isValidUUID } from '../../src/lib/crypto';
import { JWTService } from '../../src/services/jwt-service';
import { RateLimiter, PinLockoutService } from '../../src/services/rate-limiter';
import { logger } from '../../src/lib/logger';
import { env } from '../../src/lib/config';

// Mock functions at module level
const mockVerifyPassword = vi.fn();
const mockHashPassword = vi.fn();
const mockGenerateJTI = vi.fn();
const mockNowUTC = vi.fn();
const mockGetExpiryTimestamp = vi.fn();
const mockIsValidUUID = vi.fn();
const mockCreateToken = vi.fn();
const mockVerifyToken = vi.fn();
const mockRefreshToken = vi.fn();
const mockRevokeSessionTokens = vi.fn();
const mockCheckLoginLimit = vi.fn();
const mockCheckSupervisorPinLimit = vi.fn();
const mockIsLockedOut = vi.fn();
const mockRecordFailedAttempt = vi.fn();
const mockClearFailedAttempts = vi.fn();
const mockGetLockoutStatus = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerDebug = vi.fn();

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all default return values
    mockVerifyPassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue({ hash: 'hashed-pin', salt: 'salt' });
    mockGenerateJTI.mockReturnValue('test-jti-123');
    mockNowUTC.mockReturnValue(new Date('2025-01-01T00:00:00Z'));
    mockGetExpiryTimestamp.mockReturnValue(new Date('2025-01-02T00:00:00Z'));
    mockIsValidUUID.mockReturnValue(true);

    mockCreateToken.mockResolvedValue({
      token: 'test-access-token',
      expiresAt: new Date('2025-01-02T00:00:00Z'),
    });

    mockVerifyToken.mockResolvedValue({
      valid: true,
      payload: {
        sub: 'user-001',
        'x-session-id': 'session-001',
      },
    });

    mockRefreshToken.mockResolvedValue({
      token: 'new-access-token',
      expiresAt: new Date('2025-01-02T00:00:00Z'),
    });

    mockRevokeSessionTokens.mockResolvedValue(undefined);
    mockCheckLoginLimit.mockResolvedValue({ allowed: true });
    mockCheckSupervisorPinLimit.mockResolvedValue({ allowed: true });
    mockIsLockedOut.mockReturnValue(false);
    mockRecordFailedAttempt.mockReturnValue({ isLockedOut: false, remainingAttempts: 3 });
    mockClearFailedAttempts.mockImplementation(() => {});
    mockGetLockoutStatus.mockReturnValue({
      isLockedOut: false,
      remainingTime: 0,
      attempts: 0,
    });

    // Mock logger functions
    mockLoggerInfo.mockImplementation(() => {});
    mockLoggerWarn.mockImplementation(() => {});
    mockLoggerError.mockImplementation(() => {});
    mockLoggerDebug.mockImplementation(() => {});

    // Spy on all imported functions and replace their implementations
    vi.spyOn(require('../../src/lib/crypto'), 'verifyPassword').mockImplementation(mockVerifyPassword);
    vi.spyOn(require('../../src/lib/crypto'), 'hashPassword').mockImplementation(mockHashPassword);
    vi.spyOn(require('../../src/lib/crypto'), 'generateJTI').mockImplementation(mockGenerateJTI);
    vi.spyOn(require('../../src/lib/crypto'), 'nowUTC').mockImplementation(mockNowUTC);
    vi.spyOn(require('../../src/lib/crypto'), 'getExpiryTimestamp').mockImplementation(mockGetExpiryTimestamp);
    vi.spyOn(require('../../src/lib/crypto'), 'isValidUUID').mockImplementation(mockIsValidUUID);

    vi.spyOn(require('../../src/services/jwt-service').JWTService, 'createToken').mockImplementation(mockCreateToken);
    vi.spyOn(require('../../src/services/jwt-service').JWTService, 'verifyToken').mockImplementation(mockVerifyToken);
    vi.spyOn(require('../../src/services/jwt-service').JWTService, 'refreshToken').mockImplementation(mockRefreshToken);
    vi.spyOn(require('../../src/services/jwt-service').JWTService, 'revokeSessionTokens').mockImplementation(mockRevokeSessionTokens);

    vi.spyOn(require('../../src/services/rate-limiter').RateLimiter, 'checkLoginLimit').mockImplementation(mockCheckLoginLimit);
    vi.spyOn(require('../../src/services/rate-limiter').RateLimiter, 'checkSupervisorPinLimit').mockImplementation(mockCheckSupervisorPinLimit);
    vi.spyOn(require('../../src/services/rate-limiter').PinLockoutService, 'isLockedOut').mockImplementation(mockIsLockedOut);
    vi.spyOn(require('../../src/services/rate-limiter').PinLockoutService, 'recordFailedAttempt').mockImplementation(mockRecordFailedAttempt);
    vi.spyOn(require('../../src/services/rate-limiter').PinLockoutService, 'clearFailedAttempts').mockImplementation(mockClearFailedAttempts);
    vi.spyOn(require('../../src/services/rate-limiter').PinLockoutService, 'getLockoutStatus').mockImplementation(mockGetLockoutStatus);

    vi.spyOn(logger, 'info').mockImplementation(mockLoggerInfo);
    vi.spyOn(logger, 'warn').mockImplementation(mockLoggerWarn);
    vi.spyOn(logger, 'error').mockImplementation(mockLoggerError);
    vi.spyOn(logger, 'debug').mockImplementation(mockLoggerDebug);

    // Mock the database queries using spy approach
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: vi.fn((table) => {
        // For devices query
        if (table && (table.name === 'devices' || table.tableName === 'devices')) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{
                id: 'device-001',
                teamId: 'team-001',
                isActive: true,
              }]),
            })),
          };
        }

        // For users query
        if (table && (table.name === 'users' || table.tableName === 'users')) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{
                id: 'user-001',
                code: 'test001',
                teamId: 'team-001',
                displayName: 'Test User',
                isActive: true,
              }]),
            })),
          };
        }

        // For user_pins query
        if (table && (table.name === 'user_pins' || table.tableName === 'user_pins')) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{
                userId: 'user-001',
                pinHash: 'hashed-pin',
                salt: 'salt',
              }]),
            })),
          };
        }

        // For supervisor_pins query
        if (table && (table.name === 'supervisor_pins' || table.tableName === 'supervisor_pins')) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{
                id: 'supervisor-001',
                teamId: 'team-001',
                name: 'Test Supervisor',
                pinHash: 'hashed-supervisor-pin',
                salt: 'salt',
                isActive: true,
              }]),
            })),
          };
        }

        // For sessions query
        if (table && (table.name === 'sessions' || table.tableName === 'sessions')) {
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{
                id: 'session-001',
                userId: 'user-001',
                deviceId: 'device-001',
                isActive: true,
                expiresAt: new Date('2025-01-02T00:00:00Z'),
                overrideUntil: null,
              }]),
            })),
          };
        }

        // Default fallback
        return {
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        };
      }),
    }));

    vi.spyOn(db, 'insert').mockImplementation(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    }));

    vi.spyOn(db, 'update').mockImplementation(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    }));

    // Mock the private recordLoginAttempt method
    vi.spyOn(AuthService as any, 'recordLoginAttempt').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      mockIsValidUUID.mockReturnValueOnce(false);

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
      vi.spyOn(db, 'select').mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

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
      // First call returns device, second call returns empty for user
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: vi.fn((table) => {
          if (table && (table.name === 'users' || table.tableName === 'users')) {
            return {
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([]),
              })),
            };
          }
          // Default to device query
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{
                id: 'device-001',
                teamId: 'team-001',
                isActive: true,
              }]),
            })),
          };
        }),
      }));

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

    it('should reject login when user is locked out', async () => {
      mockIsLockedOut.mockReturnValueOnce(true);
      mockGetLockoutStatus.mockReturnValueOnce({
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
      mockCheckLoginLimit.mockResolvedValueOnce({
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

    it('should reject login with wrong password', async () => {
      mockVerifyPassword.mockResolvedValueOnce(false);
      mockRecordFailedAttempt.mockReturnValueOnce({
        isLockedOut: false,
        remainingAttempts: 2,
      });

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
      expect(result.error?.message).toContain('2 attempts remaining');
    });

    it('should handle account lockout after failed attempts', async () => {
      mockVerifyPassword.mockResolvedValue(false);
      mockRecordFailedAttempt.mockReturnValueOnce({
        isLockedOut: true,
        remainingAttempts: 0,
        lockoutDuration: 900,
      });

      const result = await AuthService.login(
        {
          deviceId: 'device-001',
          userCode: 'test001',
          pin: 'wrongpin',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCOUNT_LOCKED');
      expect(result.error?.retryAfter).toBe(900);
    });

    it('should handle service errors gracefully', async () => {
      vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
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
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('An error occurred during login');
    });
  });

  describe('logout', () => {
    it('should logout successfully with valid session', async () => {
      const result = await AuthService.logout('session-001');

      expect(result.success).toBe(true);
      expect(mockRevokeSessionTokens).toHaveBeenCalledWith('session-001');
    });

    it('should return error for nonexistent session', async () => {
      vi.spyOn(db, 'select').mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

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
      mockRefreshToken.mockRejectedValueOnce(new Error('Invalid refresh token'));

      const result = await AuthService.refreshToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REFRESH_TOKEN');
      expect(result.error?.message).toContain('Invalid or expired refresh token');
    });
  });

  describe('whoami', () => {
    it('should return user information for valid token', async () => {
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

    it('should reject invalid token', async () => {
      mockVerifyToken.mockResolvedValueOnce({
        valid: false,
        payload: null,
      });

      const result = await AuthService.whoami('Bearer invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TOKEN');
      expect(result.error?.message).toBe('Invalid or expired token');
    });

    it('should reject when user not found', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: vi.fn((table) => {
          if (table && (table.name === 'users' || table.tableName === 'users')) {
            return {
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([]),
              })),
            };
          }
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          };
        }),
      }));

      const result = await AuthService.whoami('Bearer valid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
      expect(result.error?.message).toBe('User not found');
    });
  });

  describe('supervisorOverride', () => {
    it('should grant supervisor override with valid PIN', async () => {
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
      vi.spyOn(db, 'select').mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));

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

    it('should reject override when no supervisor PIN found', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: vi.fn((table) => {
          if (table && (table.name === 'supervisor_pins' || table.tableName === 'supervisor_pins')) {
            return {
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([]),
              })),
            };
          }
          return {
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{
                id: 'device-001',
                teamId: 'team-001',
                isActive: true,
              }]),
            })),
          };
        }),
      }));

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '123456',
          deviceId: 'device-001',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_SUPERVISOR_PIN');
      expect(result.error?.message).toBe('No active supervisor PIN found for this team');
    });

    it('should handle service errors gracefully', async () => {
      vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const result = await AuthService.supervisorOverride(
        {
          supervisorPin: '123456',
          deviceId: 'device-001',
        },
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toContain('An error occurred during supervisor override');
    });
  });
});