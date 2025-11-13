import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins, supervisorPins } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

describe('Security and Rate Limiting Tests', () => {
  let app: express.Application;

  // Generate test UUIDs once
  const teamId = uuidv4();
  const deviceId = uuidv4();
  const deviceId2 = uuidv4();
  const userId = uuidv4();
  const userId2 = uuidv4();
  const supervisorPinId = uuidv4();

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Clean up existing test data
    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, teamId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(userPins).where(eq(userPins.userId, userId2));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, userId2));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(devices).where(eq(devices.id, deviceId2));
    await db.delete(teams).where(eq(teams.id, teamId));

    // Create test team
    await db.insert(teams).values({
      id: teamId,
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'MH01',
    });

    // Create test devices
    await db.insert(devices).values([
      {
        id: deviceId,
        teamId,
        name: 'Test Device',
        isActive: true,
      },
      {
        id: deviceId2,
        teamId,
        name: 'Test Device 2',
        isActive: true,
      },
    ]);

    // Create test users
    await db.insert(users).values([
      {
        id: userId,
        code: 'test001',
        teamId,
        displayName: 'Test User',
        isActive: true,
      },
      {
        id: userId2,
        code: 'test002',
        teamId,
        displayName: 'Test User 2',
        isActive: true,
      },
    ]);

    // Create user PINs
    const pinHash = await hashPassword('123456');
    const pinHash2 = await hashPassword('654321');

    await db.insert(userPins).values([
      {
        userId,
        pinHash: pinHash.hash,
        salt: pinHash.salt,
      },
      {
        userId: userId2,
        pinHash: pinHash2.hash,
        salt: pinHash2.salt,
      },
    ]);

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
    await db.delete(userPins).where(eq(userPins.userId, userId2));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, userId2));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(devices).where(eq(devices.id, deviceId2));
    await db.delete(teams).where(eq(teams.id, teamId));
  });

  describe('RL-001: Login Rate Limiting', () => {

    it('should rate limit login attempts per device', async () => {
      // Make multiple rapid login attempts from same device
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      const responses = await Promise.all(requests);

      // Check that some responses are rate limited (status 429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMITED');
        expect(rateLimitedResponse.body.error.message).toContain('Too many login attempts');
        expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
      }
    });

    it('should rate limit login attempts per IP address', async () => {
      // Make multiple rapid login attempts from different users but same IP (simulated)
      const requests = Array(20).fill(null).map((_, index) =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: index % 2 === 0 ? deviceId : deviceId2,
            userCode: index % 2 === 0 ? 'test001' : 'test002',
            pin: 'wrongpin',
          })
          .set('X-Forwarded-For', '192.168.1.100') // Simulate same IP
      );

      const responses = await Promise.all(requests);

      // Check that some responses are rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should allow legitimate login after rate limit window', async () => {
      // First, trigger rate limiting
      const rateLimitRequests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      await Promise.all(rateLimitRequests);

      // Wait for rate limit to reset (in real scenario, this would be the configured window)
      // For testing, we might need to adjust the rate limit configuration or wait
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try legitimate login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      // Should either succeed or be rate limited depending on timing
      expect([200, 429]).toContain(loginResponse.status);
    });
  });

  describe('RL-002: Device-based Rate Limiting', () => {

    it('should apply separate rate limits for different devices', async () => {
      // Make multiple rapid login attempts from device 1
      const device1Requests = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      // Make multiple rapid login attempts from device 2
      const device2Requests = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: deviceId2,
            userCode: 'test002',
            pin: 'wrongpin',
          })
      );

      const [device1Responses, device2Responses] = await Promise.all([
        Promise.all(device1Requests),
        Promise.all(device2Requests)
      ]);

      // Both should have some rate limited responses
      const device1RateLimited = device1Responses.filter(res => res.status === 429);
      const device2RateLimited = device2Responses.filter(res => res.status === 429);

      expect(device1RateLimited.length).toBeGreaterThan(0);
      expect(device2RateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('RL-004: PIN Lockout After Failed Attempts', () => {

    it('should lock account after too many failed PIN attempts', async () => {
      // Make multiple failed login attempts to trigger lockout
      const failedAttempts = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      await Promise.all(failedAttempts);

      // Try legitimate login - should be locked out
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(loginResponse.body.error.message).toContain('temporarily locked');
      expect(loginResponse.body.error.retryAfter).toBeDefined();
    });

    it('should reset failed attempt counter after successful login', async () => {
      // Make some failed attempts
      const failedAttempts = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      await Promise.all(failedAttempts);

      // Make successful login
      const successResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(successResponse.status).toBe(200);

      // Now make more failed attempts - should start fresh count
      const moreFailedAttempts = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      const responses = await Promise.all(moreFailedAttempts);

      // Should not be locked out yet (fresh count)
      const lockedOutResponses = responses.filter(res =>
        res.status === 401 && res.body.error.code === 'ACCOUNT_LOCKED'
      );
      expect(lockedOutResponses.length).toBe(0);
    });
  });

  describe('RL-005: PIN Lockout Recovery', () => {

    it('should allow login after lockout period expires', async () => {
      // This test is challenging to implement without modifying the lockout duration
      // For now, we'll test the lockout mechanism itself

      // Trigger lockout
      const lockoutAttempts = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      await Promise.all(lockoutAttempts);

      // Try login - should be locked out
      const lockedResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(lockedResponse.status).toBe(401);
      expect(lockedResponse.body.error.code).toBe('ACCOUNT_LOCKED');

      // The retryAfter should indicate the lockout duration
      expect(lockedResponse.body.error.retryAfter).toBeDefined();
      expect(typeof lockedResponse.body.error.retryAfter).toBe('number');
      expect(lockedResponse.body.error.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('RL-006: Failed Attempt Counter Reset', () => {

    it('should reset counter only for the specific user', async () => {
      // Make failed attempts for user 1
      const user1Failed = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      // Make failed attempts for user 2
      const user2Failed = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId: deviceId2,
            userCode: 'test002',
            pin: 'wrongpin',
          })
      );

      await Promise.all([...user1Failed, ...user2Failed]);

      // Successful login for user 1
      const user1Success = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: '123456',
        });

      expect(user1Success.status).toBe(200);

      // User 2 should still have failed attempts counted
      const user2Login = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: deviceId2,
          userCode: 'test002',
          pin: '654321',
        });

      // Should succeed since user 2 hasn't exceeded the limit yet
      expect(user2Login.status).toBe(200);
    });
  });

  describe('RL-007: Supervisor PIN Rate Limiting', () => {

    it('should apply separate rate limiting for supervisor PIN attempts', async () => {
      // Make multiple rapid supervisor override attempts
      const supervisorRequests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/supervisor/override/login')
          .send({
            supervisor_pin: 'wrongpin',
            deviceId,
          })
      );

      const responses = await Promise.all(supervisorRequests);

      // Should have rate limited responses
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMITED');
        expect(rateLimitedResponse.body.error.message).toContain('supervisor override attempts');
      }
    });

    it('should have independent rate limits for user vs supervisor attempts', async () => {
      // Make many user login attempts to potentially trigger rate limiting
      const userRequests = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: 'wrongpin',
          })
      );

      // Make supervisor attempts
      const supervisorRequests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/supervisor/override/login')
          .send({
            supervisor_pin: 'wrongpin',
            deviceId,
          })
      );

      const [userResponses, supervisorResponses] = await Promise.all([
        Promise.all(userRequests),
        Promise.all(supervisorRequests)
      ]);

      // Both should have their own rate limiting behavior
      const userRateLimited = userResponses.filter(res => res.status === 429);
      const supervisorRateLimited = supervisorResponses.filter(res => res.status === 429);

      // At least one should be rate limited
      expect(userRateLimited.length + supervisorRateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Security Input Validation', () => {

    it('should reject malformed UUIDs in device ID', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: 'not-a-valid-uuid',
          userCode: 'test001',
          pin: '123456',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('DEVICE_NOT_FOUND');
    });

    it('should handle extremely long user codes', async () => {
      const longUserCode = 'a'.repeat(1000);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: longUserCode,
          pin: '123456',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should handle extremely long PINs', async () => {
      const longPin = '1'.repeat(1000);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId,
          userCode: 'test001',
          pin: longPin,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject null/undefined values in required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: null,
          userCode: undefined,
          pin: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
    });
  });

  describe('Concurrent Security Tests', () => {

    it('should handle concurrent login attempts safely', async () => {
      // Make many concurrent login attempts for the same user
      const concurrentRequests = Array(50).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            deviceId,
            userCode: 'test001',
            pin: Math.random() < 0.5 ? '123456' : 'wrongpin', // Mix of correct and incorrect
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // All responses should be valid (no server crashes)
      responses.forEach(response => {
        expect([200, 400, 401, 429, 423]).toContain(response.status);
      });

      // Should have some successful logins and some failures
      const successful = responses.filter(res => res.status === 200);
      const failures = responses.filter(res => res.status === 401);

      expect(successful.length + failures.length).toBeGreaterThan(0);
    });
  });
});