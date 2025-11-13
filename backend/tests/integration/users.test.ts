/**
 * User Management API Integration Tests
 * Tests all user-related endpoints against the main PostgreSQL database
 */

import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase, createTestData, TEST_DATA } from '../utils/test-setup';
import { ApiAssertions, TestDataGenerator } from '../utils/test-helpers';

describe('User Management API', () => {
  let authToken: string;
  let teamMemberToken: string;
  let supervisorToken: string;
  let testTeamId: string;
  let testUserId: string;
  let supervisorId: string;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Create test data
    const testData = await createTestData();
    testTeamId = testData.team.id;
    testUserId = testData.user.id;

    // Create supervisor user for testing
    const supervisorResponse = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'ADMIN')}`)
      .send(TestDataGenerator.generateUserData(testTeamId, {
        code: 'SUPER001',
        displayName: 'Test Supervisor',
        role: 'SUPERVISOR',
        pin: '654321',
      }));

    supervisorId = supervisorResponse.body.id;

    // Generate auth tokens
    authToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'ADMIN');
    teamMemberToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'TEAM_MEMBER');
    supervisorToken = await (global as any).testUtils.generateTestToken(supervisorId, testTeamId, 'SUPERVISOR');

    console.log('✅ User test setup completed');
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    console.log('✅ User test cleanup completed');
  });

  describe('POST /api/v1/users', () => {
    it('TC-USER-001: Create user with valid data', async () => {
      const userData = TestDataGenerator.generateUserData(testTeamId, {
        code: 'NEW001',
        displayName: 'New Test User',
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe(userData.code);
      expect(response.body.displayName).toBe(userData.displayName);
      expect(response.body.email).toBe(userData.email);
      expect(response.body.role).toBe(userData.role);
      expect(response.body.teamId).toBe(userData.teamId);
      expect(response.body).not.toHaveProperty('pinHash');
      expect(response.body).not.toHaveProperty('pin');
    });

    it('TC-USER-002: Create user with optional email', async () => {
      const userData = TestDataGenerator.generateUserData(testTeamId, {
        code: 'EMAIL001',
        displayName: 'User with Email',
        email: 'user.with.email@example.com',
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertSuccess(response);
      expect(response.body.email).toBe(userData.email);
    });

    it('TC-USER-003: Create user with missing required fields', async () => {
      const userData = {
        displayName: 'User Missing Fields',
        // Missing teamId, code, pin
      };

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertError(response, 'MISSING_FIELDS');
    });

    it('TC-USER-004: Create user with duplicate code in team', async () => {
      const userData = TestDataGenerator.generateUserData(testTeamId, {
        code: 'TEST001', // Same as initial test user
        displayName: 'Duplicate Code User',
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertError(response, 'USER_CODE_EXISTS');
    });

    it('TC-USER-005: Create user with invalid role', async () => {
      const userData = TestDataGenerator.generateUserData(testTeamId, {
        code: 'INVALID001',
        role: 'INVALID_ROLE',
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertError(response, 'INVALID_ROLE');
    });

    it('TC-USER-006: Create user with weak PIN', async () => {
      const userData = TestDataGenerator.generateUserData(testTeamId, {
        code: 'WEAK001',
        pin: '123', // Less than 4 characters
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertError(response, 'WEAK_PIN');
    });

    it('TC-USER-007: Create user without authentication', async () => {
      const userData = TestDataGenerator.generateUserData(testTeamId, {
        code: 'NOAUTH001',
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-USER-008: Create user with TEAM_MEMBER role', async () => {
      const userData = TestDataGenerator.generateUserData(testTeamId, {
        code: 'TMEMBER001',
      });

      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(userData);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('GET /api/v1/users', () => {
    it('TC-USER-009: List users as admin', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.pagination).toBe('object');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
    });

    it('TC-USER-010: List users with filters', async () => {
      const response = await request(app)
        .get(`/api/v1/users?teamId=${testTeamId}&role=TEAM_MEMBER&isActive=true`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      response.body.items.forEach((user: any) => {
        expect(user.teamId).toBe(testTeamId);
        expect(user.role).toBe('TEAM_MEMBER');
        expect(user.isActive).toBe(true);
      });
    });

    it('TC-USER-011: List users with search', async () => {
      const response = await request(app)
        .get('/api/v1/users?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      response.body.items.forEach((user: any) => {
        expect(user.displayName.toLowerCase()).toContain('test');
      });
    });

    it('TC-USER-012: List users without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users');

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-USER-013: List users as team member', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertSuccess(response);
      // Should only return users from the same team
      response.body.items.forEach((user: any) => {
        expect(user.teamId).toBe(testTeamId);
      });
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('TC-USER-014: Get existing user as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.id).toBe(testUserId);
      expect(response.body.displayName).toBeDefined();
      expect(response.body.email).toBeDefined();
      expect(response.body.role).toBeDefined();
      expect(response.body).not.toHaveProperty('pinHash');
    });

    it('TC-USER-015: Get non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertError(response, 'USER_NOT_FOUND');
    });

    it('TC-USER-016: Get user without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUserId}`);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-USER-017: Get user from different team', async () => {
      // Create a user in a different team
      const otherTeamResponse = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateTeamData({
          name: 'Other Team',
        }));

      const otherTeamId = otherTeamResponse.body.id;
      const otherUserResponse = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateUserData(otherTeamId, {
          code: 'OTHER001',
        }));

      const otherUserId = otherUserResponse.body.id;

      const response = await request(app)
        .get(`/api/v1/users/${otherUserId}`)
        .set('Authorization', `Bearer ${teamMemberToken}`);

      ApiAssertions.assertForbidden(response);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('TC-USER-018: Update user with valid data', async () => {
      const updateData = {
        displayName: 'Updated User Name',
        email: 'updated@example.com',
        role: 'SUPERVISOR',
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertSuccess(response);
      expect(response.body.displayName).toBe(updateData.displayName);
      expect(response.body.email).toBe(updateData.email);
      expect(response.body.role).toBe(updateData.role);
    });

    it('TC-USER-019: Update user PIN', async () => {
      const updateData = {
        pin: '654321',
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertSuccess(response);
      // PIN updated successfully (tested via login in real scenario)
    });

    it('TC-USER-020: Update user with weak PIN', async () => {
      const updateData = {
        pin: '123',
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertError(response, 'WEAK_PIN');
    });

    it('TC-USER-021: Update user without authentication', async () => {
      const updateData = { displayName: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-USER-022: Update user as same user (self)', async () => {
      const userSelfToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'TEAM_MEMBER');
      const updateData = {
        displayName: 'Self Updated Name',
        email: 'self.updated@example.com',
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${userSelfToken}`)
        .set('Content-Type', 'application/json')
        .send(updateData);

      // This test depends on business rules - allowing self-updates for limited fields
      // If the implementation allows self-updates for displayName and email
      if (response.status === 200) {
        expect(response.body.displayName).toBe(updateData.displayName);
        expect(response.body.email).toBe(updateData.email);
      } else {
        // If not allowed, should be forbidden
        ApiAssertions.assertForbidden(response);
      }
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    let deleteTestUserId: string;

    beforeAll(async () => {
      // Create a user for deletion tests
      const createResponse = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateUserData(testTeamId, {
          code: 'DELETE001',
          displayName: 'User for Deletion',
        }));

      deleteTestUserId = createResponse.body.id;
    });

    it('TC-USER-023: Deactivate user', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${deleteTestUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);

      // Verify user is deactivated
      const getResponse = await request(app)
        .get(`/api/v1/users/${deleteTestUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.isActive).toBe(false);
    });

    it('TC-USER-024: Delete user without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${testUserId}`);

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('POST /api/v1/users/:id/reset-pin', () => {
    let pinResetUserId: string;

    beforeAll(async () => {
      // Create a user for PIN reset tests
      const createResponse = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateUserData(testTeamId, {
          code: 'PINRESET001',
          displayName: 'User for PIN Reset',
        }));

      pinResetUserId = createResponse.body.id;
    });

    it('TC-USER-025: Reset user PIN as admin', async () => {
      const resetData = {
        newPin: '999999',
      };

      const response = await request(app)
        .post(`/api/v1/users/${pinResetUserId}/reset-pin`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(resetData);

      ApiAssertions.assertSuccess(response);
    });

    it('TC-USER-026: Reset PIN without authentication', async () => {
      const resetData = {
        newPin: '999999',
      };

      const response = await request(app)
        .post(`/api/v1/users/${pinResetUserId}/reset-pin`)
        .set('Content-Type', 'application/json')
        .send(resetData);

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-USER-027: Reset PIN as team member (own PIN)', async () => {
      const resetData = {
        currentPin: '123456',
        newPin: '888888',
      };

      const response = await request(app)
        .post(`/api/v1/users/${testUserId}/reset-pin`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .set('Content-Type', 'application/json')
        .send(resetData);

      // This depends on business rules - if self PIN reset is allowed
      if (response.status === 200) {
        ApiAssertions.assertSuccess(response);
      } else {
        ApiAssertions.assertForbidden(response);
      }
    });
  });
});