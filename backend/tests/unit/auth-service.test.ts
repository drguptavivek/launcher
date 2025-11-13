import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/services/auth-service';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins, sessions, pinAttempts } from '../../src/lib/db/schema';
import { hashPassword, verifyPassword } from '../../src/lib/crypto';
import { JWTService } from '../../src/services/jwt-service';
import { eq } from 'drizzle-orm';

// Mock the database
vi.mock('../../src/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock password verification
const mockVerifyPassword = vi.mocked(verifyPassword);

// Mock JWT service
const mockJWTService = vi.mocked(JWTService);

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Mock database responses
      const mockDevice = { id: 'device-001', teamId: 'team-001', isActive: true };
      const mockUser = { id: 'user-001', code: 'test001', teamId: 'team-001', isActive: true };
      const mockUserPin = { userId: 'user-001', pinHash: 'hash', salt: 'salt' };
      const mockSession = { sessionId: 'session-001', userId: 'user-001' };

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockDevice]),
        }),
      } as any);

      // Mock password verification to return true
      mockVerifyPassword.mockResolvedValue(true);

      const result = await AuthService.login(
        { deviceId: 'device-001', userCode: 'test001', pin: '123456' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('user-001');
      expect(result.session?.sessionId).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject login for inactive device', async () => {
      const mockDevice = { id: 'device-001', isActive: false };

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockDevice]),
        }),
      } as any);

      const result = await AuthService.login(
        { deviceId: 'device-001', userCode: 'test001', pin: '123456' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should reject login for nonexistent device', async () => {
      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await AuthService.login(
        { deviceId: 'nonexistent', userCode: 'test001', pin: '123456' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should reject login with wrong password', async () => {
      const mockDevice = { id: 'device-001', teamId: 'team-001', isActive: true };
      const mockUser = { id: 'user-001', teamId: 'team-001', isActive: true };
      const mockUserPin = { userId: 'user-001', pinHash: 'hash', salt: 'salt' };

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockDevice]),
        }),
      } as any);

      // Mock password verification to return false
      mockVerifyPassword.mockResolvedValue(false);

      const result = await AuthService.login(
        { deviceId: 'device-001', userCode: 'test001', pin: 'wrongpin' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('whoami', () => {
    it('should return user information for valid token', async () => {
      const mockUser = { id: 'user-001', code: 'test001', teamId: 'team-001', displayName: 'Test User' };
      const mockSession = { sessionId: 'session-001', deviceId: 'device-001', expiresAt: new Date(), isActive: true };

      mockJWTService.verifyToken.mockResolvedValue({
        valid: true,
        payload: {
          sub: 'user-001',
          'x-device-id': 'device-001',
          'x-session-id': 'session-001',
          'x-team-id': 'team-001',
        },
      });

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockUser, mockSession]),
        }),
      } as any);

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
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockSession = { sessionId: 'session-001', isActive: true };

      mockJWTService.verifyToken.mockResolvedValue({
        valid: true,
        payload: {
          sub: 'user-001',
          'x-session-id': 'session-001',
        },
      });

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSession]),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await AuthService.logout('session-001', 'user-001');

      expect(result.success).toBe(true);
    });

    it('should reject logout for nonexistent session', async () => {
      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await AuthService.logout('nonexistent-session', 'user-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockSession = { sessionId: 'session-001', isActive: true };

      mockJWTService.verifyToken.mockResolvedValue({
        valid: true,
        payload: {
          sub: 'user-001',
          'x-device-id': 'device-001',
          'x-session-id': 'session-001',
          'x-team-id': 'team-001',
        },
      });

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSession]),
        }),
      } as any);

      vi.mocked(require('../../src/services/jwt-service').JWTService.createToken).mockResolvedValue({
        token: 'new.access.token',
        expiresAt: new Date(),
        jti: 'new-jti',
      });

      const result = await AuthService.refreshToken('valid.refresh.token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new.access.token');
    });

    it('should reject invalid refresh token', async () => {
      mockJWTService.verifyToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const result = await AuthService.refreshToken('invalid.refresh.token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should reject refresh for inactive session', async () => {
      const mockSession = { sessionId: 'session-001', isActive: false };

      mockJWTService.verifyToken.mockResolvedValue({
        valid: true,
        payload: {
          sub: 'user-001',
          'x-session-id': 'session-001',
        },
      });

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSession]),
        }),
      } as any);

      const result = await AuthService.refreshToken('valid.refresh.token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('supervisorOverride', () => {
    it('should grant supervisor override with valid PIN', async () => {
      const mockDevice = { id: 'device-001', teamId: 'team-001', isActive: true };
      const mockSupervisorPin = { id: 'sup-001', teamId: 'team-001', isActive: true, pinHash: 'hash', salt: 'salt' };

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockDevice, mockSupervisorPin]),
        }),
      } as any);

      // Mock password verification to return true
      mockVerifyPassword.mockResolvedValue(true);

      vi.mocked(require('../../src/services/jwt-service').JWTService.createToken).mockResolvedValue({
        token: 'override.token',
        expiresAt: new Date(),
        jti: 'override-jti',
      });

      const result = await AuthService.supervisorOverride(
        { supervisorPin: '789012', deviceId: 'device-001' },
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe('override.token');
      expect(result.overrideUntil).toBeDefined();
    });

    it('should reject override with invalid PIN', async () => {
      const mockDevice = { id: 'device-001', teamId: 'team-001', isActive: true };
      const mockSupervisorPin = { id: 'sup-001', teamId: 'team-001', isActive: true, pinHash: 'hash', salt: 'salt' };

      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockDevice, mockSupervisorPin]),
        }),
      } as any);

      // Mock password verification to return false
      mockVerifyPassword.mockResolvedValue(false);

      const result = await AuthService.supervisorOverride(
        { supervisorPin: 'wrongpin', deviceId: 'device-001' },
        '127.0.0.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject override for nonexistent device', async () => {
      vi.mocked(db.select).mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await AuthService.supervisorOverride(
        { supervisorPin: '789012', deviceId: 'nonexistent' },
        '127.0.0.1'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
    });
  });
});