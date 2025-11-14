import { db } from './db';
import { teams, devices, users, userPins, supervisorPins, sessions, telemetryEvents, policyIssues, jwtRevocations, pinAttempts } from './db/schema';
import { hashPassword, generateJTI, nowUTC } from './crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Comprehensive Test Database Seeder
 *
 * This script creates realistic test data for all major use cases:
 * - Multiple teams with different configurations
 * - Various device types and states
 * - Users with different roles and PIN configurations
 * - Historical and active sessions
 * - Diverse telemetry events
 * - Policy distributions
 * - PIN attempts for rate limiting testing
 * - JWT revocations for security testing
 */

export interface TestSeedData {
  teams: Array<{
    id: string;
    name: string;
    timezone: string;
    stateId: string;
  }>;
  devices: Array<{
    id: string;
    teamId: string;
    name: string;
    androidId: string;
    appVersion: string;
    isActive: boolean;
  }>;
  users: Array<{
    id: string;
    teamId: string;
    code: string;
    displayName: string;
    role: string;
    pin: string;
    isActive: boolean;
  }>;
  supervisorPins: Array<{
    id: string;
    teamId: string;
    name: string;
    pin: string;
    isActive: boolean;
  }>;
}

/**
 * Generate comprehensive test data
 */
export function generateTestData(): TestSeedData {
  return {
    teams: [
      { id: 'team-delhi-001', name: 'Delhi Survey Team Alpha', timezone: 'Asia/Kolkata', stateId: 'DL01' },
      { id: 'team-mumbai-002', name: 'Mumbai Field Team Beta', timezone: 'Asia/Kolkata', stateId: 'MH01' },
      { id: 'team-bangalore-003', name: 'Bangalore Tech Team', timezone: 'Asia/Kolkata', stateId: 'KA01' },
      { id: 'team-chennai-004', name: 'Chennai Operations', timezone: 'Asia/Kolkata', stateId: 'TN01' },
      { id: 'team-inactive-005', name: 'Inactive Test Team', timezone: 'Asia/Kolkata', stateId: 'GJ01' },
    ],
    devices: [
      { id: 'dev-android-001', teamId: 'team-delhi-001', name: 'Samsung Galaxy Tab A', androidId: 'samsung-gtab-001', appVersion: '1.0.0', isActive: true },
      { id: 'dev-android-002', teamId: 'team-delhi-001', name: 'Xiaomi Redmi Note', androidId: 'xiaomi-rn-002', appVersion: '1.0.1', isActive: true },
      { id: 'dev-android-003', teamId: 'team-mumbai-002', name: 'OnePlus Nord', androidId: 'oneplus-n-003', appVersion: '1.0.0', isActive: true },
      { id: 'dev-android-004', teamId: 'team-mumbai-002', name: 'Google Pixel 6', androidId: 'google-p6-004', appVersion: '1.0.2', isActive: true },
      { id: 'dev-android-005', teamId: 'team-bangalore-003', name: 'Motorola Edge', androidId: 'moto-edge-005', appVersion: '1.1.0-beta', isActive: true },
      { id: 'dev-android-006', teamId: 'team-chennai-004', name: 'Oppo Reno', androidId: 'oppo-r-006', appVersion: '1.0.0', isActive: true },
      { id: 'dev-inactive-007', teamId: 'team-inactive-005', name: 'Inactive Device', androidId: 'inactive-007', appVersion: '0.9.0', isActive: false },
      { id: 'dev-no-android-008', teamId: 'team-delhi-001', name: 'Test Device No Android ID', androidId: '', appVersion: '1.0.0', isActive: true },
    ],
    users: [
      { id: 'user-001', teamId: 'team-delhi-001', code: 'emp001', displayName: 'Rahul Sharma', role: 'TEAM_MEMBER', pin: '123456', isActive: true },
      { id: 'user-002', teamId: 'team-delhi-001', code: 'emp002', displayName: 'Priya Patel', role: 'TEAM_MEMBER', pin: '234567', isActive: true },
      { id: 'user-003', teamId: 'team-delhi-001', code: 'sup001', displayName: 'Amit Kumar (Supervisor)', role: 'SUPERVISOR', pin: '345678', isActive: true },
      { id: 'user-004', teamId: 'team-mumbai-002', code: 'emp003', displayName: 'Sneha Reddy', role: 'TEAM_MEMBER', pin: '456789', isActive: true },
      { id: 'user-005', teamId: 'team-mumbai-002', code: 'emp004', displayName: 'Vikram Singh', role: 'TEAM_MEMBER', pin: '567890', isActive: true },
      { id: 'user-006', teamId: 'team-mumbai-002', code: 'sup002', displayName: 'Neha Joshi (Supervisor)', role: 'SUPERVISOR', pin: '678901', isActive: true },
      { id: 'user-007', teamId: 'team-bangalore-003', code: 'emp005', displayName: 'Arjun Nair', role: 'TEAM_MEMBER', pin: '789012', isActive: true },
      { id: 'user-008', teamId: 'team-bangalore-003', code: 'admin001', displayName: 'Admin User', role: 'ADMIN', pin: '890123', isActive: true },
      { id: 'user-009', teamId: 'team-chennai-004', code: 'emp006', displayName: 'Kavita Menon', role: 'TEAM_MEMBER', pin: '901234', isActive: true },
      { id: 'user-010', teamId: 'team-delhi-001', code: 'inactive001', displayName: 'Inactive User', role: 'TEAM_MEMBER', pin: '012345', isActive: false },
    ],
    supervisorPins: [
      { id: 'sup-pin-001', teamId: 'team-delhi-001', name: 'Delhi Team Lead', pin: '111111', isActive: true },
      { id: 'sup-pin-002', teamId: 'team-mumbai-002', name: 'Mumbai Team Lead', pin: '222222', isActive: true },
      { id: 'sup-pin-003', teamId: 'team-bangalore-003', name: 'Bangalore Team Lead', pin: '333333', isActive: true },
      { id: 'sup-pin-004', teamId: 'team-chennai-004', name: 'Chennai Team Lead', pin: '444444', isActive: true },
      { id: 'sup-pin-005', teamId: 'team-inactive-005', name: 'Inactive Supervisor PIN', pin: '555555', isActive: false },
    ],
  };
}

