/**
 * Test Database Setup and Utilities
 * Uses the main PostgreSQL database for integration testing
 * Tests use isolated data and cleanup to avoid interference
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '../src/lib/db/schema';
import { hashPassword } from '../src/lib/crypto';

// Use the main PostgreSQL database for testing
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL must be set for testing');
}

// Test database connection (reuse main database connection)
export const testConnection = postgres(dbUrl, { max: 1 });
export const testDb = drizzle(testConnection, { schema });

/**
 * Setup test database with clean state
 */
export async function setupTestDatabase() {
  // Clean all tables in correct order due to foreign key constraints
  await testConnection.unsafe(`TRUNCATE TABLE
    jwt_revocations,
    telemetry_events,
    supervisor_pins,
    user_pins,
    sessions,
    devices,
    users,
    teams
    CASCADE;`);

  console.log('Test database cleaned');
}

/**
 * Create test data for integration tests
 */
export async function createTestData() {
  // Create test team
  const [testTeam] = await testDb.insert(schema.teams).values({
    id: 'test-team-123',
    name: 'Test Survey Team',
    timezone: 'Asia/Kolkata',
    stateId: 'MH01',
  }).returning();

  // Create test user with PIN
  const [testUser] = await testDb.insert(schema.users).values({
    id: 'test-user-123',
    teamId: testTeam.id,
    code: 'TEST001',
    displayName: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN',
    isActive: true,
  }).returning();

  const pinHash = await hashPassword('123456');
  await testDb.insert(schema.userPins).values({
    userId: testUser.id,
    pinHash: pinHash.hash,
    salt: pinHash.salt,
  });

  // Create test device
  const [testDevice] = await testDb.insert(schema.devices).values({
    id: 'test-device-123',
    teamId: testTeam.id,
    name: 'Test Device',
    androidId: 'test-android-123',
    appVersion: '1.0.0',
    isActive: true,
  }).returning();

  // Create test supervisor PIN
  const supervisorPinHash = await hashPassword('789012');
  const [testSupervisorPin] = await testDb.insert(schema.supervisorPins).values({
    id: 'test-sup-pin-123',
    teamId: testTeam.id,
    name: 'Test Supervisor',
    pinHash: supervisorPinHash.hash,
    salt: supervisorPinHash.salt,
    isActive: true,
  }).returning();

  return {
    team: testTeam,
    user: testUser,
    device: testDevice,
    supervisorPin: testSupervisorPin,
  };
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  await testConnection.unsafe(`TRUNCATE TABLE
    jwt_revocations,
    telemetry_events,
    supervisor_pins,
    user_pins,
    sessions,
    devices,
    users,
    teams
    CASCADE;`);
  console.log('Test database cleaned up');
}

/**
 * Close test database connection
 */
export async function closeTestDatabase() {
  await testConnection.end();
}

/**
 * Generate test JWT tokens
 */
export async function generateTestTokens(userId: string, teamId: string) {
  // This would need to import the actual token generation functions
  // For now, return mock token structure
  return {
    accessToken: `test-access-token-${userId}`,
    refreshToken: `test-refresh-token-${userId}`,
  };
}

/**
 * Test data constants
 */
export const TEST_DATA = {
  VALID_TEAM: {
    name: 'Integration Test Team',
    timezone: 'Asia/Kolkata',
    stateId: 'MH01',
  },
  VALID_USER: {
    teamId: 'test-team-123',
    code: 'INT001',
    displayName: 'Integration Test User',
    email: 'integration@example.com',
    role: 'TEAM_MEMBER',
    pin: '123456',
  },
  VALID_DEVICE: {
    teamId: 'test-team-123',
    name: 'Integration Test Device',
    androidId: 'integration-android-123',
    appVersion: '1.0.0',
  },
  VALID_SUPERVISOR_PIN: {
    teamId: 'test-team-123',
    name: 'Integration Test Supervisor',
    pin: '789012',
  },
};

export default {
  setupTestDatabase,
  createTestData,
  cleanupTestDatabase,
  closeTestDatabase,
  generateTestTokens,
  TEST_DATA,
};