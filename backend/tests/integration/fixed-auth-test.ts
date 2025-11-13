/**
 * Test Authentication with Fixed Credentials
 *
 * This test verifies that the fixed seed script
 * creates working authentication credentials
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { ensureFixedTestData, cleanupFixedTestData, TEST_CREDENTIALS } from '../helpers/fixed-test-data';

describe('Fixed Credentials Authentication Test', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Ensure fixed test data exists
    await ensureFixedTestData();
  });

  afterAll(async () => {
    // Clean up (optional - keep data for other tests)
    // await cleanupFixedTestData();
  });

  describe('POST /api/v1/auth/login with fixed credentials', () => {
    it('should login successfully with team member credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
          pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.session).toBeDefined();
      expect(response.body.session.session_id).toBeDefined();
      expect(response.body.session.user_id).toBeDefined();
      console.log('✅ Team member login successful');
    });

    it('should login successfully with supervisor credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.SUPERVISOR.userCode,
          pin: TEST_CREDENTIALS.SUPERVISOR.pin
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      console.log('✅ Supervisor login successful');
    });

    it('should login successfully with admin credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: TEST_CREDENTIALS.ADMIN.userCode,
          pin: TEST_CREDENTIALS.ADMIN.pin
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      console.log('✅ Admin login successful');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
          userCode: 'invalid999',
          pin: '999999'
        });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      console.log('✅ Invalid credentials correctly rejected');
    });
  });

  describe('GET /api/v1/auth/whoami with fixed credentials', () => {
    it('should return user information for valid team member token', async () => {
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
      expect(whoamiResponse.body.user.code).toBe(TEST_CREDENTIALS.TEAM_MEMBER.userCode);
      expect(whoamiResponse.body.user.display_name).toBe(TEST_CREDENTIALS.TEAM_MEMBER.displayName);
      expect(whoamiResponse.body.user.role).toBe(TEST_CREDENTIALS.TEAM_MEMBER.role);
      console.log('✅ Team member whoami successful');
    });
  });
});