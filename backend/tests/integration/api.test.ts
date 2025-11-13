import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Setup test data
    const teamId = 'test-team-001';
    const deviceId = 'test-device-001';
    const userId = 'test-user-001';

    // Clean up existing test data
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));

    // Create test team
    await db.insert(teams).values({
      id: teamId,
      name: 'Test Team',
      timezone: 'UTC',
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
      retryCount: 0,
    });
  });

  afterEach(async () => {
    // Clean up test data
    const userId = 'test-user-001';
    const deviceId = 'test-device-001';
    const teamId = 'test-team-001';

    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: 'test-device-001',
            userCode: 'test001',
            pin: '123456',
          });

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.access_token).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
        expect(response.body.session).toBeDefined();
        expect(response.body.session.user_id).toBe('test-user-001');
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: 'test-device-001',
            userCode: 'test001',
            pin: 'wrongpin',
          });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should reject missing fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: 'test-device-001',
            userCode: 'test001',
            // Missing pin
          });

        expect(response.status).toBe(400);
        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toBe('MISSING_FIELDS');
      });

      it('should reject invalid device', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: 'nonexistent-device',
            userCode: 'test001',
            pin: '123456',
          });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toBe('DEVICE_NOT_FOUND');
      });
    });

    describe('GET /api/v1/auth/whoami', () => {
      let accessToken: string;

      beforeEach(async () => {
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: 'test-device-001',
            userCode: 'test001',
            pin: '123456',
          });

        accessToken = loginResponse.body.access_token;
      });

      it('should return user information with valid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/whoami')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.id).toBe('test-user-001');
        expect(response.body.user.code).toBe('test001');
        expect(response.body.session.session_id).toBeDefined();
      });

      it('should reject requests without token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/whoami');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
      });

      it('should reject requests with invalid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/whoami')
          .set('Authorization', 'Bearer invalid.token.here');

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      let refreshToken: string;

      beforeEach(async () => {
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: 'test-device-001',
            userCode: 'test001',
            pin: '123456',
          });

        refreshToken = loginResponse.body.refresh_token;
      });

      it('should refresh access token with valid refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({
            refresh_token: refreshToken,
          });

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.access_token).toBeDefined();
        expect(response.body.expires_at).toBeDefined();
      });

      it('should reject invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({
            refresh_token: 'invalid.refresh.token',
          });

        expect(response.status).toBe(401);
        expect(response.body.ok).toBe(false);
      });

      it('should reject missing refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
      });
    });
  });

  describe('Policy Endpoint', () => {
    describe('GET /api/v1/policy/:deviceId', () => {
      it('should return policy for valid device', async () => {
        const response = await request(app)
          .get('/api/v1/policy/test-device-001');

        expect(response.status).toBe(200);
        expect(response.body.jws).toBeDefined();
        expect(response.body.payload).toBeDefined();
        expect(response.body.payload.device_id).toBe('test-device-001');
        expect(response.body.payload.version).toBe(3);
      });

      it('should reject invalid device', async () => {
        const response = await request(app)
          .get('/api/v1/policy/nonexistent-device');

        expect(response.status).toBe(404);
        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toBe('DEVICE_NOT_FOUND');
      });
    });
  });

  describe('Telemetry Endpoint', () => {
    describe('POST /api/v1/telemetry', () => {
      it('should accept valid telemetry batch', async () => {
        const response = await request(app)
          .post('/api/v1/telemetry')
          .send({
            events: [
              {
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                data: {},
              },
              {
                type: 'gps',
                timestamp: new Date().toISOString(),
                data: {
                  latitude: 37.7749,
                  longitude: -122.4194,
                },
              },
            ],
            device_id: 'test-device-001',
          });

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.accepted).toBe(2);
        expect(response.body.dropped).toBe(0);
      });

      it('should reject invalid batch format', async () => {
        const response = await request(app)
          .post('/api/v1/telemetry')
          .send({
            // Missing events array
            device_id: 'test-device-001',
          });

        expect(response.status).toBe(400);
        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toBe('INVALID_BATCH');
      });

      it('should reject invalid device', async () => {
        const response = await request(app)
          .post('/api/v1/telemetry')
          .send({
            events: [
              {
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                data: {},
              },
            ],
            device_id: 'nonexistent-device',
          });

        expect(response.status).toBe(404);
        expect(response.body.ok).toBe(false);
        expect(response.body.error.code).toBe('DEVICE_NOT_FOUND');
      });

      it('should accept empty batch', async () => {
        const response = await request(app)
          .post('/api/v1/telemetry')
          .send({
            events: [],
            device_id: 'test-device-001',
          });

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.accepted).toBe(0);
        expect(response.body.dropped).toBe(0);
      });
    });
  });
});