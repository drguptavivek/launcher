/**
 * Fixed Test Data Helper
 *
 * Provides deterministic test data for reliable testing
 * This complements the faker-based random data generation
 */

import { db } from '../../src/lib/db';
import { teams, devices, users, sessions } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { FIXED_USERS, FIXED_DEVICE, FIXED_TEAM, seedFixedUsers, clearFixedUsers } from '../../scripts/seed-fixed-users';

/**
 * Ensures fixed test data exists before running tests
 * This should be called in test setup (beforeAll/beforeEach)
 */
export async function ensureFixedTestData() {
  try {
    // Check if team exists
    const existingTeam = await db.select()
      .from(teams)
      .where(eq(teams.id, FIXED_TEAM.teamId))
      .limit(1);

    if (existingTeam.length === 0) {
      console.log('🌱 Seeding fixed test data for tests...');
      await seedFixedUsers();
    } else {
      console.log('✅ Fixed test data already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure fixed test data:', error);
    throw error;
  }
}

/**
 * Clean up fixed test data after tests
 * This should be called in test teardown (afterAll/afterEach)
 */
export async function cleanupFixedTestData() {
  try {
    await clearFixedUsers();
  } catch (error) {
    console.error('❌ Failed to cleanup fixed test data:', error);
    throw error;
  }
}

/**
 * Get fixed test credentials for use in tests
 */
export const TEST_CREDENTIALS = {
  TEAM_MEMBER: {
    userCode: FIXED_USERS.TEAM_MEMBER.userCode,
    pin: FIXED_USERS.TEAM_MEMBER.pin,
    displayName: FIXED_USERS.TEAM_MEMBER.displayName,
    role: FIXED_USERS.TEAM_MEMBER.role
  },
  FIELD_SUPERVISOR: {
    userCode: FIXED_USERS.FIELD_SUPERVISOR.userCode,
    pin: FIXED_USERS.FIELD_SUPERVISOR.pin,
    displayName: FIXED_USERS.FIELD_SUPERVISOR.displayName,
    role: FIXED_USERS.FIELD_SUPERVISOR.role
  },
  SYSTEM_ADMIN: {
    userCode: FIXED_USERS.SYSTEM_ADMIN.userCode,
    pin: FIXED_USERS.SYSTEM_ADMIN.pin,
    displayName: FIXED_USERS.SYSTEM_ADMIN.displayName,
    role: FIXED_USERS.SYSTEM_ADMIN.role
  },
  DEVICE: {
    deviceId: FIXED_DEVICE.deviceId,
    name: FIXED_DEVICE.name
  },
  TEAM: {
    teamId: FIXED_TEAM.teamId,
    name: FIXED_TEAM.name
  }
} as const;

/**
 * Supervisor PINs for override testing
 */
export const SUPERVISOR_PINS = {
  SUPERVISOR1: {
    pin: '111111',
    name: 'Supervisor PIN 1'
  },
  SUPERVISOR2: {
    pin: '222222',
    name: 'Supervisor PIN 2'
  },
  SUPERVISOR3: {
    pin: '333333',
    name: 'Supervisor PIN 3'
  }
} as const;

/**
 * Invalid test credentials for negative testing
 */
export const INVALID_CREDENTIALS = {
  INVALID_USER: {
    userCode: 'invalid999',
    pin: '999999'
  },
  INVALID_PIN: {
    userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
    pin: 'wrongpin'
  },
  WRONG_DEVICE: {
    deviceId: 'non-existent-device',
    userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
    pin: TEST_CREDENTIALS.TEAM_MEMBER.pin
  }
} as const;

/**
 * Helper function to create login request body
 */
export function createLoginRequest(overrides: Partial<{
  deviceId: string;
  userCode: string;
  pin: string;
}> = {}) {
  return {
    deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
    userCode: TEST_CREDENTIALS.TEAM_MEMBER.userCode,
    pin: TEST_CREDENTIALS.TEAM_MEMBER.pin,
    ...overrides
  };
}

/**
 * Helper function to create supervisor override request body
 */
export function createSupervisorOverrideRequest(overrides: Partial<{
  deviceId: string;
  teamId: string;
  supervisor_pin: string;
  reason: string;
}> = {}) {
  return {
    deviceId: TEST_CREDENTIALS.DEVICE.deviceId,
    teamId: TEST_CREDENTIALS.TEAM.teamId,
    supervisor_pin: SUPERVISOR_PINS.SUPERVISOR1.pin,
    reason: 'Test supervisor override',
    ...overrides
  };
}

/**
 * Get user ID for fixed test users
 */
export async function getTestUserId(userType: keyof typeof FIXED_USERS): Promise<string> {
  const userConfig = FIXED_USERS[userType];
  const userId = `${userType.toLowerCase()}-${FIXED_TEAM.teamId}`;

  const user = await db.select()
    .from(users)
    .where(eq(users.code, userConfig.userCode))
    .where(eq(users.teamId, FIXED_TEAM.teamId))
    .limit(1);

  if (user.length === 0) {
    throw new Error(`Test user ${userConfig.userCode} not found. Make sure fixed test data is seeded.`);
  }

  return user[0].id;
}

export default {
  ensureFixedTestData,
  cleanupFixedTestData,
  TEST_CREDENTIALS,
  SUPERVISOR_PINS,
  INVALID_CREDENTIALS,
  createLoginRequest,
  createSupervisorOverrideRequest,
  getTestUserId
};