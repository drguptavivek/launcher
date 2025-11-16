#!/usr/bin/env tsx

/**
 * Fixed User Seed Script
 *
 * Creates deterministic test users with known credentials
 * This ensures tests can rely on consistent user data
 */

import { db } from '../src/lib/db';
import { teams, devices, users, userPins, supervisorPins, sessions, organizations, projects, projectAssignments, projectTeamAssignments, webAdminUsers } from '../src/lib/db/schema';
import { verifyPassword, hashPassword } from '../src/lib/crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/lib/logger';
import { eq } from 'drizzle-orm';

// Fixed test credentials - these should be used in all tests
// Updated for new 9-role RBAC system with deterministic passwords from database-seeding.md
export const FIXED_USERS = {
  // Field Operations Roles
  TEAM_MEMBER: {
    userCode: 'test001',
    pin: 'TestPass123!',
    displayName: 'Test Team Member',
    role: 'TEAM_MEMBER' as const
  },
  FIELD_SUPERVISOR: {
    userCode: 'test002',
    pin: 'FieldSup123!',
    displayName: 'Test Field Supervisor',
    role: 'FIELD_SUPERVISOR' as const
  },
  REGIONAL_MANAGER: {
    userCode: 'test003',
    pin: 'RegMgr123!',
    displayName: 'Test Regional Manager',
    role: 'REGIONAL_MANAGER' as const
  },

  // Technical Operations Roles
  SYSTEM_ADMIN: {
    userCode: 'test004',
    pin: 'SysAdmin123!',
    displayName: 'Test System Admin',
    role: 'SYSTEM_ADMIN' as const
  },
  SUPPORT_AGENT: {
    userCode: 'test005',
    pin: 'Support123!',
    displayName: 'Test Support Agent',
    role: 'SUPPORT_AGENT' as const
  },
  AUDITOR: {
    userCode: 'test006',
    pin: 'Auditor123!',
    displayName: 'Test Auditor',
    role: 'AUDITOR' as const
  },

  // Specialized Roles
  DEVICE_MANAGER: {
    userCode: 'test007',
    pin: 'DevMgr123!',
    displayName: 'Test Device Manager',
    role: 'DEVICE_MANAGER' as const
  },
  POLICY_ADMIN: {
    userCode: 'test008',
    pin: 'PolicyAdmin123!',
    displayName: 'Test Policy Admin',
    role: 'POLICY_ADMIN' as const
  },
  NATIONAL_SUPPORT_ADMIN: {
    userCode: 'test009',
    pin: 'NatSupport123!',
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

export const FIXED_WEB_ADMIN = {
  email: 'admin@surveylauncher.test',
  password: 'AdminPass123!',
  firstName: 'System',
  lastName: 'Administrator',
  role: 'SYSTEM_ADMIN' as const
} as const;

export const FIXED_DEVICE = {
  deviceId: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Test Device 001'
} as const;

export const FIXED_ORGANIZATIONS = {
  AIIMS_INDIA: {
    organizationId: '550e8400-e29b-41d4-a716-446655440100',
    name: 'AIIMS India',
    displayName: 'All India Institute of Medical Sciences',
    code: 'AIIMS-INDIA',
    isActive: true,
    isDefault: true
  },
  NATIONAL_HEALTH_MISSION: {
    organizationId: '550e8400-e29b-41d4-a716-446655440101',
    name: 'National Health Mission',
    displayName: 'National Health Mission - Ministry of Health',
    code: 'NHM-INDIA',
    isActive: true,
    isDefault: false
  },
  STATE_HEALTH_AUTHORITY: {
    organizationId: '550e8400-e29b-41d4-a716-446655440102',
    name: 'State Health Authority',
    displayName: 'Delhi State Health Authority',
    code: 'DSHA-DL',
    isActive: true,
    isDefault: false
  }
} as const;

export const FIXED_TEAM = {
  teamId: '550e8400-e29b-41d4-a716-446655440002',
  name: 'AIIMS Delhi Survey Team',
  stateId: 'DL07',
  timezone: 'Asia/Kolkata',
  organizationId: '550e8400-e29b-41d4-a716-446655440100' // AIIMS_INDIA
} as const;

export const FIXED_PROJECTS = {
  NATIONAL_HEALTH_SURVEY: {
    projectId: '550e8400-e29b-41d4-a716-446655440200',
    title: 'National Health Survey 2025',
    abbreviation: 'NHS-2025',
    geographicScope: 'NATIONAL',
    organizationId: '550e8400-e29b-41d4-a716-446655440101' // NATIONAL_HEALTH_MISSION
  },
  REGIONAL_DIABETES_STUDY: {
    projectId: '550e8400-e29b-41d4-a716-446655440201',
    title: 'Delhi Diabetes Prevalence Study',
    abbreviation: 'DDPS-2025',
    geographicScope: 'REGIONAL',
    organizationId: '550e8400-e29b-41d4-a716-446655440102', // STATE_HEALTH_AUTHORITY
    regionId: '550e8400-e29b-41d4-a716-446655440002' // AIIMS Delhi Team
  }
} as const;

async function seedFixedUsers() {
  try {
    console.log('🌱 Starting fixed user seeding...');

    // Step 1: Create master organizations first
    console.log('Creating organizations...');
    for (const [orgKey, orgConfig] of Object.entries(FIXED_ORGANIZATIONS)) {
      console.log(`  Creating organization: ${orgConfig.name}`);
      await db.insert(organizations).values({
        id: orgConfig.organizationId,
        name: orgConfig.name,
        displayName: orgConfig.displayName,
        code: orgConfig.code,
        isActive: orgConfig.isActive,
        isDefault: orgConfig.isDefault,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: organizations.id,
        set: {
          name: orgConfig.name,
          displayName: orgConfig.displayName,
          code: orgConfig.code,
          isActive: orgConfig.isActive,
          isDefault: orgConfig.isDefault,
          updatedAt: new Date()
        }
      });
    }

    // Step 2: Create test team with organization reference
    console.log('Creating test team...');
    await db.insert(teams).values({
      id: FIXED_TEAM.teamId,
      name: FIXED_TEAM.name,
      stateId: FIXED_TEAM.stateId,
      timezone: FIXED_TEAM.timezone,
      organizationId: FIXED_TEAM.organizationId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: teams.id,
      set: {
        name: FIXED_TEAM.name,
        stateId: FIXED_TEAM.stateId,
        timezone: FIXED_TEAM.timezone,
        organizationId: FIXED_TEAM.organizationId,
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Step 3: Create projects
    console.log('Creating projects...');
    for (const [projectKey, projectConfig] of Object.entries(FIXED_PROJECTS)) {
      console.log(`  Creating project: ${projectConfig.title}`);
      await db.insert(projects).values({
        id: projectConfig.projectId,
        title: projectConfig.title,
        abbreviation: projectConfig.abbreviation,
        status: 'ACTIVE',
        geographicScope: projectConfig.geographicScope,
        organizationId: projectConfig.organizationId,
        regionId: projectConfig.regionId || null,
        createdBy: '550e8400-e29b-41d4-a716-446655440006', // SYSTEM_ADMIN user ID
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: projects.id,
        set: {
          title: projectConfig.title,
          abbreviation: projectConfig.abbreviation,
          status: 'ACTIVE',
          geographicScope: projectConfig.geographicScope,
          regionId: projectConfig.regionId || null,
          updatedAt: new Date()
        }
      });
    }

    // Create deterministic web admin user
    console.log('Creating web admin user...');
    const adminPasswordHash = await hashPassword(FIXED_WEB_ADMIN.password);
    await db.insert(webAdminUsers).values({
      id: '550e8400-e29b-41d4-a716-446655440999', // Fixed admin ID
      email: FIXED_WEB_ADMIN.email,
      password: `${adminPasswordHash.hash}:${adminPasswordHash.salt}`, // Store as hash:salt combined format
      firstName: FIXED_WEB_ADMIN.firstName,
      lastName: FIXED_WEB_ADMIN.lastName,
      role: FIXED_WEB_ADMIN.role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: webAdminUsers.email,
      set: {
        password: `${adminPasswordHash.hash}:${adminPasswordHash.salt}`, // Store as hash:salt combined format
        firstName: FIXED_WEB_ADMIN.firstName,
        lastName: FIXED_WEB_ADMIN.lastName,
        role: FIXED_WEB_ADMIN.role,
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

      // Insert user with organization reference
      await db.insert(users).values({
        id: userId,
        teamId: FIXED_TEAM.teamId,
        code: userConfig.userCode,
        displayName: userConfig.displayName,
        role: userConfig.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
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

    // Step 4: Create project assignments
    console.log('Creating project assignments...');

    // Assign all users to National Health Survey
    for (const [userType, userConfig] of Object.entries(FIXED_USERS)) {
      const userId = userIds[userType];
      try {
        await db.insert(projectAssignments).values({
          projectId: FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId,
          userId: userId,
          assignedBy: '550e8400-e29b-41d4-a716-446655440006', // SYSTEM_ADMIN
          roleInProject: userConfig.role,
          assignedAt: new Date(),
          isActive: true
        });
      } catch (error: any) {
        // Handle duplicate key errors gracefully
        if (error.code === '23505') {
          console.log(`  Project assignment already exists for user ${userConfig.userCode}, skipping...`);
        } else {
          throw error;
        }
      }
    }

    // Assign AIIMS Delhi team to Regional Diabetes Study
    try {
      await db.insert(projectTeamAssignments).values({
        projectId: FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId,
        teamId: FIXED_TEAM.teamId,
        assignedBy: '550e8400-e29b-41d4-a716-446655440006', // SYSTEM_ADMIN
        assignedRole: 'DATA_COLLECTION_TEAM',
        assignedAt: new Date(),
        isActive: true
      });
    } catch (error: any) {
      // Handle duplicate key errors gracefully
      if (error.code === '23505') {
        console.log('  Project team assignment already exists, skipping...');
      } else {
        throw error;
      }
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

    console.log('\n🏢 Organizations:');
    for (const [orgKey, orgConfig] of Object.entries(FIXED_ORGANIZATIONS)) {
      console.log(`  ${orgConfig.organizationId} - ${orgConfig.displayName} (${orgConfig.code})`);
    }

    console.log('\n👥 Team:');
    console.log(`  ${FIXED_TEAM.teamId} - ${FIXED_TEAM.name} (${FIXED_TEAM.stateId})`);

    console.log('\n📋 Projects:');
    for (const [projectKey, projectConfig] of Object.entries(FIXED_PROJECTS)) {
      console.log(`  ${projectConfig.projectId} - ${projectConfig.title} (${projectConfig.abbreviation})`);
    }

    return {
      success: true,
      organizationIds: {
        AIIMS_INDIA: FIXED_ORGANIZATIONS.AIIMS_INDIA.organizationId,
        NATIONAL_HEALTH_MISSION: FIXED_ORGANIZATIONS.NATIONAL_HEALTH_MISSION.organizationId,
        STATE_HEALTH_AUTHORITY: FIXED_ORGANIZATIONS.STATE_HEALTH_AUTHORITY.organizationId
      },
      teamId: FIXED_TEAM.teamId,
      deviceId: FIXED_DEVICE.deviceId,
      projectIds: {
        NATIONAL_HEALTH_SURVEY: FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId,
        REGIONAL_DIABETES_STUDY: FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId
      },
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
    // Start with most dependent entities
    await db.delete(sessions).where(eq(sessions.deviceId, FIXED_DEVICE.deviceId));

    // Delete project assignments first
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId));
    await db.delete(projectTeamAssignments).where(eq(projectTeamAssignments.projectId, FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId));

    // Delete user PINs and users
    const userIds = [
      '550e8400-e29b-41d4-a716-446655440003', // TEAM_MEMBER
      '550e8400-e29b-41d4-a716-446655440004', // FIELD_SUPERVISOR
      '550e8400-e29b-41d4-a716-446655440005', // REGIONAL_MANAGER
      '550e8400-e29b-41d4-a716-446655440006', // SYSTEM_ADMIN
      '550e8400-e29b-41d4-a716-446655440007', // SUPPORT_AGENT
      '550e8400-e29b-41d4-a716-446655440008', // AUDITOR
      '550e8400-e29b-41d4-a716-446655440009', // DEVICE_MANAGER
      '550e8400-e29b-41d4-a716-446655440010', // POLICY_ADMIN
      '550e8400-e29b-41d4-a716-446655440011'  // NATIONAL_SUPPORT_ADMIN
    ];

    for (const userId of userIds) {
      await db.delete(userPins).where(eq(userPins.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }

    // Delete supervisor PINs
    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, FIXED_TEAM.teamId));

    // Delete projects
    await db.delete(projects).where(eq(projects.id, FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId));
    await db.delete(projects).where(eq(projects.id, FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId));

    // Delete devices
    await db.delete(devices).where(eq(devices.id, FIXED_DEVICE.deviceId));

    // Delete teams
    await db.delete(teams).where(eq(teams.id, FIXED_TEAM.teamId));

    // Finally delete organizations (they should be last as they're master entities)
    // Note: Don't delete organizations by default as they might be shared, but include if needed
    console.log('ℹ️  Organizations preserved for potential reuse. Delete manually if needed.');

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