import { db } from './db';
import { teams, devices, users, userPins, supervisorPins, sessions, telemetryEvents, policyIssues, jwtRevocations, pinAttempts } from './db/schema';
import { hashPassword, generateJTI, nowUTC } from './crypto';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Test Database Seeder with Faker.js
 *
 * Generates large volumes of realistic test data for comprehensive testing.
 * Can be run repeatedly to reset and reseed the database.
 */

interface SeedConfig {
  teamsCount: number;
  devicesPerTeam: number;
  usersPerTeam: number;
  supervisorPinsPerTeam: number;
  activeSessionsCount: number;
  telemetryEventsCount: number;
  policyIssuesPerDevice: number;
  pinAttemptsCount: number;
}

const DEFAULT_CONFIG: SeedConfig = {
  teamsCount: 10,
  devicesPerTeam: 20,
  usersPerTeam: 50,
  supervisorPinsPerTeam: 3,
  activeSessionsCount: 25,
  telemetryEventsCount: 500,
  policyIssuesPerDevice: 3,
  pinAttemptsCount: 200,
};

/**
 * Generate realistic test data using Faker
 */
export async function seedEnhancedTestDatabase(config: SeedConfig = DEFAULT_CONFIG) {
  console.log('🌱 Starting enhanced test database seeding with Faker.js...');
  console.log(`📊 Config: ${config.teamsCount} teams, ${config.devicesPerTeam} devices/team, ${config.usersPerTeam} users/team`);

  try {
    // Clear all existing data first
    await clearAllData();
    console.log('✅ Database cleared');

    const now = new Date();

    // 1. Generate teams
    const teams = await generateTeams(config.teamsCount);
    console.log(`✅ Created ${teams.length} teams`);

    // 2. Generate devices
    const devices = await generateDevices(teams, config.devicesPerTeam);
    console.log(`✅ Created ${devices.length} devices`);

    // 3. Generate users and their PINs
    const users = await generateUsers(teams, config.usersPerTeam);
    console.log(`✅ Created ${users.length} users with PINs`);

    // 4. Generate supervisor PINs
    const supervisorPins = await generateSupervisorPins(teams, config.supervisorPinsPerTeam);
    console.log(`✅ Created ${supervisorPins.length} supervisor PINs`);

    // 5. Generate sessions
    const sessions = await generateSessions(users, devices, config.activeSessionsCount);
    console.log(`✅ Created ${sessions.length} sessions`);

    // 6. Generate telemetry events
    const telemetryEvents = await generateTelemetryEvents(devices, sessions, config.telemetryEventsCount);
    console.log(`✅ Created ${telemetryEvents.length} telemetry events`);

    // 7. Generate policy issues
    const policyIssues = await generatePolicyIssues(devices, config.policyIssuesPerDevice);
    console.log(`✅ Created ${policyIssues.length} policy issues`);

    // 8. Generate PIN attempts for rate limiting testing
    const pinAttempts = await generatePinAttempts(users, devices, config.pinAttemptsCount);
    console.log(`✅ Created ${pinAttempts.length} PIN attempts`);

    // 9. Generate JWT revocations
    const jwtRevocations = await generateJwtRevocations();
    console.log(`✅ Created ${jwtRevocations.length} JWT revocations`);

    console.log('\n🎉 Enhanced test database seeding completed!');
    printEnhancedSummary(teams, users, devices, supervisorPins);

  } catch (error) {
    console.error('❌ Enhanced test database seeding failed:', error);
    throw error;
  }
}

/**
 * Generate teams
 */
