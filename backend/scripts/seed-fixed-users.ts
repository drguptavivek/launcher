#!/usr/bin/env tsx

/**
 * Fixed User Seed Script
 *
 * Creates deterministic test users with known credentials
 * This ensures tests can rely on consistent user data
 */

import { db } from '../src/lib/db';
import { teams, devices, users, userPins, supervisorPins, sessions, organizations, projects, projectAssignments, projectTeamAssignments, webAdminUsers, userRoleAssignments, roles, permissionCache } from '../src/lib/db/schema';
import { verifyPassword, hashPassword } from '../src/lib/crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/lib/logger';
import { eq, and, inArray } from 'drizzle-orm';

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
  },
  FIELD_SUPERVISOR_QA: {
    userCode: 'test010',
    pin: 'FieldQa987!',
    displayName: 'QA Field Supervisor',
    role: 'FIELD_SUPERVISOR' as const
  },
  SYSTEM_ADMIN_QA: {
    userCode: 'test011',
    pin: 'SysQa987!',
    displayName: 'QA System Admin',
    role: 'SYSTEM_ADMIN' as const
  },

  // Additional TEAM_MEMBER users
  TEAM_MEMBER_2: {
    userCode: 'test012',
    pin: 'Team2Pass123!',
    displayName: 'Test Team Member 2',
    role: 'TEAM_MEMBER' as const
  },
  TEAM_MEMBER_3: {
    userCode: 'test013',
    pin: 'Team3Pass123!',
    displayName: 'Test Team Member 3',
    role: 'TEAM_MEMBER' as const
  },
  TEAM_MEMBER_4: {
    userCode: 'test014',
    pin: 'Team4Pass123!',
    displayName: 'Test Team Member 4',
    role: 'TEAM_MEMBER' as const
  },

  // Additional FIELD_SUPERVISOR users
  FIELD_SUPERVISOR_2: {
    userCode: 'test015',
    pin: 'FieldSup215!',
    displayName: 'Test Field Supervisor 2',
    role: 'FIELD_SUPERVISOR' as const
  },
  FIELD_SUPERVISOR_3: {
    userCode: 'test016',
    pin: 'FieldSup316!',
    displayName: 'Test Field Supervisor 3',
    role: 'FIELD_SUPERVISOR' as const
  },

  // Additional REGIONAL_MANAGER users
  REGIONAL_MANAGER_2: {
    userCode: 'test017',
    pin: 'RegMgr217!',
    displayName: 'Test Regional Manager 2',
    role: 'REGIONAL_MANAGER' as const
  },
  REGIONAL_MANAGER_3: {
    userCode: 'test018',
    pin: 'RegMgr318!',
    displayName: 'Test Regional Manager 3',
    role: 'REGIONAL_MANAGER' as const
  },

  // Additional SUPPORT_AGENT users
  SUPPORT_AGENT_2: {
    userCode: 'test019',
    pin: 'Support219!',
    displayName: 'Test Support Agent 2',
    role: 'SUPPORT_AGENT' as const
  },
  SUPPORT_AGENT_3: {
    userCode: 'test020',
    pin: 'Support320!',
    displayName: 'Test Support Agent 3',
    role: 'SUPPORT_AGENT' as const
  },

  // Additional DEVICE_MANAGER users
  DEVICE_MANAGER_2: {
    userCode: 'test021',
    pin: 'DevMgr221!',
    displayName: 'Test Device Manager 2',
    role: 'DEVICE_MANAGER' as const
  },
  DEVICE_MANAGER_3: {
    userCode: 'test022',
    pin: 'DevMgr322!',
    displayName: 'Test Device Manager 3',
    role: 'DEVICE_MANAGER' as const
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

export const FIXED_TEAMS = {
  AIIMS_DELHI: {
    teamId: '550e8400-e29b-41d4-a716-446655440002',
    name: 'AIIMS Delhi Survey Team',
    stateId: 'DL07',
    timezone: 'Asia/Kolkata',
    organizationId: '550e8400-e29b-41d4-a716-446655440100' // AIIMS_INDIA
  },
  MUMBAI_FIELD: {
    teamId: '708c44b7-334c-48ff-afcc-e87d312f28a1',
    name: 'Mumbai Field Operations Team',
    stateId: 'MH01',
    timezone: 'Asia/Kolkata',
    organizationId: '550e8400-e29b-41d4-a716-446655440100' // AIIMS_INDIA
  }
} as const;

// Helper to get team by ID for backward compatibility
export const FIXED_TEAM = FIXED_TEAMS.AIIMS_DELHI;

// Team assignment mapping for users
export const USER_TEAM_ASSIGNMENTS = {
  // AIIMS Delhi Team - Primary research team
  TEAM_MEMBER: FIXED_TEAMS.AIIMS_DELHI.teamId,
  TEAM_MEMBER_2: FIXED_TEAMS.AIIMS_DELHI.teamId,
  TEAM_MEMBER_3: FIXED_TEAMS.AIIMS_DELHI.teamId,
  FIELD_SUPERVISOR: FIXED_TEAMS.AIIMS_DELHI.teamId,
  FIELD_SUPERVISOR_QA: FIXED_TEAMS.AIIMS_DELHI.teamId,
  REGIONAL_MANAGER: FIXED_TEAMS.AIIMS_DELHI.teamId,
  SYSTEM_ADMIN: FIXED_TEAMS.AIIMS_DELHI.teamId,
  SYSTEM_ADMIN_QA: FIXED_TEAMS.AIIMS_DELHI.teamId,
  AUDITOR: FIXED_TEAMS.AIIMS_DELHI.teamId,
  POLICY_ADMIN: FIXED_TEAMS.AIIMS_DELHI.teamId,

  // Mumbai Field Team - Operations focused
  TEAM_MEMBER_4: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  FIELD_SUPERVISOR_2: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  FIELD_SUPERVISOR_3: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  SUPPORT_AGENT: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  SUPPORT_AGENT_2: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  SUPPORT_AGENT_3: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  DEVICE_MANAGER: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  DEVICE_MANAGER_2: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  DEVICE_MANAGER_3: FIXED_TEAMS.MUMBAI_FIELD.teamId,

  // Regional and National roles - can be assigned to either team
  REGIONAL_MANAGER_2: FIXED_TEAMS.AIIMS_DELHI.teamId,
  REGIONAL_MANAGER_3: FIXED_TEAMS.MUMBAI_FIELD.teamId,
  NATIONAL_SUPPORT_ADMIN: FIXED_TEAMS.AIIMS_DELHI.teamId
} as const;

export const FIXED_PROJECTS = {
  NATIONAL_HEALTH_SURVEY: {
    projectId: '550e8400-e29b-41d4-a716-446655440200',
    title: 'National Health Survey 2025',
    abbreviation: 'NHS-2025',
    geographicScope: 'NATIONAL',
    organizationId: '550e8400-e29b-41d4-a716-446655440101', // NATIONAL_HEALTH_MISSION
    regionId: undefined as string | undefined
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

    // Step 2: Create test teams with organization reference
    console.log('Creating teams...');
    for (const [teamKey, teamConfig] of Object.entries(FIXED_TEAMS)) {
      console.log(`  Creating team: ${teamConfig.name}`);
      await db.insert(teams).values({
        id: teamConfig.teamId,
        name: teamConfig.name,
        stateId: teamConfig.stateId,
        timezone: teamConfig.timezone,
        organizationId: teamConfig.organizationId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: teams.id,
        set: {
          name: teamConfig.name,
          stateId: teamConfig.stateId,
          timezone: teamConfig.timezone,
          organizationId: teamConfig.organizationId,
          isActive: true,
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
    NATIONAL_SUPPORT_ADMIN: '550e8400-e29b-41d4-a716-446655440011',
    FIELD_SUPERVISOR_QA: '550e8400-e29b-41d4-a716-446655440012',
    SYSTEM_ADMIN_QA: '550e8400-e29b-41d4-a716-446655440013',
      // Additional TEAM_MEMBER users
      TEAM_MEMBER_2: '550e8400-e29b-41d4-a716-446655440014',
      TEAM_MEMBER_3: '550e8400-e29b-41d4-a716-446655440015',
      TEAM_MEMBER_4: '550e8400-e29b-41d4-a716-446655440016',
      // Additional FIELD_SUPERVISOR users
      FIELD_SUPERVISOR_2: '550e8400-e29b-41d4-a716-446655440017',
      FIELD_SUPERVISOR_3: '550e8400-e29b-41d4-a716-446655440018',
      // Additional REGIONAL_MANAGER users
      REGIONAL_MANAGER_2: '550e8400-e29b-41d4-a716-446655440019',
      REGIONAL_MANAGER_3: '550e8400-e29b-41d4-a716-446655440020',
      // Additional SUPPORT_AGENT users
      SUPPORT_AGENT_2: '550e8400-e29b-41d4-a716-446655440021',
      SUPPORT_AGENT_3: '550e8400-e29b-41d4-a716-446655440022',
      // Additional DEVICE_MANAGER users
      DEVICE_MANAGER_2: '550e8400-e29b-41d4-a716-446655440023',
      DEVICE_MANAGER_3: '550e8400-e29b-41d4-a716-446655440024'
  };

    for (const [userType, userConfig] of Object.entries(FIXED_USERS)) {
      console.log(`Creating ${userType.toLowerCase()} user: ${userConfig.userCode}`);

      const userId = userIds[userType];
      const teamId = USER_TEAM_ASSIGNMENTS[userType as keyof typeof USER_TEAM_ASSIGNMENTS] || FIXED_TEAMS.AIIMS_DELHI.teamId;

      // Insert user with organization and team reference
      await db.insert(users).values({
        id: userId,
        teamId: teamId,
        code: userConfig.userCode,
        displayName: userConfig.displayName,
        role: userConfig.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          teamId: teamId,
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

    console.log('Assigning RBAC roles to users...');
    const desiredRoles = Array.from(new Set(Object.values(FIXED_USERS).map((user) => user.role)));
    const existingRoles = await db.select({ id: roles.id, name: roles.name }).from(roles).where(inArray(roles.name, desiredRoles));
    const roleMap = new Map(existingRoles.map((role) => [role.name, role.id]));

    for (const [userType, userConfig] of Object.entries(FIXED_USERS)) {
      const userId = userIds[userType];
      const roleId = roleMap.get(userConfig.role);

      if (!roleId) {
        console.warn(`  ⚠️  Role ${userConfig.role} not found in roles table. Skipping assignment for ${userConfig.userCode}.`);
        continue;
      }

      const existingAssignment = await db.select({ id: userRoleAssignments.id, isActive: userRoleAssignments.isActive })
        .from(userRoleAssignments)
        .where(and(eq(userRoleAssignments.userId, userId), eq(userRoleAssignments.roleId, roleId)))
        .limit(1);

      if (existingAssignment.length > 0) {
        if (!existingAssignment[0].isActive) {
          await db.update(userRoleAssignments)
            .set({ isActive: true, grantedAt: new Date(), context: { seeded: true } })
            .where(eq(userRoleAssignments.id, existingAssignment[0].id));
        }
        continue;
      }

      const userTeamId = USER_TEAM_ASSIGNMENTS[userType as keyof typeof USER_TEAM_ASSIGNMENTS] || FIXED_TEAMS.AIIMS_DELHI.teamId;
      const userOrgId = Object.values(FIXED_TEAMS).find(team => team.teamId === userTeamId)?.organizationId || FIXED_TEAMS.AIIMS_DELHI.organizationId;

      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId,
        organizationId: userOrgId,
        teamId: userTeamId,
        grantedBy: userIds.SYSTEM_ADMIN,
        grantedAt: new Date(),
        isActive: true,
        context: { seeded: true }
      });
    }

    // Create fixed supervisor PINs for both teams
    console.log('Creating supervisor PINs...');
    const supervisorPinIds = [
      '550e8400-e29b-41d4-a716-446655440006', // AIIMS Delhi PIN 1
      '550e8400-e29b-41d4-a716-446655440007', // AIIMS Delhi PIN 2
      '550e8400-e29b-41d4-a716-446655440008', // AIIMS Delhi PIN 3
      '550e8400-e29b-41d4-a716-446655440025', // Mumbai PIN 1
      '550e8400-e29b-41d4-a716-446655440026', // Mumbai PIN 2
      '550e8400-e29b-41d4-a716-446655440027'  // Mumbai PIN 3
    ];

    // Create PINs for AIIMS Delhi team
    const aiimsPins = [
      { ...FIXED_SUPERVISOR_PINS.FIELD_SUPERVISOR_PIN, teamId: FIXED_TEAMS.AIIMS_DELHI.teamId, suffix: 'AIIMS' },
      { ...FIXED_SUPERVISOR_PINS.REGIONAL_MANAGER_PIN, teamId: FIXED_TEAMS.AIIMS_DELHI.teamId, suffix: 'AIIMS' },
      { ...FIXED_SUPERVISOR_PINS.SYSTEM_ADMIN_PIN, teamId: FIXED_TEAMS.AIIMS_DELHI.teamId, suffix: 'AIIMS' }
    ];

    // Create PINs for Mumbai team
    const mumbaiPins = [
      { ...FIXED_SUPERVISOR_PINS.FIELD_SUPERVISOR_PIN, teamId: FIXED_TEAMS.MUMBAI_FIELD.teamId, suffix: 'Mumbai' },
      { ...FIXED_SUPERVISOR_PINS.REGIONAL_MANAGER_PIN, teamId: FIXED_TEAMS.MUMBAI_FIELD.teamId, suffix: 'Mumbai' },
      { ...FIXED_SUPERVISOR_PINS.SYSTEM_ADMIN_PIN, teamId: FIXED_TEAMS.MUMBAI_FIELD.teamId, suffix: 'Mumbai' }
    ];

    const allPins = [...aiimsPins, ...mumbaiPins];

    for (let i = 0; i < allPins.length; i++) {
      const pinConfig = allPins[i];
      const supervisorPinId = supervisorPinIds[i];

      const pinHash = await hashPassword(pinConfig.pin);
      await db.insert(supervisorPins).values({
        id: supervisorPinId,
        teamId: pinConfig.teamId,
        name: `${pinConfig.name} (${pinConfig.suffix})`,
        pinHash: pinHash.hash,
        salt: pinHash.salt,
        isActive: true,
        rotatedAt: new Date()
      }).onConflictDoUpdate({
        target: supervisorPins.id,
        set: {
          name: `${pinConfig.name} (${pinConfig.suffix})`,
          pinHash: pinHash.hash,
          salt: pinHash.salt,
          isActive: true,
          rotatedAt: new Date()
        }
      });
    }

    // Step 3: Create projects (after users exist to satisfy created_by FK)
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
        createdBy: userIds.SYSTEM_ADMIN,
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

    // Step 4: Create project assignments
    console.log('Creating project assignments...');

    // Assign all users to National Health Survey
    for (const [userType, userConfig] of Object.entries(FIXED_USERS)) {
      const userId = userIds[userType];
      const existingAssignment = await db.select({ id: projectAssignments.id }).from(projectAssignments)
        .where(and(eq(projectAssignments.projectId, FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId), eq(projectAssignments.userId, userId)))
        .limit(1);

      if (existingAssignment.length > 0) {
        await db.update(projectAssignments)
          .set({
            isActive: true,
            assignedBy: userIds.SYSTEM_ADMIN,
            assignedAt: new Date()
          })
          .where(eq(projectAssignments.id, existingAssignment[0].id));
      } else {
        await db.insert(projectAssignments).values({
          projectId: FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId,
          userId,
          assignedBy: userIds.SYSTEM_ADMIN,
          assignedAt: new Date(),
          isActive: true
        });
      }
    }

    // Assign AIIMS Delhi team to Regional Diabetes Study
    const existingTeamAssignment = await db.select({ id: projectTeamAssignments.id }).from(projectTeamAssignments)
      .where(and(eq(projectTeamAssignments.projectId, FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId), eq(projectTeamAssignments.teamId, FIXED_TEAM.teamId)))
      .limit(1);

    if (existingTeamAssignment.length > 0) {
      await db.update(projectTeamAssignments)
        .set({
          isActive: true,
          assignedBy: userIds.SYSTEM_ADMIN,
          assignedAt: new Date()
        })
        .where(eq(projectTeamAssignments.id, existingTeamAssignment[0].id));
    } else {
      await db.insert(projectTeamAssignments).values({
        projectId: FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId,
        teamId: FIXED_TEAM.teamId,
        assignedBy: userIds.SYSTEM_ADMIN,
        assignedAt: new Date(),
        isActive: true
      });
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

    console.log('\n👥 Teams:');
    console.log(`  ${FIXED_TEAMS.AIIMS_DELHI.teamId} - ${FIXED_TEAMS.AIIMS_DELHI.name} (${FIXED_TEAMS.AIIMS_DELHI.stateId})`);
    console.log(`  ${FIXED_TEAMS.MUMBAI_FIELD.teamId} - ${FIXED_TEAMS.MUMBAI_FIELD.name} (${FIXED_TEAMS.MUMBAI_FIELD.stateId})`);

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

    // Delete permission cache first
    await db.delete(permissionCache);
    console.log('  ✓ Cleared permission cache');

    // Delete in proper order to respect foreign key constraints
    // Start with most dependent entities
    await db.delete(sessions).where(eq(sessions.deviceId, FIXED_DEVICE.deviceId));

    // Delete project assignments first
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId));
    await db.delete(projectTeamAssignments).where(eq(projectTeamAssignments.projectId, FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId));

    // Delete projects before users (projects.created_by references SYSTEM_ADMIN)
    await db.delete(projects).where(eq(projects.id, FIXED_PROJECTS.NATIONAL_HEALTH_SURVEY.projectId));
    await db.delete(projects).where(eq(projects.id, FIXED_PROJECTS.REGIONAL_DIABETES_STUDY.projectId));

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
      '550e8400-e29b-41d4-a716-446655440011',  // NATIONAL_SUPPORT_ADMIN
      '550e8400-e29b-41d4-a716-446655440012',  // FIELD_SUPERVISOR_QA
      '550e8400-e29b-41d4-a716-446655440013',  // SYSTEM_ADMIN_QA
      // Additional TEAM_MEMBER users
      '550e8400-e29b-41d4-a716-446655440014',  // TEAM_MEMBER_2
      '550e8400-e29b-41d4-a716-446655440015',  // TEAM_MEMBER_3
      '550e8400-e29b-41d4-a716-446655440016',  // TEAM_MEMBER_4
      // Additional FIELD_SUPERVISOR users
      '550e8400-e29b-41d4-a716-446655440017',  // FIELD_SUPERVISOR_2
      '550e8400-e29b-41d4-a716-446655440018',  // FIELD_SUPERVISOR_3
      // Additional REGIONAL_MANAGER users
      '550e8400-e29b-41d4-a716-446655440019',  // REGIONAL_MANAGER_2
      '550e8400-e29b-41d4-a716-446655440020',  // REGIONAL_MANAGER_3
      // Additional SUPPORT_AGENT users
      '550e8400-e29b-41d4-a716-446655440021',  // SUPPORT_AGENT_2
      '550e8400-e29b-41d4-a716-446655440022',  // SUPPORT_AGENT_3
      // Additional DEVICE_MANAGER users
      '550e8400-e29b-41d4-a716-446655440023',  // DEVICE_MANAGER_2
      '550e8400-e29b-41d4-a716-446655440024'   // DEVICE_MANAGER_3
    ];

    await db.delete(userRoleAssignments).where(inArray(userRoleAssignments.userId, userIds));
    await db.delete(userRoleAssignments).where(inArray(userRoleAssignments.grantedBy, userIds));

    for (const userId of userIds) {
      await db.delete(userPins).where(eq(userPins.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }

    // Delete supervisor PINs
    await db.delete(supervisorPins).where(eq(supervisorPins.teamId, FIXED_TEAM.teamId));

    // Delete devices
    await db.delete(devices).where(eq(devices.id, FIXED_DEVICE.deviceId));

    // Delete teams
    await db.delete(teams).where(eq(teams.id, FIXED_TEAMS.AIIMS_DELHI.teamId));
    await db.delete(teams).where(eq(teams.id, FIXED_TEAMS.MUMBAI_FIELD.teamId));

    // Clear web admin users
    await db.delete(webAdminUsers);
    console.log('  ✓ Cleared web admin users');

    // Clear organizations
    await db.delete(organizations);
    console.log('  ✓ Cleared organizations');

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
      console.log('  tsx scripts/seed-fixed-users.ts clear  - Clear fixed test users and organizations');
  }
}
