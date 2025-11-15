import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/lib/db';
import { webAdminUsers } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../src/lib/crypto';

describe('Web Admin API Routes', () => {
  let authToken: string;
  let refreshToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test admin user
    const passwordHash = await hashPassword('testPassword123');
    const [testUser] = await db.insert(webAdminUsers).values({
      email: 'test@example.com',
      password: passwordHash,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'SYSTEM_ADMIN',
      isActive: true
    }).returning();

    testUserId = testUser.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/web-admin/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testPassword123'
      });

    authToken = loginResponse.body.accessToken;
    refreshToken = loginResponse.body.refreshToken;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'test@example.com'));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'newuser@example.com'));
  });

  describe('POST /api/web-admin/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.firstName).toBe('Test');
      expect(response.body.user.lastName).toBe('Admin');
      expect(response.body.user.role).toBe('SYSTEM_ADMIN');
      expect(response.body.user.fullName).toBe('Test Admin');
      expect(response.body.accessToken).toBeDefined();

      // Check cookies are set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'] as string[];
      expect(cookies.some(cookie => cookie.startsWith('access_token='))).toBe(true);
      expect(cookies.some(cookie => cookie.startsWith('refresh_token='))).toBe(true);
      expect(cookies.some(cookie => cookie.startsWith('auth_type=web_admin'))).toBe(true);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anyPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/web-admin/auth/whoami', () => {
    it('should return user information with valid token', async () => {
      const response = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.firstName).toBe('Test');
      expect(response.body.user.lastName).toBe('Admin');
      expect(response.body.user.role).toBe('SYSTEM_ADMIN');
      expect(response.body.user.fullName).toBe('Test Admin');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/web-admin/auth/whoami');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should work with cookie-based authentication', async () => {
      const response = await request(app)
        .get('/api/web-admin/auth/whoami')
        .set('Cookie', `access_token=${authToken}; auth_type=web_admin`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('POST /api/web-admin/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.message).toBe('Logout successful');

      // Check cookies are cleared
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'] as string[];
      expect(cookies.some(cookie => cookie.includes('access_token=;'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('refresh_token=;'))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('auth_type=;'))).toBe(true);
    });

    it('should work with cookie-based logout', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/logout')
        .set('Cookie', `access_token=${authToken}; auth_type=web_admin`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it('should logout even without token (graceful handling)', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  describe('POST /api/web-admin/auth/refresh', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should work with cookie-based refresh', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}; auth_type=web_admin`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('NO_REFRESH_TOKEN');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/refresh')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /api/web-admin/auth/create-admin', () => {
    it('should create new admin user successfully', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'newuser@example.com',
          password: 'newPassword123',
          firstName: 'New',
          lastName: 'User',
          role: 'SUPPORT_AGENT'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.firstName).toBe('New');
      expect(response.body.user.lastName).toBe('New');
      expect(response.body.user.role).toBe('SUPPORT_AGENT');
      expect(response.body.message).toBe('Admin user created successfully');

      // Verify user was created in database
      const [user] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'newuser@example.com'));

      expect(user).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
    });

    it('should use default role when not specified', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'defaultuser@example.com',
          password: 'password123',
          firstName: 'Default',
          lastName: 'User'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('SYSTEM_ADMIN');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'incomplete@example.com',
          password: 'password123'
          // Missing firstName and lastName
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'short@example.com',
          password: '123', // Too short
          firstName: 'Short',
          lastName: 'Password'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('at least 8 characters');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/create-admin')
        .send({
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Invalid',
          lastName: 'Email'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Security and CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/web-admin/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204); // No content for successful preflight
    });

    it('should include proper security headers', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123'
        });

      // Check for security headers
      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should sanitize error messages', async () => {
      const response = await request(app)
        .post('/api/web-admin/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).not.toContain('sql');
      expect(response.body.error.message).not.toContain('database');
    });
  });
});