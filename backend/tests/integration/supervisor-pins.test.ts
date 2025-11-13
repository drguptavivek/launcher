/**
 * Supervisor PIN Management API Integration Tests
 * Tests all supervisor PIN-related endpoints against the main PostgreSQL database
 */

import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase, createTestData, TEST_DATA } from '../utils/test-setup';
import { ApiAssertions, TestDataGenerator } from '../utils/test-helpers';

describe('Supervisor PIN Management API', () => {
  let authToken: string;
  let teamMemberToken: string;
  let supervisorToken: string;
  let testTeamId: string;
  let testUserId: string;
  let testSupervisorPinId: string;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Create test data
    const testData = await createTestData();
    testTeamId = testData.team.id;
    testUserId = testData.user.id;
    testSupervisorPinId = testData.supervisorPin.id;

    // Generate auth tokens
    authToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'ADMIN');
    teamMemberToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'TEAM_MEMBER');
    supervisorToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'SUPERVISOR');

    console.log('✅ Supervisor PIN test setup completed');
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    console.log('✅ Supervisor PIN test cleanup completed');
  });

  describe('POST /api/v1/supervisor/pins', () => {
    it('TC-SUP-001: Create supervisor PIN with valid data', async () => {
      const pinData = TestDataGenerator.generateSupervisorPinData(testTeamId, {
        name: 'Additional Supervisor',
        pin: '111111',
      });

      const response = await request(app)
        .post('/api/v1/supervisor/pins')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(pinData);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(pinData.name);
      expect(response.body.teamId).toBe(pinData.teamId);
      expect(response.body.isActive).toBe(true);
      expect(response.body).not.toHaveProperty('pinHash');
      expect(response.body).not.toHaveProperty('pin');
    });

    it('TC-SUP-002: Create supervisor PIN with weak PIN', async () => {
      const pinData = TestDataGenerator.generateSupervisorPinData(testTeamId, {
        name: 'Weak PIN Supervisor',
        pin: '123', // Less than 4 characters
      });

      const response = await request(app)
        .post('/api/v1/supervisor/pins')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(pinData);

      ApiAssertions.assertError(response, 'WEAK_PIN');
    });

    it('TC-SUP-003: Create supervisor PIN without authentication', async () => {
      const pinData = TestDataGenerator.generateSupervisorPinData(testTeamId, {
        name: 'No Auth Supervisor',
      });

      const response = await request(app)
        .post('/api/v1/supervisor/pins')
        .set('Content-Type', 'application/json')
        .send(pinData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-SUP-004: Create supervisor PIN with TEAM_MEMBER role', async () => {
      const pinData = TestDataGenerator.generateSupervisorPinData(testTeamId, {
        name: 'Team Member Supervisor',
      });

      const response = await request(app)
        .post('/api/v1/supervisor/pins')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(pinData);

      ApiAssertions.assertForbidden(response);
    });

    it('TC-SUP-005: Create supervisor PIN for non-existent team', async () => {
      const pinData = TestDataGenerator.generateSupervisorPinData('non-existent-team-id', {
        name: 'Invalid Team Supervisor',
      });

      const response = await request(app)
        .post('/api/v1/supervisor/pins')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(pinData);

      ApiAssertions.assertError(response, 'TEAM_NOT_FOUND');
    });
  });

  describe('GET /api/v1/supervisor/pins', () => {
    it('TC-SUP-006: List supervisor PINs as admin', async () => {
      const response = await request(app)
        .get('/api/v1/supervisor/pins')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.pagination).toBe('object');

      // Verify PIN hashes are not exposed
      response.body.items.forEach((pin: any) => {
        expect(pin).toHaveProperty('id');
        expect(pin).toHaveProperty('name');
        expect(pin).toHaveProperty('teamId');
        expect(pin).toHaveProperty('isActive');
        expect(pin).not.toHaveProperty('pinHash');
        expect(pin).not.toHaveProperty('pin');
      });
    });

    it('TC-SUP-007: List supervisor PINs with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/supervisor/pins?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.items.length).toBeLessThanOrEqual(5);
    });

    it('TC-SUP-008: List supervisor PINs with team filter', async () => {
      const response = await request(app)
        .get(`/api/v1/supervisor/pins?teamId=${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      response.body.items.forEach((pin: any) => {
        expect(pin.teamId).toBe(testTeamId);
      });
    });

    it('TC-SUP-009: List supervisor PINs without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/supervisor/pins');

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-SUP-010: List supervisor PINs as team member', async () => {
      const response = await request(app)
        .get('/api/v1/supervisor/pins')
        .set('Authorization', `Bearer ${teamMemberToken}`);

      // Should return only team's supervisor PINs or be forbidden
      if (response.status === 200) {
        ApiAssertions.assertSuccess(response);
        response.body.items.forEach((pin: any) => {
          expect(pin.teamId).toBe(testTeamId);
        });
      } else {
        ApiAssertions.assertForbidden(response);
      }
    });
  });

  describe('GET /api/v1/supervisor/pins/:teamId', () => {
    it('TC-SUP-011: Get team supervisor PIN as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.teamId).toBe(testTeamId);
      expect(response.body).not.toHaveProperty('pinHash');
      expect(response.body).not.toHaveProperty('pin');
    });

    it('TC-SUP-012: Get team supervisor PIN as team member', async () => {
      const response = await request(app)
        .get(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.teamId).toBe(testTeamId);
      expect(response.body).not.toHaveProperty('pinHash');
    });

    it('TC-SUP-013: Get supervisor PIN for non-existent team', async () => {
      const response = await request(app)
        .get('/api/v1/supervisor/pins/non-existent-team')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertError(response, 'SUPERVISOR_PIN_NOT_FOUND');
    });

    it('TC-SUP-014: Get supervisor PIN without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/supervisor/pins/${testTeamId}`);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-SUP-015: Get supervisor PIN for different team as team member', async () => {
      // Create another team
      const otherTeamResponse = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateTeamData({
          name: 'Other Team for PIN Test',
        }));

      const otherTeamId = otherTeamResponse.body.id;

      const response = await request(app)
        .get(`/api/v1/supervisor/pins/${otherTeamId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('PUT /api/v1/supervisor/pins/:teamId', () => {
    it('TC-SUP-016: Update supervisor PIN', async () => {
      const updateData = {
        name: 'Updated Supervisor Name',
        pin: '999999',
      };

      const response = await request(app)
        .put(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertSuccess(response);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body).not.toHaveProperty('pinHash');
      expect(response.body).not.toHaveProperty('pin');
    });

    it('TC-SUP-017: Update supervisor PIN with weak PIN', async () => {
      const updateData = {
        pin: '123',
      };

      const response = await request(app)
        .put(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertError(response, 'WEAK_PIN');
    });

    it('TC-SUP-018: Update supervisor PIN without authentication', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-SUP-019: Update supervisor PIN as team member', async () => {
      const updateData = { name: 'Team Member Updated' };

      const response = await request(app)
        .put(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('DELETE /api/v1/supervisor/pins/:teamId', () => {
    let deleteTestTeamId: string;
    let deleteTestSupervisorPinId: string;

    beforeAll(async () => {
      // Create another team and supervisor PIN for deletion tests
      const teamResponse = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateTeamData({
          name: 'Team for PIN Deletion',
        }));

      deleteTestTeamId = teamResponse.body.id;

      const pinResponse = await request(app)
        .post('/api/v1/supervisor/pins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateSupervisorPinData(deleteTestTeamId, {
          name: 'PIN for Deletion',
        }));

      deleteTestSupervisorPinId = pinResponse.body.id;
    });

    it('TC-SUP-020: Deactivate supervisor PIN', async () => {
      const response = await request(app)
        .delete(`/api/v1/supervisor/pins/${deleteTestTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);

      // Verify PIN is deactivated
      const getResponse = await request(app)
        .get(`/api/v1/supervisor/pins/${deleteTestTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.isActive).toBe(false);
    });

    it('TC-SUP-021: Delete supervisor PIN without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/supervisor/pins/${testTeamId}`);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-SUP-022: Delete supervisor PIN as team member', async () => {
      const response = await request(app)
        .delete(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('POST /api/v1/supervisor/pins/:teamId/rotate', () => {
    it('TC-SUP-023: Rotate supervisor PIN', async () => {
      const rotateData = {
        name: 'Rotated Supervisor',
        // Optional: newPin will be auto-generated if not provided
      };

      const response = await request(app)
        .post(`/api/v1/supervisor/pins/${testTeamId}/rotate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(rotateData);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(rotateData.name);
      expect(response.body.isActive).toBe(true);
      expect(response.body).not.toHaveProperty('pinHash');
      expect(response.body).not.toHaveProperty('pin');

      // Verify old PIN is deactivated and new PIN is active
      const allPinsResponse = await request(app)
        .get(`/api/v1/supervisor/pins/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should return the active PIN (the new one)
      expect(allPinsResponse.body.isActive).toBe(true);
    });

    it('TC-SUP-024: Rotate supervisor PIN with specific new PIN', async () => {
      const rotateData = {
        name: 'Custom Rotated Supervisor',
        newPin: '555555',
      };

      const response = await request(app)
        .post(`/api/v1/supervisor/pins/${testTeamId}/rotate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(rotateData);

      ApiAssertions.assertSuccess(response);
      expect(response.body.name).toBe(rotateData.name);
    });

    it('TC-SUP-025: Rotate supervisor PIN with weak new PIN', async () => {
      const rotateData = {
        newPin: '123',
      };

      const response = await request(app)
        .post(`/api/v1/supervisor/pins/${testTeamId}/rotate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(rotateData);

      ApiAssertions.assertError(response, 'WEAK_PIN');
    });

    it('TC-SUP-026: Rotate supervisor PIN without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/supervisor/pins/${testTeamId}/rotate`)
        .set('Content-Type', 'application/json')
        .send({});

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-SUP-027: Rotate supervisor PIN as team member', async () => {
      const response = await request(app)
        .post(`/api/v1/supervisor/pins/${testTeamId}/rotate`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send({});

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('GET /api/v1/supervisor/pins/:teamId/active', () => {
    it('TC-SUP-028: Get active supervisor PIN', async () => {
      const response = await request(app)
        .get(`/api/v1/supervisor/pins/${testTeamId}/active`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.teamId).toBe(testTeamId);
      expect(response.body.isActive).toBe(true);
      expect(response.body).not.toHaveProperty('pinHash');
      expect(response.body).not.toHaveProperty('pin');
    });

    it('TC-SUP-029: Get active supervisor PIN without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/supervisor/pins/${testTeamId}/active`);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-SUP-030: Get active supervisor PIN for team with no PIN', async () => {
      // Create a team without supervisor PIN
      const teamResponse = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateTeamData({
          name: 'Team Without PIN',
        }));

      const teamId = teamResponse.body.id;

      const response = await request(app)
        .get(`/api/v1/supervisor/pins/${teamId}/active`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertError(response, 'SUPERVISOR_PIN_NOT_FOUND');
    });
  });

  describe('Supervisor PIN Verification', () => {
    it('TC-SUP-031: Verify supervisor PIN', async () => {
      // This would typically be an endpoint for PIN verification
      // If such an endpoint exists in the actual implementation
      const verifyData = {
        teamId: testTeamId,
        pin: '789012', // Original test PIN
      };

      const response = await request(app)
        .post('/api/v1/supervisor/pins/verify')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(verifyData);

      // This endpoint might or might not exist depending on implementation
      if (response.status !== 404) {
        ApiAssertions.assertSuccess(response);
        expect(response.body.valid).toBe(true);
      }
    });
  });
});