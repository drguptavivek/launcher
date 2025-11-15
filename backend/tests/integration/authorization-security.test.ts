import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

describe('Authorization Security Tests', () => {
  let app: express.Application;

  // Generate test UUIDs once
  const teamId = uuidv4();
  const deviceId = uuidv4();
  const userId = uuidv4();

  beforeEach(async () => {
    // Setup Express app with same structure as main server
    app = express();
    app.use(express.json());

    // Add health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test',
      });
    });

    app.use('/api/v1', apiRouter);

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
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));
  });

  describe('Telemetry Endpoint Security', () => {
    it('should reject unauthorized telemetry submissions', async () => {
      const response = await request(app)
        .post('/api/v1/telemetry')
        .send({
          events: [
            { t: 'heartbeat', ts: '2025-11-15T19:55:00Z', battery: 0.85 }
          ],
          deviceId,
          sessionId: 'test-session-123'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });

    it('should reject telemetry submissions with invalid tokens', async () => {
      const response = await request(app)
        .post('/api/v1/telemetry')
        .set('Authorization', 'Bearer invalid-token-here')
        .send({
          events: [
            { t: 'heartbeat', ts: '2025-11-15T19:55:00Z', battery: 0.85 }
          ],
          deviceId,
          sessionId: 'test-session-123'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/INVALID_TOKEN|UNAUTHORIZED/);
    });
  });

  describe('Policy Endpoint Security', () => {
    it('should reject unauthorized policy requests', async () => {
      const response = await request(app)
        .get(`/api/v1/policy/${deviceId}`);

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });

    it('should reject policy requests with invalid tokens', async () => {
      const response = await request(app)
        .get(`/api/v1/policy/${deviceId}`)
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/INVALID_TOKEN|UNAUTHORIZED/);
    });
  });

  describe('Supervisor Override Endpoint Security', () => {
    it('should reject unauthorized supervisor override requests', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .send({
          supervisor_pin: '123456',
          deviceId
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });

    it('should reject supervisor override requests with invalid tokens', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/override/login')
        .set('Authorization', 'Bearer invalid-token-here')
        .send({
          supervisor_pin: '123456',
          deviceId
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/INVALID_TOKEN|UNAUTHORIZED/);
    });
  });

  describe('Device Management Endpoint Security', () => {
    it('should reject unauthorized device listing requests', async () => {
      const response = await request(app)
        .get('/api/v1/devices');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });

    it('should reject unauthorized device creation requests', async () => {
      const response = await request(app)
        .post('/api/v1/devices')
        .send({
          teamId,
          name: 'Test Device 2',
          androidId: 'test-android-id'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });
  });

  describe('User Management Endpoint Security', () => {
    it('should reject unauthorized user listing requests', async () => {
      const response = await request(app)
        .get('/api/v1/users');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });

    it('should reject unauthorized user creation requests', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({
          teamId,
          code: 'TESTUSER2',
          displayName: 'Test User 2',
          pin: '123456'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });
  });

  describe('Team Management Endpoint Security', () => {
    it('should reject unauthorized team listing requests', async () => {
      const response = await request(app)
        .get('/api/v1/teams');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });

    it('should reject unauthorized team creation requests', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          name: 'Test Team 2',
          timezone: 'UTC'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);
    });
  });

  describe('Web Admin Create-Admin Endpoint Security', () => {
    it('should still protect create-admin endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/web-admin/auth/create-admin')
        .send({
          email: 'hacker@evil.com',
          password: 'password123',
          firstName: 'Hacker',
          lastName: 'Evil',
          role: 'SYSTEM_ADMIN'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toMatch(/UNAUTHORIZED|INVALID_TOKEN|AUTHENTICATION_REQUIRED|MISSING_TOKEN/);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});