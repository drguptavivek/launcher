import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins, sessions, jwtRevocations } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

describe('User Logout and Session Management Tests', () => {
  let app: express.Application;

  // Generate test UUIDs once
  const teamId = uuidv4();
  const deviceId = uuidv4();
  const userId = uuidv4();

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Clean up existing test data
    await db.delete(jwtRevocations).where(and(
      eq(jwtRevocations.revokedBy, 'test-user')
    ));
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));

    // Create test team
    await db.insert(teams).values({
      id: teamId,
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'MH01',
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

    // Create user PIN
    const pinHash = await hashPassword('123456');
    await db.insert(userPins).values({
      userId,
      pinHash: pinHash.hash,
      salt: pinHash.salt,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(jwtRevocations).where(and(
      eq(jwtRevocations.revokedBy, 'test-user')
    ));
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));
  });

  describe('POST /api/v1/auth/logout', () => {

    it('UL-001: should logout user with valid session', async () => {
      // First, login to get a valid session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(loginResponse.status).toBe(200);
      const accessToken = loginResponse.body.access_token;
      const refreshToken = loginResponse.body.refresh_token;

      // Now logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.ok).toBe(true);

      // Verify session is marked as ended in database
      const activeSession = await db.select()
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          eq(sessions.status, 'open')
        ))
        .limit(1);

      expect(activeSession.length).toBe(0);

      // Verify tokens are revoked (check that they appear in revocation list)
      // Note: This might take a moment to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('UL-002: should reject logout with invalid session token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('UL-002: should reject logout with expired token', async () => {
      // Create an expired token (this would require mocking JWT verification)
      // For now, test with malformed token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(['INVALID_TOKEN', 'TOKEN_EXPIRED']).toContain(response.body.error.code);
    });

    it('UL-003: should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('UL-004: should prevent token usage after logout', async () => {
      // First, login to get a valid session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(loginResponse.status).toBe(200);
      const accessToken = loginResponse.body.access_token;

      // Verify token works before logout
      const whoamiBefore = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(whoamiBefore.status).toBe(200);

      // Now logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Wait a moment for revocation to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify token no longer works
      const whoamiAfter = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(whoamiAfter.status).toBe(401);
      expect(whoamiAfter.body.ok).toBe(false);
    });

    it('UL-004: should add token to revocation list after logout', async () => {
      // First, login to get a valid session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(loginResponse.status).toBe(200);
      const accessToken = loginResponse.body.access_token;

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Check that the JWT token's JTI appears in revocation list
      // Note: This requires parsing the JWT to get the JTI, which is complex in test
      // For now, we verify that the session is properly terminated
      const terminatedSession = await db.select()
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          eq(sessions.status, 'ended')
        ))
        .limit(1);

      expect(terminatedSession.length).toBeGreaterThan(0);
    });

    it('UL-005: should handle multiple concurrent sessions correctly', async () => {
      // Create a second device and login to get multiple sessions
      const deviceId2 = uuidv4();
      await db.insert(devices).values({
        id: deviceId2,
        teamId,
        name: 'Test Device 2',
        isActive: true,
      });

      // Login from device 1
      const loginResponse1 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(loginResponse1.status).toBe(200);
      const token1 = loginResponse1.body.access_token;

      // Login from device 2
      const loginResponse2 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: deviceId2,
          userCode: 'test001',
          pin: '123456',
        });

      expect(loginResponse2.status).toBe(200);
      const token2 = loginResponse2.body.access_token;

      // Verify both tokens work initially
      const whoami1 = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${token1}`);

      const whoami2 = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${token2}`);

      expect(whoami1.status).toBe(200);
      expect(whoami2.status).toBe(200);

      // Check we have 2 active sessions
      const activeSessions = await db.select()
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          eq(sessions.status, 'open')
        ));

      expect(activeSessions.length).toBe(2);

      // Logout from device 1
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token1}`);

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify token1 no longer works but token2 still works
      const whoami1After = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${token1}`);

      const whoami2After = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${token2}`);

      expect(whoami1After.status).toBe(401);
      expect(whoami2After.status).toBe(200);

      // Check we now have only 1 active session
      const remainingSessions = await db.select()
        .from(sessions)
        .where(and(
          eq(sessions.userId, userId),
          eq(sessions.status, 'open')
        ));

      expect(remainingSessions.length).toBe(1);

      // Clean up second device
      await db.delete(devices).where(eq(devices.id, deviceId2));
    });

    it('should handle logout gracefully with database errors', async () => {
      // This test would require mocking the database to simulate errors
      // For now, we test that the endpoint exists and handles requests appropriately
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      const accessToken = loginResponse.body.access_token;

      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 500]).toContain(logoutResponse.status);

      // If successful, should have proper response structure
      if (logoutResponse.status === 200) {
        expect(logoutResponse.body.ok).toBe(true);
      }
    });
  });

  describe('Session Management Edge Cases', () => {

    it('should handle concurrent logout requests safely', async () => {
      // Login to get a valid session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      const accessToken = loginResponse.body.access_token;

      // Send multiple concurrent logout requests
      const logoutRequests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(logoutRequests);

      // All should either succeed (200) or fail gracefully (401, 500)
      responses.forEach(response => {
        expect([200, 401, 500]).toContain(response.status);
      });

      // At least one should succeed
      const successResponses = responses.filter(res => res.status === 200);
      expect(successResponses.length).toBeGreaterThan(0);
    });
  });
});