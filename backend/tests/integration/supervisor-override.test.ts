import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { sessions, supervisorPins, devices } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { RateLimiter } from '../../src/services/rate-limiter';
import { logger } from '../../src/lib/logger';
import { v4 as uuidv4 } from 'uuid';

describe('Supervisor Override API Tests', () => {
  let app: express.Application;
  let authToken: string;

  const teamId = '550e8400-e29b-41d4-a716-446655440002';
  const deviceId = '550e8400-e29b-41d4-a716-446655440001';
  const userId = '550e8400-e29b-41d4-a716-446655440012'; // QA FIELD_SUPERVISOR
  let supervisorPinId: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    const [activePin] = await db.select({ id: supervisorPins.id })
      .from(supervisorPins)
      .where(eq(supervisorPins.teamId, teamId))
      .limit(1);

    if (!activePin) {
      throw new Error('No active supervisor PIN available for seeded team');
    }
    supervisorPinId = activePin.id;

    await db.update(supervisorPins)
      .set({ isActive: true })
      .where(eq(supervisorPins.id, supervisorPinId));

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId,
        userCode: 'test010',
        pin: 'FieldQa987!'
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.access_token;
    expect(authToken).toBeDefined();
  });

  afterEach(async () => {
    await db.delete(sessions).where(eq(sessions.deviceId, deviceId));
    if (supervisorPinId) {
      await db.update(supervisorPins)
        .set({ isActive: true })
        .where(eq(supervisorPins.id, supervisorPinId));
    }

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
      expect(response.body.error.code).toBe('INVALID_SUPERVISOR_PIN');
      expect(response.body.error.message).toBe('Invalid supervisor PIN');
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
      const limitSpy = vi.spyOn(RateLimiter, 'checkSupervisorPinLimit').mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 1000,
        retryAfter: 1
      });

      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supervisor_pin: '789012',
          deviceId,
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMITED');
      expect(response.headers['retry-after']).toBeDefined();

      limitSpy.mockRestore();
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
