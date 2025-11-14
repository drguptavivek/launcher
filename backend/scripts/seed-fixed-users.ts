#!/usr/bin/env tsx

/**
 * Fixed User Seed Script
 *
 * Creates deterministic test users with known credentials
 * This ensures tests can rely on consistent user data
 */

import { db } from '../src/lib/db';
import { teams, devices, users, userPins, supervisorPins, sessions } from '../src/lib/db/schema';
import { verifyPassword, hashPassword } from '../src/lib/crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/lib/logger';
import { eq } from 'drizzle-orm';

// Fixed test credentials - these should be used in all tests
// Updated for new 9-role RBAC system
export const FIXED_USERS = {
  // Field Operations Roles
  TEAM_MEMBER: {
    userCode: 'test001',
    pin: '123456',
    displayName: 'Test Team Member',
    role: 'TEAM_MEMBER' as const
  },
  FIELD_SUPERVISOR: {
    userCode: 'test002',
    pin: '654321',
    displayName: 'Test Field Supervisor',
    role: 'FIELD_SUPERVISOR' as const
  },
  REGIONAL_MANAGER: {
    userCode: 'test003',
    pin: '789012',
    displayName: 'Test Regional Manager',
    role: 'REGIONAL_MANAGER' as const
  },

  // Technical Operations Roles
  SYSTEM_ADMIN: {
    userCode: 'test004',
    pin: 'admin123',
    displayName: 'Test System Admin',
    role: 'SYSTEM_ADMIN' as const
  },
  SUPPORT_AGENT: {
    userCode: 'test005',
    pin: 'support456',
    displayName: 'Test Support Agent',
    role: 'SUPPORT_AGENT' as const
  },
  AUDITOR: {
    userCode: 'test006',
    pin: 'audit789',
    displayName: 'Test Auditor',
    role: 'AUDITOR' as const
  },

  // Specialized Roles
  DEVICE_MANAGER: {
    userCode: 'test007',
    pin: 'device012',
    displayName: 'Test Device Manager',
    role: 'DEVICE_MANAGER' as const
  },
  POLICY_ADMIN: {
    userCode: 'test008',
    pin: 'policy345',
    displayName: 'Test Policy Admin',
    role: 'POLICY_ADMIN' as const
  },
  NATIONAL_SUPPORT_ADMIN: {
    userCode: 'test009',
    pin: 'national678',
    displayName: 'Test National Support Admin',
    role: 'NATIONAL_SUPPORT_ADMIN' as const
  }
} as const;

export const FIXED_SUPERVISOR_PINS = {
  FIELD_SUPERVISOR_PIN: {
    pin: '111111',
    name: 'Field Supervisor Override PIN'
  },
  REGIONAL_MANAGER_PIN: {
    pin: '222222',
    name: 'Regional Manager Override PIN'
  },
  SYSTEM_ADMIN_PIN: {
    pin: '333333',
    name: 'System Administrator Override PIN'
  }
} as const;

export const FIXED_DEVICE = {
  deviceId: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Test Device 001'
} as const;

export const FIXED_TEAM = {
  teamId: '550e8400-e29b-41d4-a716-446655440002',
  name: 'AIIMS Delhi Survey Team',
  stateId: 'DL07',
  timezone: 'Asia/Kolkata'
} as const;

