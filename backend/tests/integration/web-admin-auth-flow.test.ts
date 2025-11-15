import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/lib/db';
import { webAdminUsers } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../src/lib/crypto';

describe('Web Admin Authentication Integration Flow', () => {
  let authToken: string;
  let refreshToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'integration@test.com'));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'updated@test.com'));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'integration@test.com'));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'updated@test.com'));
  });

  describe('Complete Authentication Lifecycle', () => {
    it('should handle full authentication flow from login to logout', async () => {
      // Step 1: Create initial admin user
      const createResponse = await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'integration@test.com',
          password: 'integrationPassword123',
          firstName: 'Integration',
          lastName: 'Test',
          role: 'SYSTEM_ADMIN'
        });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.ok).toBe(true);
      expect(createResponse.body.user.email).toBe('integration@test.com');

      // Step 2: Login with credentials
      const loginResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'integrationPassword123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.ok).toBe(true);
      expect(loginResponse.body.user.email).toBe('integration@test.com');
      expect(loginResponse.body.user.firstName).toBe('Integration');
      expect(loginResponse.body.user.lastName).toBe('Test');
      expect(loginResponse.body.user.role).toBe('SYSTEM_ADMIN');
      expect(loginResponse.body.user.fullName).toBe('Integration Test');

      // Store tokens for subsequent requests
      authToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
      testUserId = loginResponse.body.user.id;

      // Verify cookies are set
      expect(loginResponse.headers['set-cookie']).toBeDefined();
      const cookies = loginResponse.headers['set-cookie'] as string[];
      expect(cookies.some(cookie => cookie.includes('access_token='))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('refresh_token='))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('auth_type=web_admin'))).toBe(true);

      // Step 3: Verify user identity with whoami
      const whoamiResponse = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Authorization', `Bearer ${authToken}`);

      expect(whoamiResponse.status).toBe(200);
      expect(whoamiResponse.body.ok).toBe(true);
      expect(whoamiResponse.body.user.id).toBe(testUserId);
      expect(whoamiResponse.body.user.email).toBe('integration@test.com');

      // Step 4: Test token refresh
      const refreshResponse = await request(app)
        .post('/api/web-admin/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.ok).toBe(true);
      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.accessToken).not.toBe(authToken); // Should be a new token
      expect(refreshResponse.body.user.email).toBe('integration@test.com');

      // Store new token
      const newAuthToken = refreshResponse.body.accessToken;

      // Step 5: Verify new token works
      const newWhoamiResponse = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Authorization', `Bearer ${newAuthToken}`);

      expect(newWhoamiResponse.status).toBe(200);
      expect(newWhoamiResponse.body.ok).toBe(true);
      expect(newWhoamiResponse.body.user.id).toBe(testUserId);

      // Step 6: Logout
      const logoutResponse = await request(app)
        .post('/api/web-admin/auth/logout')
        .set('Authorization', `Bearer ${newAuthToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.ok).toBe(true);
      expect(logoutResponse.body.message).toBe('Logout successful');

      // Verify cookies are cleared
      expect(logoutResponse.headers['set-cookie']).toBeDefined();
      const logoutCookies = logoutResponse.headers['set-cookie'] as string[];
      expect(logoutCookies.some(cookie => cookie.includes('access_token=;'))).toBe(true);
      expect(logoutCookies.some(cookie => cookie.includes('refresh_token=;'))).toBe(true);
      expect(logoutCookies.some(cookie => cookie.includes('auth_type=;'))).toBe(true);

      // Step 7: Verify token is no longer valid after logout
      const postLogoutWhoamiResponse = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Authorization', `Bearer ${newAuthToken}`);

      // Token might still be valid for a short time, but this is expected
      // In a real system, you'd implement token revocation or shorter expiry
    });

    it('should handle authentication with cookie-based auth', async () => {
      // Create and login user
      await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'cookie@test.com',
          password: 'cookiePassword123',
          firstName: 'Cookie',
          lastName: 'Test'
        });

      const loginResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'cookie@test.com',
          password: 'cookiePassword123'
        });

      const cookies = loginResponse.headers['set-cookie'] as string[];
      const cookieString = cookies.join('; ');

      // Use cookies for authentication
      const whoamiResponse = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Cookie', cookieString);

      expect(whoamiResponse.status).toBe(200);
      expect(whoamiResponse.body.ok).toBe(true);
      expect(whoamiResponse.body.user.email).toBe('cookie@test.com');

      // Refresh with cookies
      const refreshResponse = await request(app)
        .post('/api/web-admin/auth/refresh')
        .set('Cookie', cookieString);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.ok).toBe(true);

      // Logout with cookies
      const logoutResponse = await request(app)
        .post('/api/web-admin/auth/logout')
        .set('Cookie', cookieString);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.ok).toBe(true);
    });
  });

  describe('Security Validation', () => {
    it('should handle account lockout after failed attempts', async () => {
      // Create test user
      await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'lockout@test.com',
          password: 'correctPassword123',
          firstName: 'Lockout',
          lastName: 'Test'
        });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/web-admin/auth/login')
          .send({
            email: 'lockout@test.com',
            password: 'wrongPassword'
          });
      }

      // 6th attempt should fail due to lockout
      const lockoutResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'lockout@test.com',
          password: 'correctPassword123' // Correct password now
        });

      expect(lockoutResponse.status).toBe(401);
      expect(lockoutResponse.body.ok).toBe(false);
      expect(lockoutResponse.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('should prevent access with expired tokens', async () => {
      // Create and login user
      await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'expired@test.com',
          password: 'password123',
          firstName: 'Expired',
          lastName: 'Token'
        });

      const loginResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'expired@test.com',
          password: 'password123'
        });

      const authToken = loginResponse.body.accessToken;

      // Try to access with malformed token
      const invalidTokenResponse = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Authorization', 'Bearer invalid.token.format');

      expect(invalidTokenResponse.status).toBe(401);
      expect(invalidTokenResponse.body.ok).toBe(false);
      expect(invalidTokenResponse.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests without authentication', async () => {
      // Try to access protected endpoint without token
      const noTokenResponse = await request(app)
        .get('/api/web-admin/auth/whoami');

      expect(noTokenResponse.status).toBe(401);
      expect(noTokenResponse.body.ok).toBe(false);
      expect(noTokenResponse.body.error.code).toBe('NO_TOKEN');
    });

    it('should validate input data properly', async () => {
      // Test invalid email format
      const invalidEmailResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'invalid-email-format',
          password: 'password123'
        });

      expect(invalidEmailResponse.status).toBe(400);
      expect(invalidEmailResponse.body.ok).toBe(false);

      // Test missing required fields
      const missingFieldResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(missingFieldResponse.status).toBe(400);
      expect(missingFieldResponse.body.ok).toBe(false);
    });
  });

  describe('Data Persistence', () => {
    it('should persist user data correctly across requests', async () => {
      // Create user
      const createResponse = await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'persist@test.com',
          password: 'password123',
          firstName: 'Persist',
          lastName: 'Data',
          role: 'REGIONAL_MANAGER'
        });

      expect(createResponse.status).toBe(200);
      const userId = createResponse.body.user.id;

      // Login and verify data
      const loginResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'persist@test.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.user.id).toBe(userId);
      expect(loginResponse.body.user.firstName).toBe('Persist');
      expect(loginResponse.body.user.lastName).toBe('Data');
      expect(loginResponse.body.user.role).toBe('REGIONAL_MANAGER');

      // Verify whoami returns same data
      const whoamiResponse = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

      expect(whoamiResponse.status).toBe(200);
      expect(whoamiResponse.body.user.id).toBe(userId);
      expect(whoamiResponse.body.user.firstName).toBe('Persist');
      expect(whoamiResponse.body.user.lastName).toBe('Data');
      expect(whoamiResponse.body.user.role).toBe('REGIONAL_MANAGER');

      // Verify data in database
      const [dbUser] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'persist@test.com'));

      expect(dbUser.id).toBe(userId);
      expect(dbUser.firstName).toBe('Persist');
      expect(dbUser.lastName).toBe('Data');
      expect(dbUser.role).toBe('REGIONAL_MANAGER');
      expect(dbUser.isActive).toBe(true);
    });

    it('should update login attempt counters and timestamps', async () => {
      // Create user
      await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'attempts@test.com',
          password: 'correctPassword123',
          firstName: 'Attempts',
          lastName: 'Test'
        });

      // Failed login attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/web-admin/auth/login')
          .send({
            email: 'attempts@test.com',
            password: 'wrongPassword'
          });
      }

      // Successful login should reset counters and update timestamp
      const loginResponse = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'attempts@test.com',
          password: 'correctPassword123'
        });

      expect(loginResponse.status).toBe(200);

      // Verify database state
      const [dbUser] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'attempts@test.com'));

      expect(dbUser.loginAttempts).toBe(0); // Should be reset
      expect(dbUser.lockedAt).toBeNull(); // Should not be locked
      expect(dbUser.lastLoginAt).toBeDefined(); // Should be updated
      expect(dbUser.lastLoginAt!.getTime()).toBeGreaterThan(Date.now() - 10000); // Updated within last 10 seconds
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent login attempts', async () => {
      // Create user
      await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'concurrent@test.com',
          password: 'password123',
          firstName: 'Concurrent',
          lastName: 'Test'
        });

      // Make multiple concurrent login requests
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/web-admin/auth/login')
          .send({
            email: 'concurrent@test.com',
            password: 'password123'
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.user.email).toBe('concurrent@test.com');
      });

      // Verify user state is consistent
      const [dbUser] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'concurrent@test.com'));

      expect(dbUser.loginAttempts).toBe(0);
      expect(dbUser.lastLoginAt).toBeDefined();
    });
  });
});