/**
 * Team Management API Integration Tests
 * Tests all team-related endpoints against the main PostgreSQL database
 */

import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase, createTestData, TEST_DATA } from '../utils/test-setup';
import { ApiAssertions, TestDataGenerator } from '../utils/test-helpers';

describe('Team Management API', () => {
  let authToken: string;
  let teamMemberToken: string;
  let testTeamId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Create test data
    const testData = await createTestData();
    testTeamId = testData.team.id;
    testUserId = testData.user.id;

    // Generate auth tokens
    authToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'ADMIN');
    teamMemberToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'TEAM_MEMBER');

    console.log('✅ Team test setup completed');
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    console.log('✅ Team test cleanup completed');
  });

  describe('POST /api/v1/teams', () => {
    it('TC-TEAM-001: Create team with valid data', async () => {
      const teamData = TestDataGenerator.generateTeamData();

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(teamData.name);
      expect(response.body.timezone).toBe(teamData.timezone);
      expect(response.body.stateId).toBe(teamData.stateId);
      expect(response.body.isActive).toBe(true);
    });

    it('TC-TEAM-002: Create team with minimum required fields', async () => {
      const teamData = {
        name: 'Minimal Team',
        stateId: 'MH02',
      };

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertSuccess(response);
      expect(response.body.name).toBe(teamData.name);
      expect(response.body.stateId).toBe(teamData.stateId);
      expect(response.body.timezone).toBe('UTC'); // Default timezone
    });

    it('TC-TEAM-003: Create team with missing name', async () => {
      const teamData = {
        timezone: 'Asia/Kolkata',
        stateId: 'MH01',
      };

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertError(response, 'MISSING_FIELDS');
    });

    it('TC-TEAM-004: Create team with missing stateId', async () => {
      const teamData = {
        name: 'Test Team',
        timezone: 'Asia/Kolkata',
      };

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertError(response, 'MISSING_FIELDS');
    });

    it('TC-TEAM-005: Create team with empty name', async () => {
      const teamData = {
        name: '',
        timezone: 'Asia/Kolkata',
        stateId: 'MH01',
      };

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertError(response, 'INVALID_NAME');
    });

    it('TC-TEAM-006: Create team with invalid timezone', async () => {
      const teamData = TestDataGenerator.generateTeamData({
        timezone: 'Invalid/Timezone',
      });

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertError(response, 'INVALID_TIMEZONE');
    });

    it('TC-TEAM-007: Create team with invalid stateId length', async () => {
      const teamData = TestDataGenerator.generateTeamData({
        stateId: 'THIS_IS_A_VERY_LONG_STATE_ID_THAT_EXCEEDS_LIMIT',
      });

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertError(response, 'INVALID_STATE_ID');
    });

    it('TC-TEAM-008: Create team without authentication', async () => {
      const teamData = TestDataGenerator.generateTeamData();

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-TEAM-009: Create team with TEAM_MEMBER role', async () => {
      const teamData = TestDataGenerator.generateTeamData();

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(teamData);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('GET /api/v1/teams', () => {
    it('TC-TEAM-011: List teams as admin', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.pagination).toBe('object');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
    });

    it('TC-TEAM-012: List teams with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/teams?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.items.length).toBeLessThanOrEqual(5);
    });

    it('TC-TEAM-013: List teams with search', async () => {
      const response = await request(app)
        .get('/api/v1/teams?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      // All returned teams should have 'Test' in their name
      response.body.items.forEach((team: any) => {
        expect(team.name).toContain('Test');
      });
    });

    it('TC-TEAM-014: List teams without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/teams');

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-TEAM-015: List teams with TEAM_MEMBER role', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertSuccess(response);
      // Should only return user's team
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].id).toBe(testTeamId);
    });
  });

  describe('GET /api/v1/teams/:id', () => {
    it('TC-TEAM-016: Get existing team as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/teams/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.id).toBe(testTeamId);
      expect(response.body.name).toBeDefined();
      expect(response.body.timezone).toBeDefined();
      expect(response.body.stateId).toBeDefined();
    });

    it('TC-TEAM-017: Get own team as team member', async () => {
      const response = await request(app)
        .get(`/api/v1/teams/${testTeamId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.id).toBe(testTeamId);
    });

    it('TC-TEAM-018: Get non-existent team', async () => {
      const response = await request(app)
        .get('/api/v1/teams/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertError(response, 'TEAM_NOT_FOUND');
    });

    it('TC-TEAM-019: Get team without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/teams/${testTeamId}`);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-TEAM-020: Get other team as team member', async () => {
      // Create another team
      const createResponse = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateTeamData());

      const otherTeamId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/v1/teams/${otherTeamId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('PUT /api/v1/teams/:id', () => {
    it('TC-TEAM-021: Update team with valid data', async () => {
      const updateData = {
        name: 'Updated Team Name',
        timezone: 'America/New_York',
        stateId: 'NY01',
      };

      const response = await request(app)
        .put(`/api/v1/teams/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertSuccess(response);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.timezone).toBe(updateData.timezone);
      expect(response.body.stateId).toBe(updateData.stateId);
    });

    it('TC-TEAM-022: Update team with invalid timezone', async () => {
      const updateData = {
        timezone: 'Invalid/Timezone',
      };

      const response = await request(app)
        .put(`/api/v1/teams/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertError(response, 'INVALID_TIMEZONE');
    });

    it('TC-TEAM-023: Update team without authentication', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/teams/${testTeamId}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-TEAM-024: Update team with TEAM_MEMBER role', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/teams/${testTeamId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('DELETE /api/v1/teams/:id', () => {
    let emptyTeamId: string;

    beforeAll(async () => {
      // Create an empty team for deletion tests
      const createResponse = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateTeamData({
          name: 'Empty Team for Deletion',
        }));

      emptyTeamId = createResponse.body.id;
    });

    it('TC-TEAM-025: Delete team with no dependencies', async () => {
      const response = await request(app)
        .delete(`/api/v1/teams/${emptyTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
    });

    it('TC-TEAM-026: Delete team with users', async () => {
      const response = await request(app)
        .delete(`/api/v1/teams/${testTeamId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertError(response, 'TEAM_HAS_USERS');
    });

    it('TC-TEAM-028: Delete team without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/teams/${testTeamId}`);

      ApiAssertions.assertUnauthorized(response);
    });
  });
});