async function generateTeams(count: number) {
  const teamsData = [];
  const indianStates = [
    'DL01', 'DL02', 'DL03', // Delhi
    'MH01', 'MH02', 'MH03', 'MH04', // Maharashtra
    'KA01', 'KA02', 'KA03', // Karnataka
    'TN01', 'TN02', // Tamil Nadu
    'GJ01', 'GJ02', // Gujarat
    'WB01', 'WB02', // West Bengal
    'UP01', 'UP02', 'UP03', // Uttar Pradesh
    'RJ01', 'RJ02', // Rajasthan
  ];

  const timezones = [
    'Asia/Kolkata', 'Asia/Mumbai', 'Asia/Delhi', 'Asia/Calcutta',
    'Asia/Bangalore', 'Asia/Chennai', 'Asia/Jaipur'
  ];

  for (let i = 0; i < count; i++) {
    const isActive = faker.datatype.boolean(0.85); // 85% active
    const teamData = {
      id: uuidv4(),
      name: `${faker.company.name()} Survey Team ${i + 1}`,
      timezone: faker.helpers.arrayElement(timezones),
      stateId: faker.helpers.arrayElement(indianStates),
      isActive,
      createdAt: faker.date.recent({ days: 365 }),
      updatedAt: faker.date.recent({ days: 30 }),
    };

    teamsData.push(teamData);
  }

  await db.insert(teams).values(teamsData);
  return teamsData;
}

/**
 * Generate devices for teams
 */
async function generateDevices(teams: any[], devicesPerTeam: number) {
  const devicesData = [];
  const androidManufacturers = ['Samsung', 'Xiaomi', 'OnePlus', 'Google', 'Motorola', 'Oppo', 'Vivo', 'Realme', 'Apple', 'Huawei'];
  const androidModels = {
    'Samsung': ['Galaxy S23', 'Galaxy Tab A', 'Galaxy A54', 'Galaxy S22', 'Galaxy Note 20'],
    'Xiaomi': ['Redmi Note 12', 'Redmi 9', 'Poco X5', 'Mi 11', 'Redmi K40'],
    'OnePlus': ['OnePlus 11', 'OnePlus Nord 3', 'OnePlus 9', 'OnePlus 8T', 'OnePlus 7'],
    'Google': ['Pixel 7', 'Pixel 6', 'Pixel 8', 'Pixel 7a', 'Pixel 6a'],
    'Motorola': ['Edge 40', 'Moto G84', 'Razr 40', 'One Power', 'G73'],
    'Oppo': ['Reno 10', 'Find X6', 'A98', 'Reno 8', 'Find N3'],
    'Vivo': ['X90', 'V27', 'Y79', 'X80', 'V23'],
    'Realme': ['GT 3', '11 Pro+', '10 Pro+', '8 Pro', '6 Pro'],
    'Apple': ['iPhone 14', 'iPhone 15', 'iPad 9', 'iPhone 13', 'iPad Air'],
    'Huawei': ['P50 Pro', 'Mate 50', 'P40 Pro', 'Mate 40', 'P30 Pro']
  };

  for (const team of teams) {
    for (let i = 0; i < devicesPerTeam; i++) {
      const manufacturer = faker.helpers.arrayElement(androidManufacturers);
      const models = androidModels[manufacturer] || ['Unknown Model'];
      const model = faker.helpers.arrayElement(models);

      const deviceData = {
        id: uuidv4(),
        teamId: team.id,
        name: `${manufacturer} ${model} (${faker.helpers.arrayElement(['Primary', 'Backup', 'Test', 'Demo'])} Device)`,
        androidId: faker.string.alphanumeric({ length: 16 }).toLowerCase(),
        appVersion: faker.helpers.arrayElement(['1.0.0', '1.0.1', '1.1.0', '1.1.1', '1.2.0', '1.2.1', '2.0.0-beta']),
        isActive: faker.datatype.boolean(0.9), // 90% active
        lastSeenAt: faker.datatype.boolean(0.7) ? faker.date.recent({ days: 7 }) : null,
        lastGpsAt: faker.datatype.boolean(0.6) ? faker.date.recent({ days: 7 }) : null,
        createdAt: faker.date.recent({ days: 365 }),
        updatedAt: faker.date.recent({ days: 30 }),
      };

      devicesData.push(deviceData);
    }
  }

  await db.insert(devices).values(devicesData);
  return devicesData;
}

/**
 * Generate users for teams
 */
