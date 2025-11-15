import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { setTestEnv, clearTestEnv } from './src/lib/test-env.js';

const BASE_URL = 'http://localhost:3000';

describe('Authorization Security Tests - Mobile API Routes', () => {
  beforeAll(async () => {
    // Set up test environment
    setTestEnv();
    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(() => {
    // Clean up test environment
    clearTestEnv();
  });

  describe('Telemetry Endpoint Security', () => {
    it('should reject unauthorized telemetry submissions', async () => {
      console.log('🔒 Testing: Unauthorized telemetry submission...');

      const response = await fetch(`${BASE_URL}/api/v1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: [
            { t: 'heartbeat', ts: '2025-11-15T19:55:00Z', battery: 0.85 }
          ],
          deviceId: 'test-device-123',
          sessionId: 'test-session-123'
        })
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: Telemetry endpoint properly rejects unauthorized requests');
    });

    it('should reject telemetry submissions with invalid tokens', async () => {
      console.log('🔒 Testing: Telemetry submission with invalid token...');

      const response = await fetch(`${BASE_URL}/api/v1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-here'
        },
        body: JSON.stringify({
          events: [
            { t: 'heartbeat', ts: '2025-11-15T19:55:00Z', battery: 0.85 }
          ],
          deviceId: 'test-device-123',
          sessionId: 'test-session-123'
        })
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/INVALID_TOKEN|UNAUTHORIZED/);

      console.log('✅ SUCCESS: Telemetry endpoint properly rejects invalid tokens');
    });
  });

  describe('Policy Endpoint Security', () => {
    it('should reject unauthorized policy requests', async () => {
      console.log('🔒 Testing: Unauthorized policy request...');

      const response = await fetch(`${BASE_URL}/api/v1/policy/test-device-123`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: Policy endpoint properly rejects unauthorized requests');
    });

    it('should reject policy requests with invalid tokens', async () => {
      console.log('🔒 Testing: Policy request with invalid token...');

      const response = await fetch(`${BASE_URL}/api/v1/policy/test-device-123`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-here'
        }
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/INVALID_TOKEN|UNAUTHORIZED/);

      console.log('✅ SUCCESS: Policy endpoint properly rejects invalid tokens');
    });
  });

  describe('Supervisor Override Endpoint Security', () => {
    it('should reject unauthorized supervisor override requests', async () => {
      console.log('🔒 Testing: Unauthorized supervisor override request...');

      const response = await fetch(`${BASE_URL}/api/v1/supervisor/override/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supervisor_pin: '123456',
          deviceId: 'test-device-123'
        })
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: Supervisor override endpoint properly rejects unauthorized requests');
    });

    it('should reject supervisor override requests with invalid tokens', async () => {
      console.log('🔒 Testing: Supervisor override request with invalid token...');

      const response = await fetch(`${BASE_URL}/api/v1/supervisor/override/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-here'
        },
        body: JSON.stringify({
          supervisor_pin: '123456',
          deviceId: 'test-device-123'
        })
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/INVALID_TOKEN|UNAUTHORIZED/);

      console.log('✅ SUCCESS: Supervisor override endpoint properly rejects invalid tokens');
    });
  });

  describe('Device Management Endpoint Security', () => {
    it('should reject unauthorized device listing requests', async () => {
      console.log('🔒 Testing: Unauthorized device listing request...');

      const response = await fetch(`${BASE_URL}/api/v1/devices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: Device listing endpoint properly rejects unauthorized requests');
    });

    it('should reject unauthorized device creation requests', async () => {
      console.log('🔒 Testing: Unauthorized device creation request...');

      const response = await fetch(`${BASE_URL}/api/v1/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'test-team-123',
          name: 'Test Device',
          androidId: 'test-android-id'
        })
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: Device creation endpoint properly rejects unauthorized requests');
    });
  });

  describe('User Management Endpoint Security', () => {
    it('should reject unauthorized user listing requests', async () => {
      console.log('🔒 Testing: Unauthorized user listing request...');

      const response = await fetch(`${BASE_URL}/api/v1/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: User listing endpoint properly rejects unauthorized requests');
    });

    it('should reject unauthorized user creation requests', async () => {
      console.log('🔒 Testing: Unauthorized user creation request...');

      const response = await fetch(`${BASE_URL}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'test-team-123',
          code: 'TESTUSER',
          displayName: 'Test User',
          pin: '123456'
        })
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: User creation endpoint properly rejects unauthorized requests');
    });
  });

  describe('Team Management Endpoint Security', () => {
    it('should reject unauthorized team listing requests', async () => {
      console.log('🔒 Testing: Unauthorized team listing request...');

      const response = await fetch(`${BASE_URL}/api/v1/teams`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: Team listing endpoint properly rejects unauthorized requests');
    });

    it('should reject unauthorized team creation requests', async () => {
      console.log('🔒 Testing: Unauthorized team creation request...');

      const response = await fetch(`${BASE_URL}/api/v1/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Team',
          timezone: 'UTC'
        })
      });

      const responseData = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, responseData);

      // Should return 401 Unauthorized for missing authentication
      expect(response.status).toBe(401);
      expect(responseData.ok).toBe(false);
      expect(responseData.error.code).toMatch(/MISSING_TOKEN|UNAUTHORIZED|AUTHENTICATION_REQUIRED/);

      console.log('✅ SUCCESS: Team creation endpoint properly rejects unauthorized requests');
    });
  });

  describe('Server Health Check', () => {
    it('should respond to health check', async () => {
      console.log('🏥 Testing: Server health check...');

      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, data);

      if (response.status !== 200) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      if (data.status !== 'ok') {
        throw new Error('Health check response invalid');
      }
      console.log(`   Server status: ${data.status}`);

      console.log('✅ SUCCESS: Server health check passed');
    });
  });
});

// Additional test suite for Web Admin security
describe('Web Admin Authorization Security Tests', () => {
  it('should still protect create-admin endpoint', async () => {
    console.log('🔒 Testing: Web admin create-admin protection...');

    const response = await fetch(`${BASE_URL}/api/v1/web-admin/auth/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'hacker@evil.com',
        password: 'password123',
        firstName: 'Hacker',
        lastName: 'Evil',
        role: 'SYSTEM_ADMIN'
      })
    });

    const responseData = await response.json();

    console.log(`Response Status: ${response.status}`);
    console.log(`Response Data:`, responseData);

    // Should return 401 Unauthorized
    expect(response.status).toBe(401);
    expect(responseData.ok).toBe(false);
    expect(responseData.error.code).toMatch(/UNAUTHORIZED|INVALID_TOKEN|AUTHENTICATION_REQUIRED/);

    console.log('✅ SUCCESS: Web admin create-admin endpoint remains properly protected');
  });
});

console.log('🚀 Starting Authorization Security Tests...');
console.log('='.repeat(60));