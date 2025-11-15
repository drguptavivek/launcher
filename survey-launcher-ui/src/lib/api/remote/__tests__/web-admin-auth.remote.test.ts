import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { webAdminLogin, getWebAdminWhoAmI, webAdminLogout, refreshWebAdminToken, createWebAdminUser } from '../web-admin-auth.remote';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Web Admin Auth Remote Functions', () => {
  const mockApiBase = 'https://api.example.com';

  beforeEach(() => {
    mockFetch.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('webAdminLogin', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        ok: true,
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'SYSTEM_ADMIN',
          fullName: 'Admin User'
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([
          ['set-cookie', ['access_token=access-token-123; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1200']]
        ])
      });

      const result = await webAdminLogin({
        email: 'admin@example.com',
        password: 'password123'
      });

      expect(result.ok).toBe(true);
      expect(result.user?.email).toBe('admin@example.com');
      expect(result.user?.fullName).toBe('Admin User');
      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/api/web-admin/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'admin@example.com',
            password: 'password123'
          }),
          credentials: 'include'
        }
      );
    });

    it('should handle login failure', async () => {
      const mockErrorResponse = {
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      const result = await webAdminLogin({
        email: 'admin@example.com',
        password: 'wrongpassword'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.error?.message).toBe('Invalid email or password');
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const result = await webAdminLogin({
        email: 'admin@example.com',
        password: 'password123'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('LOGIN_ERROR');
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      const result = await webAdminLogin({
        email: 'admin@example.com',
        password: 'password123'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('LOGIN_ERROR');
    });
  });

  describe('getWebAdminWhoAmI', () => {
    it('should get user information successfully', async () => {
      const mockResponse = {
        ok: true,
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'SYSTEM_ADMIN',
          fullName: 'Admin User',
          lastLoginAt: '2024-01-15T10:30:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getWebAdminWhoAmI();

      expect(result.ok).toBe(true);
      expect(result.user?.email).toBe('admin@example.com');
      expect(result.user?.role).toBe('SYSTEM_ADMIN');
      expect(result.user?.lastLoginAt).toBe('2024-01-15T10:30:00Z');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/api/web-admin/auth/whoami`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
    });

    it('should handle not authenticated error', async () => {
      const mockResponse = {
        ok: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No access token provided'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getWebAdminWhoAmI();

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_AUTHENTICATED');
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('should handle invalid token error', async () => {
      const mockResponse = {
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getWebAdminWhoAmI();

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_TOKEN');
      expect(result.error?.message).toBe('Invalid or expired token');
    });
  });

  describe('webAdminLogout', () => {
    it('should logout successfully', async () => {
      const mockResponse = {
        ok: true,
        message: 'Logout successful'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await webAdminLogout();

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Logout successful');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/api/web-admin/auth/logout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
    });

    it('should handle logout error', async () => {
      const logoutError = new Error('Logout failed');
      mockFetch.mockRejectedValueOnce(logoutError);

      await expect(webAdminLogout()).rejects.toThrow('Logout failed');
    });
  });

  describe('refreshWebAdminToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        ok: true,
        accessToken: 'new-access-token-123',
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'SYSTEM_ADMIN',
          fullName: 'Admin User'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await refreshWebAdminToken();

      expect(result.ok).toBe(true);
      expect(result.accessToken).toBe('new-access-token-123');
      expect(result.user?.email).toBe('admin@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/api/web-admin/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );
    });

    it('should handle token refresh failure', async () => {
      const mockErrorResponse = {
        ok: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      await expect(refreshWebAdminToken()).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('createWebAdminUser', () => {
    it('should create admin user successfully', async () => {
      const mockResponse = {
        ok: true,
        user: {
          id: 'new-user-123',
          email: 'newadmin@example.com',
          firstName: 'New',
          lastName: 'Admin',
          role: 'SUPPORT_AGENT',
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z'
        },
        message: 'Admin user created successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createWebAdminUser({
        email: 'newadmin@example.com',
        password: 'newPassword123',
        firstName: 'New',
        lastName: 'Admin',
        role: 'SUPPORT_AGENT'
      });

      expect(result.ok).toBe(true);
      expect(result.user?.email).toBe('newadmin@example.com');
      expect(result.user?.role).toBe('SUPPORT_AGENT');
      expect(result.message).toBe('Admin user created successfully');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiBase}/api/web-admin/auth/create-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'newadmin@example.com',
            password: 'newPassword123',
            firstName: 'New',
            lastName: 'Admin',
            role: 'SUPPORT_AGENT'
          }),
          credentials: 'include'
        }
      );
    });

    it('should handle user creation failure', async () => {
      const mockErrorResponse = {
        ok: false,
        error: {
          code: 'CREATION_FAILED',
          message: 'Email already exists'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      const result = await createWebAdminUser({
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('CREATION_ERROR');
      expect(result.error?.message).toBe('Email already exists');
    });

    it('should use default role when not specified', async () => {
      const mockResponse = {
        ok: true,
        user: {
          id: 'default-user-123',
          email: 'default@example.com',
          firstName: 'Default',
          lastName: 'User',
          role: 'SYSTEM_ADMIN',
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z'
        },
        message: 'Admin user created successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createWebAdminUser({
        email: 'default@example.com',
        password: 'password123',
        firstName: 'Default',
        lastName: 'User'
        // No role specified
      });

      expect(result.ok).toBe(true);
      expect(result.user?.role).toBe('SYSTEM_ADMIN');
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const result = await getWebAdminWhoAmI();

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('WHOAMI_ERROR');
    });

    it('should handle fetch timeouts', async () => {
      const timeoutError = new Error('Fetch timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      const result = await webAdminLogin({
        email: 'admin@example.com',
        password: 'password123'
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('LOGIN_ERROR');
    });

    it('should log errors to console', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      await webAdminLogin({
        email: 'admin@example.com',
        password: 'password123'
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Web admin login error:',
        networkError
      );
    });
  });

  describe('Type Safety', () => {
    it('should handle typed responses correctly', async () => {
      const mockResponse = {
        ok: true,
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'SYSTEM_ADMIN',
          fullName: 'Admin User'
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await webAdminLogin({
        email: 'admin@example.com',
        password: 'password123'
      });

      // TypeScript should enforce these types
      expect(result.ok).toBe(true);
      if (result.ok && result.user) {
        expect(typeof result.user.id).toBe('string');
        expect(typeof result.user.email).toBe('string');
        expect(typeof result.user.firstName).toBe('string');
        expect(typeof result.user.lastName).toBe('string');
        expect(['TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER', 'SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR', 'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN']).toContain(result.user.role);
        expect(typeof result.accessToken).toBe('string');
        expect(typeof result.refreshToken).toBe('string');
      }
    });
  });
});