async function generateUsers(teams: any[], usersPerTeam: number) {
  const usersData = [];
  const userPinsData = [];

  for (const team of teams) {
    for (let i = 0; i < usersPerTeam; i++) {
      const isActive = faker.datatype.boolean(0.85); // 85% active
      const roleWeights = [
        { role: 'TEAM_MEMBER', weight: 0.7 },
        { role: 'SUPERVISOR', weight: 0.25 },
        { role: 'ADMIN', weight: 0.05 }
      ];
      const role = faker.helpers.weightedArrayElement(roleWeights.map(r => ({ array: [r.role], weight: r.weight })));

      const userData = {
        id: uuidv4(),
        code: `emp${faker.number.int({ min: 1000, max: 9999 })}`,
        teamId: team.id,
        displayName: faker.person.fullName({ sex: faker.datatype.boolean() ? 'male' : 'female' }),
        email: faker.datatype.boolean() ? faker.internet.email() : null,
        role,
        isActive,
        createdAt: faker.date.recent({ days: 365 }),
        updatedAt: faker.date.recent({ days: 30 }),
      };

      usersData.push(userData);

      // Generate PIN for active users
      if (isActive) {
        const pin = faker.string.numeric({ length: 6 });
        const pinHash = await hashPassword(pin);

        userPinsData.push({
          userId: userData.id,
          pinHash: pinHash.hash,
          salt: pinHash.salt,
          isActive: true,
          rotatedAt: faker.date.recent({ days: 90 }),
          createdAt: userData.createdAt,
          updatedAt: faker.date.recent({ days: 30 }),
        });
      }
    }
  }

  await db.insert(users).values(usersData);
  await db.insert(userPins).values(userPinsData);

  return usersData;
}

/**
 * Generate supervisor PINs for teams
 */
