#!/usr/bin/env tsx

/**
 * Simple RBAC Seeding Script for Phase 4.1
 *
 * This script creates the essential roles and permissions needed for
 * route protection tests to pass. It's designed to be simple and reliable.
 */

import { db } from '../src/lib/db';
import { roles, permissions, rolePermissions } from '../src/lib/db/schema';
import { logger } from '../src/lib/logger';
import { v4 as uuidv4 } from 'uuid';

async function seedBasicRBAC() {
  try {
    console.log('🌱 Starting basic RBAC seeding for Phase 4.1...');

    // Step 1: Create essential permissions first
    console.log('Creating essential permissions...');

    const essentialPermissions = [
      // Users permissions
      { name: 'USERS_READ', resource: 'USERS', action: 'READ', description: 'Read user information' },
      { name: 'USERS_LIST', resource: 'USERS', action: 'LIST', description: 'List users' },
      { name: 'USERS_CREATE', resource: 'USERS', action: 'CREATE', description: 'Create users' },
      { name: 'USERS_UPDATE', resource: 'USERS', action: 'UPDATE', description: 'Update users' },
      { name: 'USERS_DELETE', resource: 'USERS', action: 'DELETE', description: 'Delete users' },

      // Teams permissions
      { name: 'TEAMS_READ', resource: 'TEAMS', action: 'READ', description: 'Read team information' },
      { name: 'TEAMS_LIST', resource: 'TEAMS', action: 'LIST', description: 'List teams' },
      { name: 'TEAMS_CREATE', resource: 'TEAMS', action: 'CREATE', description: 'Create teams' },
      { name: 'TEAMS_UPDATE', resource: 'TEAMS', action: 'UPDATE', description: 'Update teams' },
      { name: 'TEAMS_DELETE', resource: 'TEAMS', action: 'DELETE', description: 'Delete teams' },

      // Devices permissions
      { name: 'DEVICES_READ', resource: 'DEVICES', action: 'READ', description: 'Read device information' },
      { name: 'DEVICES_LIST', resource: 'DEVICES', action: 'LIST', description: 'List devices' },
      { name: 'DEVICES_CREATE', resource: 'DEVICES', action: 'CREATE', description: 'Create devices' },
      { name: 'DEVICES_UPDATE', resource: 'DEVICES', action: 'UPDATE', description: 'Update devices' },
      { name: 'DEVICES_DELETE', resource: 'DEVICES', action: 'DELETE', description: 'Delete devices' },

      // Organizations permissions (critical for route tests) - ORGANIZATION is the singular form
      { name: 'ORGANIZATIONS_READ', resource: 'ORGANIZATION', action: 'READ', description: 'Read organization information' },
      { name: 'ORGANIZATIONS_LIST', resource: 'ORGANIZATION', action: 'LIST', description: 'List organizations' },
      { name: 'ORGANIZATIONS_CREATE', resource: 'ORGANIZATION', action: 'CREATE', description: 'Create organizations' },
      { name: 'ORGANIZATIONS_UPDATE', resource: 'ORGANIZATION', action: 'UPDATE', description: 'Update organizations' },
      { name: 'ORGANIZATIONS_DELETE', resource: 'ORGANIZATION', action: 'DELETE', description: 'Delete organizations' },

      // Projects permissions - PROJECTS is singular to match enum
      { name: 'PROJECTS_READ', resource: 'PROJECTS', action: 'READ', description: 'Read project information' },
      { name: 'PROJECTS_LIST', resource: 'PROJECTS', action: 'LIST', description: 'List projects' },
      { name: 'PROJECTS_CREATE', resource: 'PROJECTS', action: 'CREATE', description: 'Create projects' },
      { name: 'PROJECTS_UPDATE', resource: 'PROJECTS', action: 'UPDATE', description: 'Update projects' },
      { name: 'PROJECTS_DELETE', resource: 'PROJECTS', action: 'DELETE', description: 'Delete projects' },

      // Telemetry permissions
      { name: 'TELEMETRY_READ', resource: 'TELEMETRY', action: 'READ', description: 'Read telemetry data' },
      { name: 'TELEMETRY_CREATE', resource: 'TELEMETRY', action: 'CREATE', description: 'Create telemetry events' },

      // Policy permissions
      { name: 'POLICY_READ', resource: 'POLICY', action: 'READ', description: 'Read policy information' },

      // System permissions (for SYSTEM_ADMIN)
      { name: 'SYSTEM_SETTINGS', resource: 'SYSTEM_SETTINGS', action: 'MANAGE', description: 'Manage system settings' },
      { name: 'AUDIT_LOGS', resource: 'AUDIT_LOGS', action: 'READ', description: 'Read audit logs' },
    ];

    const permissionMap = new Map<string, string>();

    for (const perm of essentialPermissions) {
      try {
        const result = await db.insert(permissions).values({
          id: uuidv4(),
          name: perm.name,
          resource: perm.resource as any,
          action: perm.action as any,
          scope: 'SYSTEM',
          description: perm.description,
          isActive: true,
          createdAt: new Date()
        }).onConflictDoUpdate({
          target: permissions.name,
          set: {
            description: perm.description,
            isActive: true,
            updatedAt: new Date()
          }
        }).returning({ id: permissions.id, name: permissions.name });

        if (result.length > 0) {
          permissionMap.set(perm.name, result[0].id);
        }
      } catch (error) {
        console.error(`❌ Failed to create permission ${perm.name}:`, error);
      }
    }

    console.log(`✅ Created ${permissionMap.size} permissions`);

    // Step 2: Create SYSTEM_ADMIN role with all permissions
    console.log('Creating SYSTEM_ADMIN role...');

    try {
      const systemAdminResult = await db.insert(roles).values({
        id: uuidv4(),
        name: 'SYSTEM_ADMIN',
        displayName: 'System Administrator',
        description: 'Full system access with all permissions',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 9,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: roles.name,
        set: {
          displayName: 'System Administrator',
          description: 'Full system access with all permissions',
          isActive: true,
          hierarchyLevel: 9,
          updatedAt: new Date()
        }
      }).returning({ id: roles.id });

      const systemAdminRoleId = systemAdminResult[0]?.id;

      if (systemAdminRoleId) {
        console.log('✅ Created SYSTEM_ADMIN role');

        // Step 3: Assign ALL permissions to SYSTEM_ADMIN
        console.log('Assigning all permissions to SYSTEM_ADMIN...');

        let assignmentsCount = 0;
        for (const [permissionName, permissionId] of permissionMap) {
          try {
            await db.insert(rolePermissions).values({
              id: uuidv4(),
              roleId: systemAdminRoleId,
              permissionId: permissionId,
              isActive: true,
              grantedAt: new Date()
            }).onConflictDoNothing();

            assignmentsCount++;
          } catch (error) {
            console.error(`❌ Failed to assign permission ${permissionName}:`, error);
          }
        }

        console.log(`✅ Assigned ${assignmentsCount} permissions to SYSTEM_ADMIN`);

      } else {
        throw new Error('Failed to create SYSTEM_ADMIN role');
      }

    } catch (error) {
      console.error('❌ Failed to create SYSTEM_ADMIN role:', error);
      throw error;
    }

    // Step 4: Create basic TEAM_MEMBER role for testing
    console.log('Creating TEAM_MEMBER role...');

    try {
      const teamMemberResult = await db.insert(roles).values({
        id: uuidv4(),
        name: 'TEAM_MEMBER',
        displayName: 'Team Member',
        description: 'Basic team access for testing',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: roles.name,
        set: {
          displayName: 'Team Member',
          description: 'Basic team access for testing',
          isActive: true,
          hierarchyLevel: 1,
          updatedAt: new Date()
        }
      }).returning({ id: roles.id });

      const teamMemberRoleId = teamMemberResult[0]?.id;

      if (teamMemberRoleId) {
        console.log('✅ Created TEAM_MEMBER role');

        // Assign basic permissions to TEAM_MEMBER
        const basicPermissions = ['USERS_READ', 'TEAMS_READ', 'DEVICES_READ', 'TELEMETRY_CREATE', 'POLICY_READ'];

        for (const permName of basicPermissions) {
          const permissionId = permissionMap.get(permName);
          if (permissionId) {
            try {
              await db.insert(rolePermissions).values({
                id: uuidv4(),
                roleId: teamMemberRoleId,
                permissionId: permissionId,
                isActive: true,
                grantedAt: new Date()
              }).onConflictDoNothing();
            } catch (error) {
              console.error(`❌ Failed to assign ${permName} to TEAM_MEMBER:`, error);
            }
          }
        }

        console.log(`✅ Assigned basic permissions to TEAM_MEMBER`);
      }

    } catch (error) {
      console.error('❌ Failed to create TEAM_MEMBER role:', error);
    }

    console.log('\n🎉 Basic RBAC seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  - Permissions created: ${permissionMap.size}`);
    console.log('  - Roles created: SYSTEM_ADMIN, TEAM_MEMBER');
    console.log('  - SYSTEM_ADMIN: Full system access');
    console.log('  - TEAM_MEMBER: Basic team access');
    console.log('\n✅ Phase 4.1 route protection tests should now pass!');

    return {
      success: true,
      permissionsCount: permissionMap.size,
      rolesCreated: ['SYSTEM_ADMIN', 'TEAM_MEMBER']
    };

  } catch (error: any) {
    console.error('❌ Basic RBAC seeding failed:', error);
    logger.error('Basic RBAC seeding failed', { error: error.message });
    throw error;
  }
}

async function clearBasicRBAC() {
  try {
    console.log('🧹 Clearing basic RBAC data...');

    // Delete in proper order to respect foreign key constraints
    await db.delete(rolePermissions);
    await db.delete(roles);
    await db.delete(permissions);

    console.log('✅ Basic RBAC data cleared successfully');
  } catch (error: any) {
    console.error('❌ Failed to clear basic RBAC data:', error);
    throw error;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedBasicRBAC()
        .then(() => {
          console.log('\n🎉 Basic RBAC seeding completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Basic RBAC seeding failed:', error);
          process.exit(1);
        });
      break;

    case 'clear':
      clearBasicRBAC()
        .then(() => {
          console.log('\n🧹 Basic RBAC cleanup completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Basic RBAC cleanup failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage:');
      console.log('  tsx scripts/seed-basic-rbac.ts seed   - Seed basic RBAC roles and permissions');
      console.log('  tsx scripts/seed-basic-rbac.ts clear  - Clear basic RBAC data');
      process.exit(1);
  }
}

// Export functions for use in other scripts
export { seedBasicRBAC, clearBasicRBAC };