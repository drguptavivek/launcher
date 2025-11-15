#!/usr/bin/env tsx

/**
 * Endpoint Verification Script
 * Tests all API endpoints against the actual backend implementation
 * to ensure OpenAPI specification accuracy.
 */

import { execSync } from 'child_process';

interface EndpointTest {
  method: string;
  path: string;
  description: string;
  expectedStatus?: number;
  testBody?: any;
}

const BASE_URL = 'http://localhost:3000';

// List of endpoints to test based on OpenAPI spec
const endpoints: EndpointTest[] = [
  // Health endpoints
  { method: 'GET', path: '/health', description: 'Health check', expectedStatus: 200 },
  { method: 'GET', path: '/api-docs.json', description: 'OpenAPI JSON', expectedStatus: 200 },
  { method: 'GET', path: '/api-docs', description: 'Swagger UI', expectedStatus: 200 },

  // Mobile App Authentication endpoints
  { method: 'POST', path: '/api/v1/auth/login', description: 'Mobile login', expectedStatus: 401, testBody: { deviceId: 'test-001', userCode: 'USER001', pin: '123456' } },
  { method: 'GET', path: '/api/v1/auth/whoami', description: 'Mobile whoami', expectedStatus: 401 },
  { method: 'POST', path: '/api/v1/auth/logout', description: 'Mobile logout', expectedStatus: 401 },
  { method: 'POST', path: '/api/v1/auth/refresh', description: 'Mobile refresh', expectedStatus: 400, testBody: { refresh_token: 'invalid' } },
  { method: 'POST', path: '/api/v1/auth/session/end', description: 'Mobile end session', expectedStatus: 401 },
  { method: 'POST', path: '/api/v1/auth/heartbeat', description: 'Mobile heartbeat', expectedStatus: 401 },

  // Web Admin Authentication endpoints
  { method: 'POST', path: '/api/web-admin/auth/login', description: 'Web admin login', expectedStatus: 401, testBody: { email: 'test@example.com', password: 'wrong' } },
  { method: 'GET', path: '/api/web-admin/auth/whoami', description: 'Web admin whoami', expectedStatus: 401 },
  { method: 'POST', path: '/api/web-admin/auth/logout', description: 'Web admin logout', expectedStatus: 200 },
  { method: 'POST', path: '/api/web-admin/auth/refresh', description: 'Web admin refresh', expectedStatus: 400 },
  { method: 'POST', path: '/api/web-admin/auth/create-admin', description: 'Create admin', expectedStatus: 400, testBody: { email: 'test@example.com', password: 'password123', firstName: 'Test', lastName: 'User' } },

  // Team management endpoints
  { method: 'GET', path: '/api/v1/teams', description: 'List teams', expectedStatus: 401 },
  { method: 'POST', path: '/api/v1/teams', description: 'Create team', expectedStatus: 401, testBody: { name: 'Test Team' } },
  { method: 'GET', path: '/api/v1/teams/00000000-0000-0000-0000-000000000000', description: 'Get team', expectedStatus: 401 },
  { method: 'PUT', path: '/api/v1/teams/00000000-0000-0000-0000-000000000000', description: 'Update team', expectedStatus: 401, testBody: { name: 'Updated Team' } },
  { method: 'DELETE', path: '/api/v1/teams/00000000-0000-0000-0000-000000000000', description: 'Delete team', expectedStatus: 401 },

  // User management endpoints
  { method: 'GET', path: '/api/v1/users', description: 'List users', expectedStatus: 401 },
  { method: 'POST', path: '/api/v1/users', description: 'Create user', expectedStatus: 401, testBody: { teamId: '00000000-0000-0000-0000-000000000000', code: 'USER001', displayName: 'Test User', pin: '123456' } },
  { method: 'GET', path: '/api/v1/users/00000000-0000-0000-0000-000000000000', description: 'Get user', expectedStatus: 401 },
  { method: 'PUT', path: '/api/v1/users/00000000-0000-0000-0000-000000000000', description: 'Update user', expectedStatus: 401, testBody: { displayName: 'Updated User' } },
  { method: 'DELETE', path: '/api/v1/users/00000000-0000-0000-0000-000000000000', description: 'Delete user', expectedStatus: 401 },

  // Device management endpoints
  { method: 'GET', path: '/api/v1/devices', description: 'List devices', expectedStatus: 401 },
  { method: 'POST', path: '/api/v1/devices', description: 'Create device', expectedStatus: 401, testBody: { teamId: '00000000-0000-0000-0000-000000000000', name: 'Test Device' } },
  { method: 'GET', path: '/api/v1/devices/00000000-0000-0000-0000-000000000000', description: 'Get device', expectedStatus: 401 },
  { method: 'PUT', path: '/api/v1/devices/00000000-0000-0000-0000-000000000000', description: 'Update device', expectedStatus: 401, testBody: { name: 'Updated Device' } },
  { method: 'DELETE', path: '/api/v1/devices/00000000-0000-0000-0000-000000000000', description: 'Delete device', expectedStatus: 401 },

  // Policy endpoint
  { method: 'GET', path: '/api/v1/policy/00000000-0000-0000-0000-000000000000', description: 'Get device policy', expectedStatus: 401 },

  // Telemetry endpoint
  { method: 'POST', path: '/api/v1/telemetry', description: 'Submit telemetry', expectedStatus: 400, testBody: { events: [] } },

  // Supervisor override endpoint
  { method: 'POST', path: '/api/v1/supervisor/override/login', description: 'Supervisor override', expectedStatus: 400, testBody: { supervisor_pin: '123456', deviceId: 'test-001' } },
];