async function generateSupervisorPins(teams: any[], pinsPerTeam: number) {
  const supervisorPinsData = [];

  for (const team of teams) {
    for (let i = 0; i < pinsPerTeam; i++) {
      const pin = faker.helpers.arrayElement(['111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '000000']);
      const pinHash = await hashPassword(pin);

      const supervisorPinData = {
        id: uuidv4(),
        teamId: team.id,
        name: `${faker.person.fullName()} (${faker.helpers.arrayElement(['Lead', 'Manager', 'Supervisor', 'Coordinator', 'Director'])})`,
        pinHash: pinHash.hash,
        salt: pinHash.salt,
        isActive: faker.datatype.boolean(0.9), // 90% active
        rotatedAt: faker.date.recent({ days: 60 }),
        createdAt: faker.date.recent({ days: 365 }),
        updatedAt: faker.date.recent({ days: 30 }),
      };

      supervisorPinsData.push(supervisorPinData);
    }
  }

  await db.insert(supervisorPins).values(supervisorPinsData);
  return supervisorPinsData;
}

/**
 * Generate sessions
 */
async function generateSessions(users: any[], devices: any[], count: number) {
  const sessionsData = [];
  const statuses = ['open', 'expired', 'ended'];

  for (let i = 0; i < count; i++) {
    const user = faker.helpers.arrayElement(users.filter(u => u.isActive));
    const device = faker.helpers.arrayElement(devices.filter(d => d.isActive));
    const status = faker.helpers.arrayElement(statuses);
    const startedAt = faker.date.recent({ days: 30 });

    let expiresAt = faker.date.soon({ days: 7, refDate: startedAt });
    let endedAt = null;
    let overrideUntil = null;

    if (status === 'expired') {
      expiresAt = faker.date.past({ days: 1 });
    } else if (status === 'ended') {
      endedAt = faker.date.between({ from: startedAt, to: faker.date.recent() });
      expiresAt = faker.date.soon({ days: 1, refDate: endedAt });
    } else if (status === 'open' && faker.datatype.boolean()) {
      // 20% of open sessions have supervisor override
      overrideUntil = faker.date.soon({ hours: faker.number.int({ min: 1, max: 6 }) });
    }

    const sessionData = {
      id: uuidv4(),
      userId: user.id,
      teamId: user.teamId,
      deviceId: device.id,
      startedAt,
      expiresAt,
      endedAt,
      status,
      overrideUntil,
      tokenJti: generateJTI(),
      lastActivityAt: faker.date.between({ from: startedAt, to: new Date() }),
    };

    sessionsData.push(sessionData);
  }

  await db.insert(sessions).values(sessionsData);
  return sessionsData;
}

/**
 * Generate telemetry events
 */
async function generateTelemetryEvents(devices: any[], sessions: any[], count: number) {
  const eventsData = [];
  const eventTypes = ['heartbeat', 'gps', 'app_usage', 'battery', 'error', 'screen_time', 'network'];
  const appNames = ['survey_app', 'camera', 'gallery', 'settings', 'calculator', 'notes', 'browser', 'maps', 'contacts', 'messages'];

  const indianLocations = [
    { lat: 28.6139, lng: 77.2090 }, // Delhi
    { lat: 19.0760, lng: 72.8777 }, // Mumbai
    { lat: 12.9716, lng: 77.5946 }, // Bangalore
    { lat: 13.0827, lng: 80.2707 }, // Chennai
    { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
    { lat: 26.9124, lng: 75.7873 }, // Jaipur
    { lat: 22.5726, lng: 88.3639 }, // Kolkata
    { lat: 17.3850, lng: 78.4867 }, // Hyderabad
  ];

  const activeDevices = devices.filter(d => d.isActive);

  for (let i = 0; i < count; i++) {
    const device = faker.helpers.arrayElement(activeDevices);
    const eventType = faker.helpers.arrayElement(eventTypes);
    const timestamp = faker.date.recent({ days: 7 }); // Last 7 days

    let eventData: any = {};

    switch (eventType) {
      case 'heartbeat':
        eventData = {
          battery: faker.number.int({ min: 0, max: 100 }),
          signal_strength: faker.number.int({ min: 1, max: 5 }),
          memory_usage: faker.number.int({ min: 30, max: 90 }),
          device_temperature: faker.number.int({ min: 25, max: 45 }),
        };
        break;
      case 'gps':
        const location = faker.helpers.arrayElement(indianLocations);
        eventData = {
          latitude: location.lat + (faker.datatype.boolean() ? 1 : -1) * faker.number.int({ min: 0, max: 2 }) * 0.01,
          longitude: location.lng + (faker.datatype.boolean() ? 1 : -1) * faker.number.int({ min: 0, max: 2 }) * 0.01,
          accuracy: faker.number.int({ min: 5, max: 50 }),
          speed: faker.number.int({ min: 0, max: 120 }),
          heading: faker.number.int({ min: 0, max: 360 }),
        };
        break;
      case 'app_usage':
        eventData = {
          app_name: faker.helpers.arrayElement(appNames),
          duration_ms: faker.number.int({ min: 1000, max: 300000 }), // 1 sec to 5 min
          memory_usage: faker.number.int({ min: 10, max: 200 }),
          cpu_usage: faker.number.int({ min: 1, max: 100 }),
        };
        break;
      case 'battery':
        eventData = {
          level: faker.number.int({ min: 0, max: 100 }),
          charging: faker.datatype.boolean(),
          temperature: faker.number.int({ min: 20, max: 50 }),
          health: faker.helpers.arrayElement(['good', 'overheat', 'cold', 'dead']),
        };
        break;
      case 'screen_time':
        eventData = {
          total_minutes: faker.number.int({ min: 10, max: 480 }),
          unlock_count: faker.number.int({ min: 1, max: 100 }),
          longest_session: faker.number.int({ min: 5, max: 120 }),
          app_name: faker.helpers.arrayElement(appNames),
        };
        break;
      case 'network':
        eventData = {
          type: faker.helpers.arrayElement(['wifi', 'cellular', 'ethernet']),
          strength: faker.helpers.arrayElement(['poor', 'fair', 'good', 'excellent']),
          connection_type: faker.helpers.arrayElement(['4G', '5G', 'LTE', 'WiFi']),
          bytes_sent: faker.number.int({ min: 1000, max: 10000000 }),
          bytes_received: faker.number.int({ min: 5000, max: 50000000 }),
        };
        break;
      case 'error':
        eventData = {
          error_code: faker.helpers.arrayElement(['NETWORK_ERROR', 'GPS_TIMEOUT', 'AUTH_FAILED', 'CRASH', 'MEMORY_ERROR', 'STORAGE_FULL']),
          error_message: faker.helpers.arrayElement([
            'Network connection failed',
            'GPS location timeout',
            'Authentication failed',
            'Application crashed',
            'Low memory',
            'Storage full',
            'Camera permission denied',
            'Background service stopped'
          ]),
          stack_trace: faker.datatype.boolean() ? faker.lorem.paragraph() : null,
        };
        break;
    }

    const event = {
      id: generateJTI(),
      deviceId: device.id,
      sessionId: faker.datatype.boolean(0.3) ? faker.helpers.arrayElement(sessions).id : null,
      eventType,
      eventData,
      timestamp,
      receivedAt: faker.date.soon({ minutes: faker.number.int({ min: 0, max: 60 }) }),
    };

    eventsData.push(event);
  }

  await db.insert(telemetryEvents).values(eventsData);
  return eventsData;
}

/**
 * Generate policy issues
 */
async function generatePolicyIssues(devices: any[], issuesPerDevice: number) {
  const policyIssuesData = [];
  const activeDevices = devices.filter(d => d.isActive);

  for (const device of activeDevices) {
    for (let i = 0; i < issuesPerDevice; i++) {
      const issuedAt = faker.date.recent({ days: i * 7 }); // Stagger by weeks
      const expiresAt = faker.date.soon({ days: faker.datatype.number({ min: 1, max: 30 }), refDate: issuedAt });

      const policyData = {
        version: faker.datatype.number({ min: 1, max: 5 }),
        deviceId: device.id,
        teamId: device.teamId,
        timestamp: issuedAt.toISOString(),
        session: {
          allowed_windows: faker.helpers.arrayElement([
            [{ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '09:00', end: '18:00' }],
            [{ days: ['Sat', 'Sun'], start: '10:00', end: '16:00' }],
            [{ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], start: '08:00', end: '20:00' }],
            [{ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '06:00', end: '22:00' }],
          ]),
          grace_minutes: faker.datatype.number({ min: 5, max: 30 }),
          supervisor_override_minutes: faker.datatype.number({ min: 30, max: 240 }),
        },
        gps: {
          active_fix_interval_minutes: faker.helpers.arrayElement([3, 5, 10, 15]),
          min_displacement_m: faker.datatype.number({ min: 20, max: 100 }),
          accuracy_threshold_m: faker.datatype.number({ min: 5, max: 20 }),
        },
        telemetry: {
          heartbeat_minutes: faker.helpers.arrayElement([5, 10, 15, 30]),
          batch_max: faker.helpers.arrayElement([20, 50, 100]),
        },
        security: {
          max_login_attempts: faker.datatype.number({ min: 3, max: 10 }),
          lockout_duration_minutes: faker.datatype.number({ min: 5, max: 60 }),
          session_timeout_hours: faker.datatype.number({ min: 4, max: 24 }),
        },
        restrictions: {
          allowed_apps: faker.helpers.arrayElements(appNames.slice(0, 5), { min: 1, max: 3 }),
          blocked_websites: faker.helpers.arrayElements(['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com'], { min: 0, max: 3 }),
          screen_capture_blocked: faker.datatype.boolean(),
          usb_data_blocked: faker.datatype.boolean(),
        },
      };

      const policyIssue = {
        id: generateJTI(),
        deviceId: device.id,
        version: `v${policyData.version}`,
        issuedAt,
        expiresAt,
        jwsKid: `policy-key-${device.id}-${i}`,
        policyData,
        ipAddress: faker.internet.ip(),
      };

      policyIssuesData.push(policyIssue);
    }
  }

  await db.insert(policyIssues).values(policyIssuesData);
  return policyIssuesData;
}

/**
 * Generate PIN attempts for rate limiting
 */
async function generatePinAttempts(users: any[], devices: any[], count: number) {
  const pinAttemptsData = [];
  const attemptTypes = ['user_pin', 'supervisor_pin'];
  const activeUsers = users.filter(u => u.isActive);
  const activeDevices = devices.filter(d => d.isActive);

  for (let i = 0; i < count; i++) {
    const user = faker.helpers.arrayElement(activeUsers);
    const device = faker.helpers.arrayElement(activeDevices);
    const attemptType = faker.helpers.arrayElement(attemptTypes);
    const success = faker.datatype.boolean(0.6); // 60% success rate

    const attempt = {
      id: generateJTI(),
      userId: user.id,
      deviceId: device.id,
      attemptType,
      success,
      ipAddress: faker.internet.ipv4(),
      attemptedAt: faker.date.recent({ days: 7 }),
    };

    pinAttemptsData.push(attempt);
  }

  await db.insert(pinAttempts).values(pinAttemptsData);
  return pinAttemptsData;
}

/**
 * Generate JWT revocations
 */
async function generateJwtRevocations() {
  const revocationReasons = [
    'user_logout',
    'session_expired',
    'security_violation',
    'admin_action',
    'token_compromise',
    'policy_update',
    'password_change',
    'user_deletion',
  ];

  const revocationsData = [];
  const count = faker.datatype.number({ min: 5, max: 20 });

  for (let i = 0; i < count; i++) {
    const revokedAt = faker.date.recent({ days: 30 });
    const expiresAt = faker.date.soon({ days: faker.datatype.number({ min: 1, max: 90 }), refDate: revokedAt });

    const revocation = {
      jti: generateJTI(),
      revokedAt,
      expiresAt,
      reason: faker.helpers.arrayElement(revocationReasons),
      revokedBy: faker.helpers.arrayElement(['system', 'admin', 'user', 'auto_logout']),
    };

    revocationsData.push(revocation);
  }

  await db.insert(jwtRevocations).values(revocationsData);
  return revocationsData;
}

/**
 * Clear all data from database tables
 */
async function clearAllData() {
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
 * Print enhanced summary
 */
function printEnhancedSummary(teams: any[], users: any[], devices: any[], supervisorPins: any[]) {
  console.log('\n📊 Enhanced Test Data Summary:');
  console.log(`   Teams: ${teams.length}`);
  console.log(`   Devices: ${devices.length} (${devices.filter(d => d.isActive).length} active)`);
  console.log(`   Users: ${users.length} (${users.filter(u => u.isActive).length} active)`);
  console.log(`   Supervisor PINs: ${supervisorPins.length} (${supervisorPins.filter(s => s.isActive).length} active)`);

  console.log('\n👤 Sample User Credentials:');
  const sampleUsers = users.filter(u => u.isActive).slice(0, 10);
  sampleUsers.forEach((user, index) => {
    console.log(`     ${index + 1}. ${user.code} / [PIN] - ${user.displayName} (${user.role})`);
  });

  console.log('\n📱 Sample Devices:');
  const sampleDevices = devices.filter(d => d.isActive).slice(0, 10);
  sampleDevices.forEach((device, index) => {
    console.log(`     ${index + 1}. ${device.name} (${device.id.slice(-8)})`);
  });

  console.log('\n🔑 Sample Supervisor PINs:');
  const sampleSupPins = supervisorPins.filter(s => s.isActive).slice(0, 5);
  sampleSupPins.forEach((supPin, index) => {
    console.log(`     ${index + 1}. [${supPin.pin.slice(-2)}] - ${supPin.name}`);
  });
}

// Run if executed directly
if (import.meta.main) {
  const command = process.argv[2];
  const configArg = process.argv[3];

  let config = DEFAULT_CONFIG;

  // Allow configuration override via JSON string argument
  if (configArg) {
    try {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(configArg) };
    } catch (error) {
      console.error('Invalid config JSON:', error);
      process.exit(1);
    }
  }

  if (command === 'seed') {
    await seedEnhancedTestDatabase(config);
  } else {
    console.log('Usage: bun run src/lib/seed-test-enhanced.ts seed [config]');
    console.log('Examples:');
    console.log('  bun run src/lib/seed-test-enhanced.ts seed');
    console.log('  bun run src/lib/seed-test-enhanced.ts seed \'{"teamsCount":5,"usersPerTeam":20}\'');
    console.log('\nDefault config:');
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}