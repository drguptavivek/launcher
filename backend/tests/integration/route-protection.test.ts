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
import { FIXED_USERS, FIXED_DEVICE, FIXED_TEAM, FIXED_WEB_ADMIN } from '../../scripts/seed-fixed-users';

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

    // Use deterministic seeded data for consistent tests
    // Get the TEAM_MEMBER user (test001) and SYSTEM_ADMIN (web admin)
    const teamMemberUser = await db.select()
      .from(users)
      .where(eq(users.code, FIXED_USERS.TEAM_MEMBER.userCode))
      .limit(1);

    const systemAdmin = await db.select()
      .from(webAdminUsers)
      .where(eq(webAdminUsers.email, FIXED_WEB_ADMIN.email))
      .limit(1);

    if (teamMemberUser.length === 0 || systemAdmin.length === 0) {
      throw new Error('Seeded test data not found. Please run npm run db:seed-fixed first.');
    }

    mobileUser = teamMemberUser[0];
    adminUser = systemAdmin[0];

    // Get the team and organization for context
    const teamData = await db.select()
      .from(teams)
      .where(eq(teams.id, mobileUser.teamId))
      .limit(1);

    if (teamData.length === 0) {
      throw new Error('Test team not found.');
    }

    testTeam = teamData[0];

    // Create auth token for admin user
    const adminTokenResult = await JWTService.createToken({
      userId: adminUser.id,
      deviceId: FIXED_DEVICE.deviceId,
      sessionId: uuidv4(), // Generate valid session UUID
      type: 'web-admin'
    });
    authToken = adminTokenResult.token;

    // Create mobile auth token for user
    const mobileTokenResult = await JWTService.createToken({
      userId: mobileUser.id,
      deviceId: FIXED_DEVICE.deviceId,
      sessionId: uuidv4(), // Generate valid session UUID
      type: 'access'
    });
    mobileToken = mobileTokenResult.token;
  });

  afterEach(async () => {
    // Using seeded data, no cleanup needed
    // Test data persists across test runs for consistency
  });

  describe('Authentication Protection', () => {
    it('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        '/api/v1/users',
        '/api/v1/teams',
        '/api/v1/devices',
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
          email: FIXED_WEB_ADMIN.email,
          password: FIXED_WEB_ADMIN.password
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
          deviceId: FIXED_DEVICE.deviceId,
          userCode: FIXED_USERS.TEAM_MEMBER.userCode,
          pin: FIXED_USERS.TEAM_MEMBER.pin
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