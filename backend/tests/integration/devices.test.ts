/**
 * Device Management API Integration Tests
 * Tests all device-related endpoints against the main PostgreSQL database
 */

import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase, createTestData, TEST_DATA } from '../utils/test-setup';
import { ApiAssertions, TestDataGenerator } from '../utils/test-helpers';

describe('Device Management API', () => {
  let authToken: string;
  let teamMemberToken: string;
  let testTeamId: string;
  let testUserId: string;
  let testDeviceId: string;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Create test data
    const testData = await createTestData();
    testTeamId = testData.team.id;
    testUserId = testData.user.id;
    testDeviceId = testData.device.id;

    // Generate auth tokens
    authToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'ADMIN');
    teamMemberToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'TEAM_MEMBER');

    console.log('✅ Device test setup completed');
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    console.log('✅ Device test cleanup completed');
  });

  describe('POST /api/v1/devices', () => {
    it('TC-DEVICE-001: Create device with valid data', async () => {
      const deviceData = TestDataGenerator.generateDeviceData(testTeamId, {
        name: 'New Test Device',
        androidId: `android-${Date.now()}-001`,
      });

      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(deviceData);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(deviceData.name);
      expect(response.body.androidId).toBe(deviceData.androidId);
      expect(response.body.appVersion).toBe(deviceData.appVersion);
      expect(response.body.teamId).toBe(deviceData.teamId);
      expect(response.body.isActive).toBe(true);
    });

    it('TC-DEVICE-002: Create device with duplicate Android ID', async () => {
      const deviceData = TestDataGenerator.generateDeviceData(testTeamId, {
        androidId: 'test-android-123', // Same as initial test device
      });

      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(deviceData);

      ApiAssertions.assertError(response, 'ANDROID_ID_EXISTS');
    });

    it('TC-DEVICE-003: Create device with missing required fields', async () => {
      const deviceData = {
        name: 'Incomplete Device',
        // Missing teamId, androidId
      };

      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(deviceData);

      ApiAssertions.assertError(response, 'MISSING_FIELDS');
    });

    it('TC-DEVICE-004: Create device without authentication', async () => {
      const deviceData = TestDataGenerator.generateDeviceData(testTeamId, {
        androidId: `android-${Date.now()}-002`,
      });

      const response = await request(app)
        .post('/api/v1/devices')
        .set('Content-Type', 'application/json')
        .send(deviceData);

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('GET /api/v1/devices', () => {
    it('TC-DEVICE-005: List devices as admin', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.pagination).toBe('object');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
    });

    it('TC-DEVICE-006: List devices with filters', async () => {
      const response = await request(app)
        .get(`/api/v1/devices?teamId=${testTeamId}&isActive=true`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      response.body.items.forEach((device: any) => {
        expect(device.teamId).toBe(testTeamId);
        expect(device.isActive).toBe(true);
      });
    });

    it('TC-DEVICE-007: List devices without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/devices');

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-DEVICE-008: List devices with search', async () => {
      const response = await request(app)
        .get('/api/v1/devices?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      response.body.items.forEach((device: any) => {
        expect(device.name.toLowerCase()).toContain('test');
      });
    });
  });

  describe('GET /api/v1/devices/:id', () => {
    it('TC-DEVICE-009: Get existing device as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.id).toBe(testDeviceId);
      expect(response.body.name).toBeDefined();
      expect(response.body.androidId).toBeDefined();
      expect(response.body.appVersion).toBeDefined();
      expect(response.body.teamId).toBeDefined();
    });

    it('TC-DEVICE-010: Get non-existent device', async () => {
      const response = await request(app)
        .get('/api/v1/devices/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertError(response, 'DEVICE_NOT_FOUND');
    });

    it('TC-DEVICE-011: Get device without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDeviceId}`);

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('PUT /api/v1/devices/:id', () => {
    it('TC-DEVICE-012: Update device with valid data', async () => {
      const updateData = {
        name: 'Updated Device Name',
        appVersion: '2.0.0',
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertSuccess(response);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.appVersion).toBe(updateData.appVersion);
      expect(response.body.isActive).toBe(updateData.isActive);
    });

    it('TC-DEVICE-013: Update device with duplicate Android ID', async () => {
      // First create another device
      const createResponse = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateDeviceData(testTeamId, {
          name: 'Device for Conflict Test',
          androidId: `android-${Date.now()}-003`,
        }));

      const otherDeviceId = createResponse.body.id;
      const otherDeviceAndroidId = createResponse.body.androidId;

      // Try to update test device with the other device's Android ID
      const updateData = {
        androidId: otherDeviceAndroidId,
      };

      const response = await request(app)
        .put(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertError(response, 'ANDROID_ID_EXISTS');
    });

    it('TC-DEVICE-014: Update device without authentication', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/devices/${testDeviceId}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-DEVICE-015: Update device as team member', async () => {
      const updateData = { name: 'Team Member Updated' };

      const response = await request(app)
        .put(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      // This depends on business rules - if team members can update devices
      if (response.status === 200) {
        ApiAssertions.assertSuccess(response);
      } else {
        ApiAssertions.assertForbidden(response);
      }
    });
  });

  describe('DELETE /api/v1/devices/:id', () => {
    let deleteTestDeviceId: string;

    beforeAll(async () => {
      // Create a device for deletion tests
      const createResponse = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateDeviceData(testTeamId, {
          name: 'Device for Deletion',
          androidId: `android-${Date.now()}-004`,
        }));

      deleteTestDeviceId = createResponse.body.id;
    });

    it('TC-DEVICE-016: Deactivate device', async () => {
      const response = await request(app)
        .delete(`/api/v1/devices/${deleteTestDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);

      // Verify device is deactivated
      const getResponse = await request(app)
        .get(`/api/v1/devices/${deleteTestDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.isActive).toBe(false);
    });

    it('TC-DEVICE-017: Delete device without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/devices/${testDeviceId}`);

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('POST /api/v1/devices/:id/update-last-seen', () => {
    it('TC-DEVICE-018: Update device last seen timestamp', async () => {
      const response = await request(app)
        .post(`/api/v1/devices/${testDeviceId}/update-last-seen`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json');

      ApiAssertions.assertSuccess(response);
      expect(response.body.success).toBe(true);

      // Verify the timestamp was updated
      const getResponse = await request(app)
        .get(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.lastSeenAt).toBeDefined();
      const lastSeenTime = new Date(getResponse.body.lastSeenAt);
      const now = new Date();
      const timeDiff = now.getTime() - lastSeenTime.getTime();
      expect(timeDiff).toBeLessThan(5000); // Within last 5 seconds
    });

    it('TC-DEVICE-019: Update last seen without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/devices/${testDeviceId}/update-last-seen`)
        .set('Content-Type', 'application/json');

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('POST /api/v1/devices/:id/update-last-gps', () => {
    it('TC-DEVICE-020: Update device last GPS timestamp', async () => {
      const response = await request(app)
        .post(`/api/v1/devices/${testDeviceId}/update-last-gps`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json');

      ApiAssertions.assertSuccess(response);
      expect(response.body.success).toBe(true);

      // Verify the timestamp was updated
      const getResponse = await request(app)
        .get(`/api/v1/devices/${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.lastGpsAt).toBeDefined();
      const lastGpsTime = new Date(getResponse.body.lastGpsAt);
      const now = new Date();
      const timeDiff = now.getTime() - lastGpsTime.getTime();
      expect(timeDiff).toBeLessThan(5000); // Within last 5 seconds
    });

    it('TC-DEVICE-021: Update last GPS without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/devices/${testDeviceId}/update-last-gps`)
        .set('Content-Type', 'application/json');

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('Device Statistics and Performance', () => {
    it('TC-DEVICE-022: Get device statistics as admin', async () => {
      const response = await request(app)
        .get('/api/v1/devices/stats')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('totalDevices');
      expect(response.body).toHaveProperty('activeDevices');
      expect(response.body).toHaveProperty('devicesWithGPS');
      expect(response.body).toHaveProperty('devicesSeenLast24h');
      expect(typeof response.body.totalDevices).toBe('number');
    });

    it('TC-DEVICE-023: Get device statistics as team member', async () => {
      const response = await request(app)
        .get('/api/v1/devices/stats')
        .set('Authorization', `Bearer ${teamMemberToken}`);

      // Should return statistics limited to user's team
      if (response.status === 200) {
        ApiAssertions.assertSuccess(response);
        expect(response.body).toHaveProperty('totalDevices');
      } else {
        ApiAssertions.assertForbidden(response);
      }
    });

    it('TC-DEVICE-024: Get device statistics without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/devices/stats');

      ApiAssertions.assertUnauthorized(response);
    });
  });
});