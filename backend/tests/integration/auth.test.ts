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
import { ensureFixedTestData, cleanupFixedTestData, TEST_CREDENTIALS, INVALID_CREDENTIALS } from '../helpers/fixed-test-data';

describe('Authentication API Integration Tests', () => {
  let app: express.Application;

  // Use fixed test UUIDs for consistent testing
  const teamId = '550e8400-e29b-41d4-a716-446655440002';
  const deviceId = '550e8400-e29b-41d4-a716-446655440001';
  const userId = '550e8400-e29b-41d4-a716-446655440003';
  const supervisorPinId = '550e8400-e29b-41d4-a716-446655440006';

  beforeAll(async () => {
    // Setup Express app once
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Ensure fixed test data exists
    await ensureFixedTestData();
  });

  beforeEach(async () => {
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
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.session.session_id).toBeDefined();
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.policy_version).toBeDefined();
    });

    it('should reject login with invalid deviceId', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: uuidv4(), // Random invalid device ID
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
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
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: 'invaliduser',
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
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
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
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
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
      expect(response.body.error.message).toBe('deviceId, userCode, and pin are required');
    });

    it('should reject login for roles not allowed on mobile app', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.SYSTEM_ADMIN.userCode,
          pin: TEST_CREDENTIALS.SYSTEM_ADMIN.pin
        });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('APP_ACCESS_DENIED');
      expect(response.body.error.message).toMatch(/Role not authorized/);
    });
  });

  describe('GET /api/v1/auth/whoami', () => {

    it('should return user information for valid token', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      const token = loginResponse.body.access_token;

      // Use token to get user info
      const whoamiResponse = await request(app)
        .get('/api/v1/auth/whoami')
        .set('Authorization', `Bearer ${token}`);

      expect(whoamiResponse.status).toBe(200);
      expect(whoamiResponse.body.ok).toBe(true);
      expect(whoamiResponse.body.user.id).toBe(userId);
      expect(whoamiResponse.body.user.code).toBe('test001');
      expect(whoamiResponse.body.session.session_id).toBeDefined();
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
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      const token = loginResponse.body.access_token;

      // Logout with authenticated token
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.ok).toBe(true);
      expect(logoutResponse.body.ended_at).toBeDefined();
    });

    it('should reject logout for nonexistent session', async () => {
      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      const token = loginResponse.body.access_token;

      // Logout the session
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to logout again with the same token (session already ended)
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('SESSION_INACTIVE');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {

    it('should refresh token successfully', async () => {
      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      const refreshToken = loginResponse.body.refresh_token;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: refreshToken
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.ok).toBe(true);
      expect(refreshResponse.body.access_token).toBeDefined();
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
      // First login to get session and token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      const token = loginResponse.body.access_token;

      // Send heartbeat with authenticated token
      const heartbeatResponse = await request(app)
        .post('/api/v1/auth/heartbeat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deviceId,
          ts: new Date().toISOString(),
          battery: 0.85
        });

      expect(heartbeatResponse.status).toBe(200);
      expect(heartbeatResponse.body.ok).toBe(true);
    });

    it('should reject heartbeat for nonexistent session', async () => {
      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      const token = loginResponse.body.access_token;

      // Logout the session to make it invalid
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to send heartbeat with the now-invalid token
      const response = await request(app)
        .post('/api/v1/auth/heartbeat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deviceId,
          ts: new Date().toISOString(),
          battery: 0.85
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('SESSION_INACTIVE');
    });
  });
});
