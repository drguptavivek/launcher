import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins, supervisorPins } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { RateLimiter } from '../../src/services/rate-limiter';
import { logger } from '../../src/lib/logger';

describe('Supervisor Override API Tests', () => {
  let app: express.Application;
  let authToken: string;

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

    // Authenticate user to obtain bearer token for supervisor override requests
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        team_id: teamId,
        device_id: deviceId,
        user_code: 'test001',
        pin: '123456'
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.access_token;
    expect(authToken).toBeDefined();
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, teamId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));

    // Clear rate limits to prevent interference between tests
    RateLimiter.resetLimit('supervisor:::ffff:127.0.0.1');
  });

  describe('POST /api/v1/supervisor/override/login', () => {

    it('SO-001: should grant supervisor override with valid PIN', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
          deviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.override_until).toBeDefined();
      expect(response.body.token).toBeDefined();

      // Verify override time is approximately 2 hours from now
      const overrideUntil = new Date(response.body.override_until);
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));

      // Allow 1 minute tolerance for test timing
      expect(Math.abs(overrideUntil.getTime() - twoHoursFromNow.getTime())).toBeLessThan(60000);
    });

    it('SO-002: should reject invalid supervisor PIN', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: 'wrongpin',
          deviceId,
        });

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SUPERVISOR_PIN');
      expect(response.body.error.message).toBe('Invalid supervisor PIN');
      expect(response.body.token).toBeUndefined();
    });

    it('SO-003: should reject missing supervisor_pin field', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceId,
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
      expect(response.body.error.message).toBe('supervisor_pin and deviceId are required');
    });

    it('SO-003: should reject missing deviceId field', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
      expect(response.body.error.message).toBe('supervisor_pin and deviceId are required');
    });

    it('SO-003: should reject both missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_FIELDS');
      expect(response.body.error.message).toBe('supervisor_pin and deviceId are required');
    });

    it('SO-005: should reject supervisor override for inactive device', async () => {
      // Create inactive device
      const inactiveDeviceId = uuidv4();
      await db.insert(devices).values({
        id: inactiveDeviceId,
        teamId,
        name: 'Inactive Device',
        isActive: false,
      });

      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
          deviceId: inactiveDeviceId,
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('DEVICE_NOT_FOUND');

      // Clean up inactive device
      await db.delete(devices).where(eq(devices.id, inactiveDeviceId));
    });

    it('SO-006: should reject supervisor override without active supervisor PIN', async () => {
      // Deactivate the supervisor PIN
      await db.update(supervisorPins)
        .set({ isActive: false })
        .where(eq(supervisorPins.id, supervisorPinId));

      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
          deviceId,
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('NO_SUPERVISOR_PIN');
      expect(response.body.error.message).toBe('No active supervisor PIN found for this team');
    });

    it('SO-007: should use override token for extended access', async () => {
      // First, get supervisor override token
      const overrideResponse = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
          deviceId,
        });

      expect(overrideResponse.status).toBe(200);
      const overrideToken = overrideResponse.body.token;

      // Use override token to access policy endpoint
      const policyResponse = await request(app)
        .get(`/api/v1/policy/${deviceId}`)
        .set('Authorization', `Bearer ${overrideToken}`);

      expect(policyResponse.status).toBe(200);
      expect(policyResponse.headers['content-type']).toContain('application/jose');
    });

    it('SO-004: should apply rate limiting for supervisor override attempts', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/supervisor/override/login')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            supervisor_pin: 'wrongpin',
            deviceId,
          })
      );

      const responses = await Promise.all(requests);

      // Check that some responses are rate limited (status 429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMITED');
        expect(rateLimitedResponse.body.error.message).toContain('Too many supervisor override attempts');
        expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
      }
    });

    it('SO-009: should log override and policy issuance metadata', async () => {
      const infoSpy = vi.spyOn(logger, 'info');

      const overrideResponse = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('x-request-id', 'override-log-test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
          deviceId,
        });

      expect(overrideResponse.status).toBe(200);
      const overrideToken = overrideResponse.body.token;

      const policyResponse = await request(app)
        .get(`/api/v1/policy/${deviceId}`)
        .set('Authorization', `Bearer ${overrideToken}`)
        .set('x-request-id', 'policy-log-test');

      expect(policyResponse.status).toBe(200);

      const overrideLog = infoSpy.mock.calls.find(([message]) => message === 'supervisor_override_granted');
      expect(overrideLog).toBeDefined();
      expect(overrideLog?.[1]).toMatchObject({
        deviceId,
        teamId,
        requestId: 'override-log-test',
      });
      expect(overrideLog?.[1]?.overrideUntil).toBeDefined();

      const policyLog = infoSpy.mock.calls.find(([message]) => message === 'policy_issued');
      expect(policyLog).toBeDefined();
      expect(policyLog?.[1]).toMatchObject({
        deviceId,
        requestId: 'policy-log-test',
        policyVersion: 3,
      });

      infoSpy.mockRestore();
    });
  });

  describe('POST /api/v1/supervisor/override/revoke', () => {

    it('SO-008: should revoke active supervisor override', async () => {
      // First, get supervisor override token
      const overrideResponse = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
          deviceId,
        });

      expect(overrideResponse.status).toBe(200);
      const overrideToken = overrideResponse.body.token;

      // Verify token works initially
      const policyResponse = await request(app)
        .get(`/api/v1/policy/${deviceId}`)
        .set('Authorization', `Bearer ${overrideToken}`);

      expect(policyResponse.status).toBe(200);

      // Now revoke the override
      const revokeResponse = await request(app)
        .post('/api/v1/supervisor/override/revoke')
        .set('Authorization', `Bearer ${overrideToken}`)
        .send({});

      expect(revokeResponse.status).toBe(200);
      expect(revokeResponse.body.ok).toBe(true);

      // Verify token no longer works (this might take a moment for revocation to propagate)
      // In a real scenario, the revocation would be immediate, but testing might need slight delay
      await new Promise(resolve => setTimeout(resolve, 100));

      const policyAfterRevoke = await request(app)
        .get(`/api/v1/policy/${deviceId}`)
        .set('Authorization', `Bearer ${overrideToken}`);

      // The token should now be invalid (may return 401 or 403 depending on implementation)
      expect([401, 403]).toContain(policyAfterRevoke.status);
    });
  });
});