/**
 * Seed test database with comprehensive data
 */
export async function seedTestDatabase() {
  console.log('🌱 Starting comprehensive test database seeding...');

  const testData = generateTestData();
  const now = new Date();

  try {
    // 1. Clear existing data
    await clearTestDatabase();
    console.log('✅ Database cleared');

    // 2. Create teams
    for (const team of testData.teams) {
      await db.insert(teams).values({
        id: team.id,
        name: team.name,
        timezone: team.timezone,
        stateId: team.stateId,
        isActive: !team.id.includes('inactive'),
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`✅ Created ${testData.teams.length} teams`);

    // 3. Create devices
    for (const device of testData.devices) {
      await db.insert(devices).values({
        id: device.id,
        teamId: device.teamId,
        name: device.name,
        androidId: device.androidId || null,
        appVersion: device.appVersion || null,
        isActive: device.isActive,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`✅ Created ${testData.devices.length} devices`);

    // 4. Create users and their PINs
    for (const user of testData.users) {
      await db.insert(users).values({
        id: user.id,
        code: user.code,
        teamId: user.teamId,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        createdAt: now,
        updatedAt: now,
      });

      // Create user PIN if active
      if (user.isActive) {
        const pinHash = await hashPassword(user.pin);
        await db.insert(userPins).values({
          userId: user.id,
          pinHash: pinHash.hash,
          salt: pinHash.salt,
          isActive: true,
          rotatedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    console.log(`✅ Created ${testData.users.length} users with PINs`);

    // 5. Create supervisor PINs
    for (const supPin of testData.supervisorPins) {
      const pinHash = await hashPassword(supPin.pin);
      await db.insert(supervisorPins).values({
        id: supPin.id,
        teamId: supPin.teamId,
        name: supPin.name,
        pinHash: pinHash.hash,
        salt: pinHash.salt,
        isActive: supPin.isActive,
        rotatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`✅ Created ${testData.supervisorPins.length} supervisor PINs`);

    // 6. Create sample sessions
    await createSampleSessions(testData);

    // 7. Create sample telemetry events
    await createSampleTelemetryEvents(testData);

    // 8. Create sample policy issues
    await createSamplePolicyIssues(testData);

    // 9. Create PIN attempts for rate limiting testing
    await createSamplePinAttempts(testData);

    // 10. Create sample JWT revocations
    await createSampleJwtRevocations();

    console.log('\n🎉 Comprehensive test database seeding completed!');
    printTestSummary(testData);

  } catch (error) {
    console.error('❌ Test database seeding failed:', error);
    throw error;
  }
}

/**
 * Create sample sessions for testing
 */
async function createSampleSessions(testData: TestSeedData) {
  const now = new Date();
  const sessions = [
    // Active session
    {
      id: 'session-active-001',
      userId: 'user-001',
      teamId: 'team-delhi-001',
      deviceId: 'dev-android-001',
      startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000), // 6 hours from now
      status: 'open' as const,
      tokenJti: generateJTI(),
    },
    // Expired session
    {
      id: 'session-expired-002',
      userId: 'user-002',
      teamId: 'team-delhi-001',
      deviceId: 'dev-android-002',
      startedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000), // 10 hours ago
      expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'expired' as const,
      tokenJti: generateJTI(),
    },
    // Session with supervisor override
    {
      id: 'session-override-003',
      userId: 'user-003',
      teamId: 'team-delhi-001',
      deviceId: 'dev-android-001',
      startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      expiresAt: new Date(now.getTime() + 5 * 60 * 60 * 1000), // 5 hours from now
      status: 'open' as const,
      overrideUntil: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours override
      tokenJti: generateJTI(),
    },
  ];

  for (const session of sessions) {
    await db.insert(sessions).values({
      ...session,
      lastActivityAt: new Date(now.getTime() - Math.random() * 60 * 60 * 1000), // Random activity in last hour
    });
  }

  console.log(`✅ Created ${sessions.length} sample sessions`);
}

/**
 * Create sample telemetry events
 */
async function createSampleTelemetryEvents(testData: TestSeedData) {
  const now = new Date();
  const events = [];

  // Generate diverse telemetry events
  const eventTypes = ['heartbeat', 'gps', 'app_usage', 'battery', 'error'];

  for (let i = 0; i < 50; i++) {
    const deviceIndex = Math.floor(Math.random() * testData.devices.filter(d => d.isActive).length);
    const device = testData.devices.filter(d => d.isActive)[deviceIndex];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000); // Random time in last 24 hours

    let eventData: any = {};

    switch (eventType) {
      case 'heartbeat':
        eventData = { battery: Math.round(Math.random() * 100) };
        break;
      case 'gps':
        eventData = {
          latitude: 28.5 + (Math.random() - 0.5) * 0.1, // Around Delhi area
          longitude: 77.2 + (Math.random() - 0.5) * 0.1,
          accuracy: Math.round(Math.random() * 20) + 5,
        };
        break;
      case 'app_usage':
        eventData = {
          app_name: ['survey_app', 'camera', 'gallery', 'settings'][Math.floor(Math.random() * 4)],
          duration_ms: Math.round(Math.random() * 60000) + 1000,
        };
        break;
      case 'battery':
        eventData = {
          level: Math.round(Math.random() * 100),
          charging: Math.random() > 0.7,
        };
        break;
      case 'error':
        eventData = {
          error_code: ['NETWORK_ERROR', 'GPS_TIMEOUT', 'AUTH_FAILED'][Math.floor(Math.random() * 3)],
          error_message: 'Sample error for testing',
        };
        break;
    }

    events.push({
      id: generateJTI(),
      deviceId: device.id,
      sessionId: null, // Can be linked to actual sessions if needed
      eventType,
      eventData,
      timestamp,
      receivedAt: now,
    });
  }

  await db.insert(telemetryEvents).values(events);
  console.log(`✅ Created ${events.length} telemetry events`);
}

/**
 * Create sample policy issues
 */
async function createSamplePolicyIssues(testData: TestSeedData) {
  const now = new Date();
  const policies = [];

  for (const device of testData.devices.filter(d => d.isActive)) {
    // Create 2-3 policy issues per device with different versions
    for (let version = 1; version <= 2; version++) {
      const issuedAt = new Date(now.getTime() - version * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000);

      policies.push({
        id: generateJTI(),
        deviceId: device.id,
        version: `v${version}`,
        issuedAt,
        expiresAt,
        jwsKid: `policy-key-${device.id}`,
        policyData: {
          version: 3,
          deviceId: device.id,
          teamId: device.teamId,
          timestamp: issuedAt.toISOString(),
          // Sample policy configuration
          session: {
            allowed_windows: [
              { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '09:00', end: '18:00' }
            ],
            grace_minutes: 15,
            supervisor_override_minutes: 120,
          },
          gps: {
            active_fix_interval_minutes: 3,
            min_displacement_m: 50,
          },
        },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      });
    }
  }

  await db.insert(policyIssues).values(policies);
  console.log(`✅ Created ${policies.length} policy issues`);
}

/**
 * Create sample PIN attempts for rate limiting testing
 */
async function createSamplePinAttempts(testData: TestSeedData) {
  const now = new Date();
  const attempts = [];

  // Create various PIN attempt scenarios
  const scenarios = [
    // Successful attempts
    { userId: 'user-001', deviceId: 'dev-android-001', type: 'user_pin', success: true, count: 5 },
    { userId: 'user-002', deviceId: 'dev-android-002', type: 'user_pin', success: true, count: 3 },

    // Failed attempts (for rate limiting testing)
    { userId: 'user-004', deviceId: 'dev-android-003', type: 'user_pin', success: false, count: 8 },
    { userId: 'user-005', deviceId: 'dev-android-004', type: 'supervisor_pin', success: false, count: 12 },

    // Mixed attempts
    { userId: 'user-006', deviceId: 'dev-android-005', type: 'user_pin', success: true, count: 2 },
    { userId: 'user-006', deviceId: 'dev-android-005', type: 'user_pin', success: false, count: 4 },
  ];

  for (const scenario of scenarios) {
    for (let i = 0; i < scenario.count; i++) {
      attempts.push({
        id: generateJTI(),
        userId: scenario.userId,
        deviceId: scenario.deviceId,
        attemptType: scenario.type,
        success: scenario.type === 'user_pin' && i < scenario.count / 2 ? scenario.success :
                 (scenario.type === 'supervisor_pin' && i < 2 ? scenario.success : false),
        ipAddress: '192.168.1.100',
        attemptedAt: new Date(now.getTime() - Math.random() * 60 * 60 * 1000), // Random time in last hour
      });
    }
  }

  await db.insert(pinAttempts).values(attempts);
  console.log(`✅ Created ${attempts.length} PIN attempts`);
}

/**
 * Create sample JWT revocations
 */
async function createSampleJwtRevocations() {
  const now = new Date();
  const revocations = [
    {
      jti: 'revoked-token-001',
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      reason: 'user_logout',
      revokedBy: 'user-001',
    },
    {
      jti: 'revoked-token-002',
      expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Expired revocation
      reason: 'session_expired',
      revokedBy: 'system',
    },
    {
      jti: 'revoked-token-003',
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      reason: 'security_violation',
      revokedBy: 'admin-001',
    },
  ];

  await db.insert(jwtRevocations).values(revocations);
  console.log(`✅ Created ${revocations.length} JWT revocations`);
}

/**
 * Clear all test data
 */
async function clearTestDatabase() {
  const tables = [
    pinAttempts,
    jwtRevocations,
    telemetryEvents,
    sessions,
    userPins,
    supervisorPins,
    users,
    devices,
    teams,
    policyIssues,
  ];

  for (const table of tables) {
    await db.delete(table);
  }
}

/**
 * Print test data summary
 */
function printTestSummary(testData: TestSeedData) {
  console.log('\n📋 Test Data Summary:');
  console.log('   Teams:');
  testData.teams.forEach(team => {
    console.log(`     - ${team.name} (${team.id}) - ${team.stateId} - ${team.timezone}`);
  });

  console.log('\n   Active Users:');
  testData.users.filter(u => u.isActive).forEach(user => {
    console.log(`     - ${user.displayName} (${user.code}) - PIN: ${user.pin} - Role: ${user.role}`);
  });

  console.log('\n   Devices:');
  testData.devices.filter(d => d.isActive).forEach(device => {
    console.log(`     - ${device.name} (${device.id}) - ${device.appVersion} - Team: ${device.teamId}`);
  });

  console.log('\n   Supervisor PINs:');
  testData.supervisorPins.filter(s => s.isActive).forEach(supPin => {
    console.log(`     - ${supPin.name} - PIN: ${supPin.pin} - Team: ${supPin.teamId}`);
  });

  console.log('\n   Login Credentials:');
  console.log('     Regular Users:');
  console.log('       emp001 / 123456 (Rahul Sharma)');
  console.log('       emp002 / 234567 (Priya Patel)');
  console.log('       emp003 / 345678 (Amit Kumar - Supervisor)');
  console.log('       emp004 / 456789 (Sneha Reddy)');
  console.log('       emp005 / 567890 (Vikram Singh)');
  console.log('       emp006 / 678901 (Neha Joshi - Supervisor)');
  console.log('       emp007 / 789012 (Arjun Nair)');
  console.log('       admin001 / 890123 (Admin User)');
  console.log('       emp006 / 901234 (Kavita Menon)');

  console.log('     Supervisor Override PINs:');
  console.log('       Delhi Team: 111111');
  console.log('       Mumbai Team: 222222');
  console.log('       Bangalore Team: 333333');
  console.log('       Chennai Team: 444444');
}

// Run if executed directly
if (import.meta.main) {
  const command = process.argv[2];

  if (command === 'seed') {
    await seedTestDatabase();
  } else {
    console.log('Usage: bun run src/lib/seed-test.ts seed');
    console.log('  seed - Populate database with comprehensive test data');
  }
}