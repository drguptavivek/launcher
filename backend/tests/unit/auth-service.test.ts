import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all external dependencies at the top level before imports
vi.mock('../../src/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../src/lib/crypto', () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
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
    createToken: vi.fn(),
    verifyToken: vi.fn(),
    refreshToken: vi.fn(),
    revokeSessionTokens: vi.fn(),
  },
}));

vi.mock('../../src/services/rate-limiter', () => ({
  RateLimiter: {
    checkLoginLimit: vi.fn().mockResolvedValue({ allowed: true }),
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
const mockDbDelete = vi.mocked(db.delete);
const mockJWTService = vi.mocked(JWTService);
const mockRateLimiter = vi.mocked(RateLimiter);
const mockPinLockoutService = vi.mocked(PinLockoutService);

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    mockRateLimiter.checkLoginLimit.mockResolvedValue({ allowed: true });
    mockPinLockoutService.isLockedOut.mockReturnValue(false);
    mockPinLockoutService.recordFailedAttempt.mockReturnValue({ isLockedOut: false, remainingAttempts: 3 });

    // Reset database mocks
    mockDbSelect.mockReset();
    mockDbInsert.mockReset();
    mockDbUpdate.mockReset();
    mockDbDelete.mockReset();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Mock device query
      const mockDeviceQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'device-001',
            teamId: 'team-001',
            isActive: true
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockDeviceQuery as any);

      // Mock user query
      const mockUserQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'user-001',
            code: 'test001',
            teamId: 'team-001',
            isActive: true
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockUserQuery as any);

      // Mock PIN query
      const mockPinQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            userId: 'user-001',
            pinHash: 'hash',
            salt: 'salt'
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockPinQuery as any);

      // Mock session insert
      const mockSessionInsert = {
        values: vi.fn().mockResolvedValue(undefined),
      };
      mockDbInsert.mockReturnValue(mockSessionInsert as any);

      // Mock device update
      const mockDeviceUpdate = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      };
      mockDbUpdate.mockReturnValue(mockDeviceUpdate as any);

      // Mock password verification
      mockVerifyPassword.mockResolvedValue(true);

      // Mock JWT token creation
      mockJWTService.createToken
        .mockResolvedValueOnce({ token: 'access.token', expiresAt: new Date() })
        .mockResolvedValueOnce({ token: 'refresh.token', expiresAt: new Date() });

      const result = await AuthService.login(
        { deviceId: '123e4567-e89b-12d3-a456-426614174000', userCode: 'test001', pin: '123456' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(true);
      expect(result.session?.userId).toBe('user-001');
      expect(result.session?.deviceId).toBe('device-001');
      expect(result.accessToken).toBe('access.token');
      expect(result.refreshToken).toBe('refresh.token');
    });

    it('should reject login with invalid UUID device ID', async () => {
      const result = await AuthService.login(
        { deviceId: 'invalid-uuid', userCode: 'test001', pin: '123456' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should reject login for nonexistent device', async () => {
      // Mock device query returning empty array
      const mockDeviceQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      };
      mockDbSelect.mockReturnValue(mockDeviceQuery as any);

      const result = await AuthService.login(
        { deviceId: '123e4567-e89b-12d3-a456-426614174000', userCode: 'test001', pin: '123456' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should reject login for nonexistent user', async () => {
      // Mock device query
      const mockDeviceQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'device-001',
            teamId: 'team-001',
            isActive: true
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockDeviceQuery as any);

      // Mock user query returning empty array
      const mockUserQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      };
      mockDbSelect.mockReturnValue(mockUserQuery as any);

      const result = await AuthService.login(
        { deviceId: '123e4567-e89b-12d3-a456-426614174000', userCode: 'nonexistent', pin: '123456' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with wrong password', async () => {
      // Mock device query
      const mockDeviceQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'device-001',
            teamId: 'team-001',
            isActive: true
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockDeviceQuery as any);

      // Mock user query
      const mockUserQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'user-001',
            teamId: 'team-001',
            isActive: true
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockUserQuery as any);

      // Mock PIN query
      const mockPinQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            userId: 'user-001',
            pinHash: 'hash',
            salt: 'salt'
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockPinQuery as any);

      // Mock password verification to return false
      mockVerifyPassword.mockResolvedValue(false);

      const result = await AuthService.login(
        { deviceId: '123e4567-e89b-12d3-a456-426614174000', userCode: 'test001', pin: 'wrongpin' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('whoami', () => {
    it('should return user information for valid token', async () => {
      // Mock JWT token verification
      mockJWTService.verifyToken.mockResolvedValue({
        valid: true,
        payload: {
          sub: 'user-001',
          'x-device-id': 'device-001',
          'x-session-id': 'session-001',
          'x-team-id': 'team-001',
        },
      });

      // Mock user query
      const mockUserQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'user-001',
            code: 'test001',
            teamId: 'team-001',
            displayName: 'Test User'
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockUserQuery as any);

      // Mock session query
      const mockSessionQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'session-001',
            deviceId: 'device-001',
            expiresAt: new Date(),
            isActive: true,
            overrideUntil: null
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockSessionQuery as any);

      const result = await AuthService.whoami('Bearer valid.token');

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('user-001');
      expect(result.session?.sessionId).toBe('session-001');
    });

    it('should reject invalid token', async () => {
      mockJWTService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const result = await AuthService.whoami('Bearer invalid.token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TOKEN');
    });

    it('should reject missing authorization header', async () => {
      const result = await AuthService.whoami('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TOKEN');
    });

    it('should reject malformed authorization header', async () => {
      const result = await AuthService.whoami('InvalidHeader token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TOKEN');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockJWTService.revokeSessionTokens.mockResolvedValue(true);

      const result = await AuthService.logout('session-001', 'user-001');

      expect(result.success).toBe(true);
      expect(mockJWTService.revokeSessionTokens).toHaveBeenCalledWith('session-001', 'user-001');
    });

    it('should handle logout service errors gracefully', async () => {
      mockJWTService.revokeSessionTokens.mockRejectedValue(new Error('Database error'));

      const result = await AuthService.logout('session-001', 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockJWTService.refreshToken.mockResolvedValue({
        accessToken: 'new.access.token',
        expiresAt: new Date(),
      });

      const result = await AuthService.refreshToken('valid.refresh.token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new.access.token');
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      mockJWTService.refreshToken.mockRejectedValue(new Error('Invalid or expired refresh token'));

      const result = await AuthService.refreshToken('invalid.refresh.token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('supervisorOverride', () => {
    it('should grant supervisor override with valid PIN', async () => {
      // Mock device query
      const mockDeviceQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'device-001',
            teamId: 'team-001',
            isActive: true
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockDeviceQuery as any);

      // Mock supervisor PIN query
      const mockPinQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'sup-001',
            teamId: 'team-001',
            isActive: true,
            pinHash: 'hash',
            salt: 'salt'
          }]),
        }),
      };
      mockDbSelect.mockReturnValue(mockPinQuery as any);

      // Mock password verification
      mockVerifyPassword.mockResolvedValue(true);

      // Mock JWT token creation
      mockJWTService.createToken.mockResolvedValue({
        token: 'override.token',
        expiresAt: new Date(),
      });

      const result = await AuthService.supervisorOverride(
        { supervisorPin: '789012', deviceId: '123e4567-e89b-12d3-a456-426614174000' },
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe('override.token');
      expect(result.overrideUntil).toBeDefined();
    });

    it('should reject override for nonexistent device', async () => {
      // Mock device query returning empty
      const mockDeviceQuery = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      };
      mockDbSelect.mockReturnValue(mockDeviceQuery as any);

      const result = await AuthService.supervisorOverride(
        { supervisorPin: '789012', deviceId: '123e4567-e89b-12d3-a456-426614174000' },
        '127.0.0.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should handle supervisor override service errors', async () => {
      // Force an error by not mocking the database properly
      mockDbSelect.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await AuthService.supervisorOverride(
        { supervisorPin: '789012', deviceId: '123e4567-e89b-12d3-a456-426614174000' },
        '127.0.0.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
    });
  });
});