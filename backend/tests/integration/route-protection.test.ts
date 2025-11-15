import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { users, userPins, webAdminUsers, organizations, teams } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { JWTService } from '../../src/services/jwt-service';

describe('Route Protection Security Tests', () => {
  let app: express.Application;
  let adminUser: any;
  let authToken: string;
  let mobileUser: any;
  let mobileToken: string;
  let testOrganization: any;
  let testTeam: any;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Clean up test data
    if (adminUser) {
      await db.delete(webAdminUsers).where(eq(webAdminUsers.id, adminUser.id));
    }
    if (mobileUser) {
      await db.delete(userPins).where(eq(userPins.userId, mobileUser.id));
      await db.delete(users).where(eq(users.id, mobileUser.id));
    }

    // Create test admin user
    adminUser = {
      id: uuidv4(),
      email: `test-admin-${Date.now()}@example.com`,
      password: await hashPassword('testAdminPassword123'),
      firstName: 'Test',
      lastName: 'Admin',
      role: 'SYSTEM_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(webAdminUsers).values(adminUser);

    // Create auth token for admin user
    const adminTokenResult = await JWTService.createWebAdminToken({
      userId: adminUser.id,
      deviceId: 'test-device',
      sessionId: 'test-session'
    });
    authToken = adminTokenResult.token;

    // Create test organization first
    testOrganization = await db.insert(organizations).values({
      name: 'Test Organization',
      displayName: 'Test Organization Display',
      code: 'TEST-ORG',
      isActive: true,
      isDefault: false,
      settings: {},
    }).returning({ id: organizations.id }).then(rows => rows[0]);

    // Create test team
    testTeam = await db.insert(teams).values({
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'TS',
      organizationId: testOrganization.id,
    }).returning({ id: teams.id }).then(rows => rows[0]);

    // Create test mobile user
    mobileUser = {
      id: uuidv4(),
      code: 'test001',
      teamId: testTeam.id, // Use existing team
      displayName: 'Test Mobile User',
      isActive: true,
    };

    await db.insert(users).values(mobileUser);

    // Create user PIN
    const pinHash = await hashPassword('123456');
    await db.insert(userPins).values({
      userId: mobileUser.id,
      pinHash: pinHash.hash,
      salt: pinHash.salt,
    });

    // Create mobile auth token
    const mobileTokenResult = await JWTService.createTokens({
      userId: mobileUser.id,
      deviceId: 'test-device-id',
      sessionId: 'test-session'
    });
    mobileToken = mobileTokenResult.accessToken;
  });

  afterEach(async () => {
    // Clean up test data
    if (adminUser) {
      await db.delete(webAdminUsers).where(eq(webAdminUsers.id, adminUser.id));
    }
    if (mobileUser) {
      await db.delete(userPins).where(eq(userPins.userId, mobileUser.id));
      await db.delete(users).where(eq(users.id, mobileUser.id));
    }
    if (testTeam) {
      await db.delete(teams).where(eq(teams.id, testTeam.id));
    }
    if (testOrganization) {
      await db.delete(organizations).where(eq(organizations.id, testOrganization.id));
    }
  });

  describe('Authentication Protection', () => {
    it('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        '/api/v1/users',
        '/api/v1/teams',
        '/piv1/devices',
        '/api/v1/projects',
        '/api/v1/organizations',
        '/api/v1/telemetry',
        '/api/v1/policy/test-device-id',
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)
          .get(route)
          .expect(401);

        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHENTICATED/);
      }
    });

    it('should require valid authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/INVALID_.*_TOKEN/);
    });

    it('should allow access with valid admin token', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it('should allow access with valid mobile token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${mobileToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe('Web Admin Routes Protection', () => {
    it('should allow login without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/web-admin/auth/login')
        .send({
          email: adminUser.email,
          password: 'testAdminPassword123'
        })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
    });

    it('should protect whoami endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/web-admin/auth/whoami')
        .expect(401);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/NO_TOKEN|MISSING_TOKEN/);
    });

    it('should protect logout endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/web-admin/auth/logout')
        .expect(401);

      expect(response.body.ok).toBe(false);
    });

    it('should protect refresh endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/web-admin/auth/refresh')
        .expect(401);

      expect(response.body.ok).toBe(false);
    });

    it('should protect create-admin endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/web-admin/auth/create-admin')
        .send({
          email: 'hacker@evil.com',
          role: 'SYSTEM_ADMIN'
        })
        .expect(401);

      expect(response.body.ok).toBe(false);
    });
  });

  describe('Mobile Routes Protection', () => {
    it('should require authentication for auth endpoints except login', async () => {
      // Test protected auth endpoints
      const protectedEndpoints = [
        { method: 'GET', path: '/api/v1/auth/whoami' },
        { method: 'POST', path: '/api/v1/auth/logout' },
        { method: 'POST', path: '/api/v1/auth/session/end' },
        { method: 'POST', path: '/api/v1/auth/heartbeat' },
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .expect(401);

        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHENTICATED/);
      }
    });

    it('should protect refresh endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid' })
        .expect(401);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_REFRESH_TOKEN/);
    });

    it('should allow login without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: 'test-device-id',
          userCode: mobileUser.code,
          pin: '123456'
        })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.session).toBeDefined();
    });
  });

  describe('Permission Enforcement', () => {
    it('should deny access to admin-only endpoints for regular users', async () => {
      const response = await request(app)
        .post('/api/v1/web-admin/auth/create-admin')
        .set('Authorization', `Bearer ${mobileToken}`)
        .send({
          email: 'hacker@evil.com',
          role: 'SYSTEM_ADMIN'
        })
        .expect(403);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should enforce role hierarchy in API access', async () => {
      // Test that regular mobile user can't access admin resources
      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${mobileToken}`)
        .expect(403);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/INSUFFICIENT_PERMISSIONS|PERMISSION_DENIED/);
    });
  });

  describe('Input Validation', () => {
    it('should reject malformed requests to protected endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject requests with malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.ok).toBe(false);
    });
  });

  describe('Security Headers', () => {
    it('should handle requests without Content-Type gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid data')
        .expect(400);

      expect(response.body.ok).toBe(false);
    });

    it('should prevent access to non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent')
        .expect(404);
    });
  });
});