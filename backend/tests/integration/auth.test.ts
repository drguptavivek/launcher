import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins, supervisorPins, sessions } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { RateLimiter } from '../../src/services/rate-limiter';

describe('Authentication API Integration Tests', () => {
  let app: express.Application;

  // Generate test UUIDs once
  const teamId = uuidv4();
  const deviceId = uuidv4();
  const userId = uuidv4();
  const supervisorPinId = uuidv4();

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Clean up existing test data
    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, teamId));
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

    // Create test supervisor PIN
    const supervisorPinHash = await hashPassword('789012');
    await db.insert(supervisorPins).values({
      id: supervisorPinId,
      teamId,
      name: 'Test Supervisor',
      pinHash: supervisorPinHash.hash,
      salt: supervisorPinHash.salt,
      isActive: true,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, teamId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));

    // Clear rate limits to prevent interference between tests
    RateLimiter.resetLimit('login:::ffff:127.0.0.1');
    RateLimiter.resetLimit('pin:::ffff:127.0.0.1');
    RateLimiter.resetLimit('supervisor:::ffff:127.0.0.1');
  });

  describe('POST /api/v1/auth/login', () => {

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.session.sessionId).toBeDefined();
      expect(response.body.session.userId).toBe(userId);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.policyVersion).toBeDefined();
    });

    it('should reject login with invalid deviceId', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: uuidv4(),
          userCode: 'test001',
          pin: '123456'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('DEVICE_NOT_FOUND');
      expect(response.body.error.message).toBe('Device not found or inactive');
    });

    it('should reject login with invalid userCode', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'invaliduser',
          pin: '123456'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toMatch(/Invalid user code or PIN/);
    });

    it('should reject login with invalid pin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: 'wrongpin'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toMatch(/Invalid user code or PIN/);
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
      expect(response.body.error.message).toBe('deviceId, userCode, and pin are required');
    });
  });

  describe('GET /api/v1/auth/whoami', () => {

    it('should return user information for valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456'
        });

      const token = loginResponse.body.accessToken;

      // Use token to get user info
      const whoamiResponse = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${token}`);

      expect(whoamiResponse.status).toBe(200);
      expect(whoamiResponse.body.ok).toBe(true);
      expect(whoamiResponse.body.user.id).toBe(userId);
      expect(whoamiResponse.body.user.code).toBe('test001');
      expect(whoamiResponse.body.session.sessionId).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject missing authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/whoami');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('POST /api/v1/auth/logout', () => {

    it('should logout successfully with valid session', async () => {
      // First login to get session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456'
        });

      const sessionId = loginResponse.body.session.sessionId;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          sessionId,
          userId
        });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.ok).toBe(true);
      expect(logoutResponse.body.endedAt).toBeDefined();
    });

    it('should reject logout for nonexistent session', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          sessionId: uuidv4(),
          userId
        });

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {

    it('should refresh token successfully', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456'
        });

      const refreshToken = loginResponse.body.refreshToken;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: refreshToken
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.ok).toBe(true);
      expect(refreshResponse.body.accessToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: 'invalid.refresh.token'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /api/v1/auth/heartbeat', () => {

    it('should register heartbeat successfully', async () => {
      // First login to get session
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456'
        });

      const sessionId = loginResponse.body.session.sessionId;

      // Send heartbeat
      const heartbeatResponse = await request(app)
        .post('/api/v1/auth/heartbeat')
        .send({
          deviceId,
          sessionId,
          ts: new Date().toISOString(),
          battery: 0.85
        });

      expect(heartbeatResponse.status).toBe(200);
      expect(heartbeatResponse.body.ok).toBe(true);
    });

    it('should reject heartbeat for nonexistent session', async () => {
      const response = await request(app)
        .post('/api/v1/auth/heartbeat')
        .send({
          deviceId,
          sessionId: uuidv4(),
          ts: new Date().toISOString(),
          battery: 0.85
        });

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });
});