async function seedFixedUsers() {
  try {
    console.log('🌱 Starting fixed user seeding...');

    // Create test team
    console.log('Creating test team...');
    await db.insert(teams).values({
      id: FIXED_TEAM.teamId,
      name: FIXED_TEAM.name,
      stateId: FIXED_TEAM.stateId,
      timezone: FIXED_TEAM.timezone,
      isActive: true,
      createdAt: new Date()
    }).onConflictDoUpdate({
      target: teams.id,
      set: {
        name: FIXED_TEAM.name,
        stateId: FIXED_TEAM.stateId,
        timezone: FIXED_TEAM.timezone,
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Create test device
    console.log('Creating test device...');
    await db.insert(devices).values({
      id: FIXED_DEVICE.deviceId,
      teamId: FIXED_TEAM.teamId,
      androidId: FIXED_DEVICE.deviceId,
      name: FIXED_DEVICE.name,
      isActive: true,
      lastSeenAt: new Date(),
      createdAt: new Date()
    }).onConflictDoUpdate({
      target: devices.id,
      set: {
        teamId: FIXED_TEAM.teamId,
        name: FIXED_DEVICE.name,
        isActive: true,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create fixed users - Updated for new 9-role RBAC system
    const userIds: Record<string, string> = {
      TEAM_MEMBER: '550e8400-e29b-41d4-a716-446655440003',
      FIELD_SUPERVISOR: '550e8400-e29b-41d4-a716-446655440004',
      REGIONAL_MANAGER: '550e8400-e29b-41d4-a716-446655440005',
      SYSTEM_ADMIN: '550e8400-e29b-41d4-a716-446655440006',
      SUPPORT_AGENT: '550e8400-e29b-41d4-a716-446655440007',
      AUDITOR: '550e8400-e29b-41d4-a716-446655440008',
      DEVICE_MANAGER: '550e8400-e29b-41d4-a716-446655440009',
      POLICY_ADMIN: '550e8400-e29b-41d4-a716-446655440010',
      NATIONAL_SUPPORT_ADMIN: '550e8400-e29b-41d4-a716-446655440011'
    };

    for (const [userType, userConfig] of Object.entries(FIXED_USERS)) {
      console.log(`Creating ${userType.toLowerCase()} user: ${userConfig.userCode}`);

      const userId = userIds[userType];

      // Insert user
      await db.insert(users).values({
        id: userId,
        teamId: FIXED_TEAM.teamId,
        code: userConfig.userCode,
        displayName: userConfig.displayName,
        role: userConfig.role,
        isActive: true,
        createdAt: new Date()
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: userConfig.displayName,
          role: userConfig.role,
          isActive: true,
          updatedAt: new Date()
        }
      });

      // Hash PIN and create user PIN
      const pinHash = await hashPassword(userConfig.pin);
      await db.insert(userPins).values({
        userId,
        pinHash: pinHash.hash,
        salt: pinHash.salt,
        isActive: true,
        rotatedAt: new Date()
      }).onConflictDoUpdate({
        target: userPins.userId,
        set: {
          pinHash: pinHash.hash,
          salt: pinHash.salt,
          isActive: true,
          rotatedAt: new Date()
        }
      });
    }

    // Create fixed supervisor PINs
    console.log('Creating supervisor PINs...');
    const supervisorPinIds = [
      '550e8400-e29b-41d4-a716-446655440006',
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440008'
    ];

    let supervisorPinIndex = 0;
    for (const [pinType, pinConfig] of Object.entries(FIXED_SUPERVISOR_PINS)) {
      const supervisorPinId = supervisorPinIds[supervisorPinIndex];

      const pinHash = await hashPassword(pinConfig.pin);
      await db.insert(supervisorPins).values({
        id: supervisorPinId,
        teamId: FIXED_TEAM.teamId,
        name: pinConfig.name,
        pinHash: pinHash.hash,
        salt: pinHash.salt,
        isActive: true,
        rotatedAt: new Date()
      }).onConflictDoUpdate({
        target: supervisorPins.id,
        set: {
          name: pinConfig.name,
          pinHash: pinHash.hash,
          salt: pinHash.salt,
          isActive: true,
          rotatedAt: new Date()
        }
      });

      supervisorPinIndex++;
    }

    console.log('\n✅ Fixed users seeded successfully!');
    console.log('\n📋 Available Test Credentials:');
    console.log('=====================================');

    console.log('\n👤 Users:');
    for (const [userType, userConfig] of Object.entries(FIXED_USERS)) {
      console.log(`  ${userConfig.userCode} / ${userConfig.pin} (${userConfig.role}) - ${userConfig.displayName}`);
    }

    console.log('\n🔐 Supervisor PINs:');
    for (const [pinType, pinConfig] of Object.entries(FIXED_SUPERVISOR_PINS)) {
      console.log(`  ${pinConfig.pin} - ${pinConfig.name}`);
    }

    console.log('\n📱 Device:');
    console.log(`  ${FIXED_DEVICE.deviceId} - ${FIXED_DEVICE.name}`);

    console.log('\n🏢 Team:');
    console.log(`  ${FIXED_TEAM.teamId} - ${FIXED_TEAM.name} (${FIXED_TEAM.stateId})`);

    return {
      success: true,
      teamId: FIXED_TEAM.teamId,
      deviceId: FIXED_DEVICE.deviceId,
      userIds,
      users: FIXED_USERS,
      supervisorPins: FIXED_SUPERVISOR_PINS
    };

  } catch (error) {
    console.error('❌ Failed to seed fixed users:', error);
    logger.error('Fixed user seeding failed', { error });
    throw error;
  }
}

async function clearFixedUsers() {
  try {
    console.log('🧹 Clearing fixed test data...');

    // Delete in proper order to respect foreign key constraints
    await db.delete(sessions).where(eq(sessions.deviceId, FIXED_DEVICE.deviceId));
    await db.delete(userPins).where(eq(userPins.userId, `team-member-${FIXED_TEAM.teamId}`));
    await db.delete(userPins).where(eq(userPins.userId, `supervisor-${FIXED_TEAM.teamId}`));
    await db.delete(userPins).where(eq(userPins.userId, `admin-${FIXED_TEAM.teamId}`));

    await db.delete(users).where(eq(users.id, `team-member-${FIXED_TEAM.teamId}`));
    await db.delete(users).where(eq(users.id, `supervisor-${FIXED_TEAM.teamId}`));
    await db.delete(users).where(eq(users.id, `admin-${FIXED_TEAM.teamId}`));

    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, FIXED_TEAM.teamId));
    await db.delete(devices).where(eq(devices.id, FIXED_DEVICE.deviceId));
    await db.delete(teams).where(eq(teams.id, FIXED_TEAM.teamId));

    console.log('✅ Fixed test data cleared successfully!');
  } catch (error) {
    console.error('❌ Failed to clear fixed test data:', error);
    logger.error('Fixed user cleanup failed', { error });
    throw error;
  }
}

// Export functions for use in test setup
export { seedFixedUsers, clearFixedUsers };

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedFixedUsers()
        .then(() => {
          console.log('\n🎉 Fixed user seeding completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Fixed user seeding failed:', error);
          process.exit(1);
        });
      break;

    case 'clear':
      clearFixedUsers()
        .then(() => {
          console.log('\n🧹 Fixed user cleanup completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Fixed user cleanup failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage:');
      console.log('  tsx scripts/seed-fixed-users.ts seed   - Seed fixed test users');
      console.log('  tsx scripts/seed-fixed-users.ts clear  - Clear fixed test users');
      process.exit(1);
  }
}