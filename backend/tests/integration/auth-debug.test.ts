import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { ensureFixedTestData, TEST_CREDENTIALS } from '../helpers/fixed-test-data';

describe('Auth Debug Test', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);
    await ensureFixedTestData();
  });

  it('debug login credentials', async () => {
    console.log('Test credentials:', {
      deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
      userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
      pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
        userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
        pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
      });

    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));

    expect(response.status).toBe(200);
  });
});