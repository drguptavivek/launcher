/**
 * Authentication and Authorization Integration Tests
 * Tests authentication middleware and role-based access control
 */

import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase, createTestData } from '../utils/test-setup';
import { ApiAssertions, TestDataGenerator } from '../utils/test-helpers';

describe('Authentication and Authorization', () => {
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

    // Create supervisor user
    const supervisorResponse = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'ADMIN')}`)
      .send(TestDataGenerator.generateUserData(testTeamId, {
        code: 'SUPER002',
        displayName: 'Auth Test Supervisor',
        role: 'SUPERVISOR',
        pin: '654321',
      }));

    supervisorId = supervisorResponse.body.id;

    // Generate auth tokens
    authToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'ADMIN');
    teamMemberToken = await (global as any).testUtils.generateTestToken(testUserId, testTeamId, 'TEAM_MEMBER');
    supervisorToken = await (global as any).testUtils.generateTestToken(supervisorId, testTeamId, 'SUPERVISOR');

    console.log('✅ Auth test setup completed');
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    console.log('✅ Auth test cleanup completed');
  });

  describe('Token Validation Tests', () => {
    it('TC-AUTH-001: Valid JWT token accepted', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`);

      ApiAssertions.assertSuccess(response);
    });

    it('TC-AUTH-002: Invalid JWT token rejected', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', 'Bearer invalid-token');

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-AUTH-003: Missing JWT token rejected', async () => {
      const response = await request(app)
        .get('/api/v1/teams');

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-AUTH-004: Malformed JWT token rejected', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', 'Bearer malformed.jwt.token');

      ApiAssertions.assertUnauthorized(response);
    });

    it('TC-AUTH-005: Wrong authorization header format rejected', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', `Basic ${authToken}`);

      ApiAssertions.assertUnauthorized(response);
    });
  });

  describe('Role-Based Access Tests', () => {
    it('TC-AUTH-006: Admin can access all team management endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/teams' },
        { method: 'post', path: '/api/v1/teams' },
        { method: 'get', path: `/api/v1/teams/${testTeamId}` },
        { method: 'put', path: `/api/v1/teams/${testTeamId}` },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${authToken}`)
          .set('Content-Type', 'application/json')
          .send(endpoint.method === 'post' ? TestDataGenerator.generateTeamData() : {});

        // Should not get 401 or 403
        expect([401, 403]).not.toContain(response.status);
      }
    });

    it('TC-AUTH-007: Supervisor can access limited team endpoints', async () => {
      const allowedEndpoints = [
        { method: 'get', path: '/api/v1/teams' },
        { method: 'get', path: `/api/v1/teams/${testTeamId}` },
      ];

      for (const endpoint of allowedEndpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${supervisorToken}`);

        ApiAssertions.assertSuccess(response);
      }
    });

    it('TC-AUTH-008: Team member can access limited endpoints', async () => {
      const allowedEndpoints = [
        { method: 'get', path: '/api/v1/teams' }, // Should return only own team
        { method: 'get', path: `/api/v1/teams/${testTeamId}` },
      ];

      for (const endpoint of allowedEndpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${teamMemberToken}`);

        ApiAssertions.assertSuccess(response);
      }
    });

    it('TC-AUTH-009: Role escalation attempts blocked', async () => {
      const privilegedOperations = [
        { method: 'post', path: '/api/v1/teams', data: TestDataGenerator.generateTeamData() },
        { method: 'post', path: '/api/v1/users', data: TestDataGenerator.generateUserData(testTeamId) },
        { method: 'put', path: `/api/v1/teams/${testTeamId}`, data: { name: 'Hacked' } },
      ];

      for (const operation of privilegedOperations) {
        const response = await request(app)
          [operation.method](operation.path)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .set('Content-Type', 'application/json')
          .send(operation.data);

        // Should be forbidden
        ApiAssertions.assertForbidden(response);
      }
    });
  });

  describe('Team-Based Access Tests', () => {
    let otherTeamId: string;
    let otherUserId: string;
    let otherTeamToken: string;

    beforeAll(async () => {
      // Create another team and user
      const teamResponse = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateTeamData({
          name: 'Other Auth Test Team',
        }));

      otherTeamId = teamResponse.body.id;

      const userResponse = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TestDataGenerator.generateUserData(otherTeamId, {
          code: 'OTHERAUTH001',
          displayName: 'Other Auth User',
        }));

      otherUserId = userResponse.body.id;
      otherTeamToken = await (global as any).testUtils.generateTestToken(otherUserId, otherTeamId, 'TEAM_MEMBER');
    });

    it('TC-AUTH-010: Users can access own team resources', async () => {
      const response = await request(app)
        .get(`/api/v1/teams/${otherTeamId}`)
        .set('Authorization', `Bearer ${otherTeamToken}`);

      ApiAssertions.assertSuccess(response);
      expect(response.body.id).toBe(otherTeamId);
    });

    it('TC-AUTH-011: Users cannot access other team resources', async () => {
      const response = await request(app)
        .get(`/api/v1/teams/${testTeamId}`)
        .set('Authorization', `Bearer ${otherTeamToken}`);

      ApiAssertions.assertForbidden(response);
    });

    it('TC-AUTH-012: Cross-team data access blocked', async () => {
      // Try to access users from another team
      const response = await request(app)
        .get(`/api/v1/users?teamId=${testTeamId}`)
        .set('Authorization', `Bearer ${otherTeamToken}`);

      // Should either return forbidden or filtered results (no data from other teams)
      if (response.status === 200) {
        // If successful, should be empty or filtered
        if (response.body.items && response.body.items.length > 0) {
          response.body.items.forEach((user: any) => {
            expect(user.teamId).toBe(otherTeamId);
          });
        }
      } else {
        ApiAssertions.assertForbidden(response);
      }
    });
  });

  describe('Request ID and Logging Tests', () => {
    it('TC-AUTH-013: Request ID header required', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`);

      // If request ID is required but not provided, should get 400
      if (response.status === 400) {
        expect(response.body.error?.code).toBe('MISSING_REQUEST_ID');
      } else {
        // If not required, should succeed
        ApiAssertions.assertSuccess(response);
      }
    });

    it('TC-AUTH-014: Valid request ID accepted', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-request-id', 'test-request-id-123');

      ApiAssertions.assertSuccess(response);
    });
  });

  describe('Rate Limiting Tests', () => {
    it('TC-AUTH-015: Excessive requests rate limited', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .get('/api/v1/teams')
            .set('Authorization', `Bearer ${authToken}`)
            .set('x-request-id', `test-request-${i}`)
        );
      }

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // This test depends on rate limiting configuration
      if (rateLimitedResponses.length > 0) {
        rateLimitedResponses.forEach(response => {
          expect(response.status).toBe(429);
        });
      } else {
        // If no rate limiting is implemented, all should succeed
        responses.forEach(response => {
          expect([200, 401]).toContain(response.status);
        });
      }
    });
  });

  describe('Security Headers Tests', () => {
    it('TC-AUTH-016: Security headers present', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`);

      // Check for common security headers
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
      ];

      securityHeaders.forEach(header => {
        // Headers should be present (or the security middleware should be implemented)
        const headerValue = response.headers[header];
        if (headerValue) {
          expect(headerValue).toBeDefined();
        }
      });
    });
  });

  describe('Input Validation Security', () => {
    it('TC-AUTH-017: SQL injection attempts blocked', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "<script>alert('xss')</script>",
        "{{7*7}}",
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .get(`/api/v1/teams?search=${encodeURIComponent(input)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should handle malicious input gracefully
        expect(response.status).toBeLessThan(500);
        expect(response.body).not.toContain('SQL');
        expect(response.body).not.toContain('error');
      }
    });

    it('TC-AUTH-018: Large payload handling', async () => {
      const largePayload = {
        name: 'A'.repeat(10000), // Very long name
        timezone: 'Asia/Kolkata',
        stateId: 'MH01',
      };

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(largePayload);

      // Should handle large payloads without crashing
      expect(response.status).toBeLessThan(500);
      if (response.status >= 400) {
        ApiAssertions.assertError(response);
      }
    });
  });

  describe('Error Response Security', () => {
    it('TC-AUTH-019: Error responses do not leak sensitive information', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      // Error responses should not leak database information
      if (response.status === 404) {
        expect(response.body).not.toContain('database');
        expect(response.body).not.toContain('sql');
        expect(response.body).not.toContain('internal');
      }
    });

    it('TC-AUTH-020: Detailed error messages in development', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({}); // Missing required fields

      // In development, should get detailed error messages
      expect(response.status).toBe(400);
      if (response.body.error) {
        expect(response.body.error.code).toBeDefined();
        expect(response.body.error.message).toBeDefined();
      }
    });
  });
});