function testEndpoint(endpoint: EndpointTest): { success: boolean; status: number; error?: string } {
  try {
    let command = `curl -s -w '%{http_code}' -o /dev/null -X ${endpoint.method} '${BASE_URL}${endpoint.path}'`;

    if (endpoint.testBody) {
      command += ` -H 'Content-Type: application/json' -d '${JSON.stringify(endpoint.testBody)}'`;
    } else {
      command += ` -H 'Content-Type: application/json'`;
    }

    command += ` -H 'User-Agent: endpoint-verification-script'`;

    const actualStatus = parseInt(execSync(command, { encoding: 'utf8' }).trim());
    const expectedStatus = endpoint.expectedStatus || 200;

    if (actualStatus === expectedStatus) {
      return { success: true, status: actualStatus };
    } else {
      return {
        success: false,
        status: actualStatus,
        error: `Expected ${expectedStatus}, got ${actualStatus}`
      };
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: `Request failed: ${error}`
    };
  }
}

async function main() {
  console.log('🔍 Verifying SurveyLauncher API Endpoints...\n');

  let passed = 0;
  let failed = 0;

  const results = endpoints.map(endpoint => {
    const result = testEndpoint(endpoint);
    return { ...endpoint, ...result };
  });

  // Group by category
  const categories = {
    '📊 System': results.filter(e => e.path.startsWith('/health') || e.path.includes('api-doc')),
    '🔐 Mobile Auth': results.filter(e => e.path.startsWith('/api/v1/auth')),
    '👨‍💼 Web Admin Auth': results.filter(e => e.path.startsWith('/api/web-admin/auth')),
    '👥 Teams': results.filter(e => e.path.startsWith('/api/v1/teams')),
    '👤 Users': results.filter(e => e.path.startsWith('/api/v1/users')),
    '📱 Devices': results.filter(e => e.path.startsWith('/api/v1/devices')),
    '📋 Policy': results.filter(e => e.path.startsWith('/api/v1/policy')),
    '📡 Telemetry': results.filter(e => e.path.startsWith('/api/v1/telemetry')),
    '🔧 Supervisor': results.filter(e => e.path.includes('supervisor')),
  };

  Object.entries(categories).forEach(([category, categoryResults]) => {
    if (categoryResults.length === 0) return;

    console.log(`\n${category}:`);
    categoryResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const method = result.method.padEnd(4);
      const path = result.path.padEnd(50);
      const desc = result.description.padEnd(25);

      console.log(`  ${status} ${method} ${path} ${desc}`);

      if (!result.success) {
        console.log(`     Error: ${result.error}`);
        failed++;
      } else {
        passed++;
      }
    });
  });

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total: ${endpoints.length}`);

  if (failed > 0) {
    console.log(`\n⚠️  Some endpoint tests failed. This could indicate:`);
    console.log(`    • OpenAPI specification doesn't match implementation`);
    console.log(`    • Server is not running properly`);
    console.log(`    • Expected status codes need adjustment`);
  } else {
    console.log(`\n🎉 All endpoints are working as expected!`);
    console.log(`\n📚 Interactive Documentation:`);
    console.log(`    • Swagger UI: ${BASE_URL}/api-docs`);
    console.log(`    • OpenAPI JSON: ${BASE_URL}/api-docs.json`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);