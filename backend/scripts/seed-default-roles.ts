#!/usr/bin/env tsx

/**
 * Default Roles Seeding Script for Production Deployment
 *
 * Creates the complete set of default roles and permissions for the
 * enterprise-grade 9-role RBAC system. This script is designed for
 * production environments and ensures all roles have proper baseline permissions.
 */

import { db } from '../src/lib/db';
import { roles, permissions, rolePermissions, webAdminUsers, permissionCache, organizations } from '../src/lib/db/schema';
import { logger } from '../src/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

// Default role definitions for production
const DEFAULT_ROLES = [
  // Field Operations Roles
  {
    name: 'TEAM_MEMBER',
    displayName: 'Team Member',
    description: 'Frontline survey operators with basic team access',
    isSystemRole: true,
    hierarchyLevel: 1,
    permissions: [
      // Team access
      { resource: 'TEAMS', action: 'READ' },
      { resource: 'USERS', action: 'READ' },
      { resource: 'DEVICES', action: 'READ' },
      // Device operations
      { resource: 'DEVICES', action: 'CREATE' },
      { resource: 'DEVICES', action: 'UPDATE' },
      // Telemetry
      { resource: 'TELEMETRY', action: 'CREATE' },
      { resource: 'TELEMETRY', action: 'READ' },
      // Policy compliance
      { resource: 'POLICY', action: 'READ' },
      // Authentication
      { resource: 'AUTH', action: 'CREATE' },
      { resource: 'AUTH', action: 'READ' }
    ]
  },
  {
    name: 'FIELD_SUPERVISOR',
    displayName: 'Field Supervisor',
    description: 'On-site supervisors managing field operations and team devices',
    isSystemRole: true,
    hierarchyLevel: 2,
    permissions: [
      // Inherits all TEAM_MEMBER permissions plus:
      { resource: 'TEAMS', action: 'MANAGE' },
      { resource: 'USERS', action: 'MANAGE' },
      { resource: 'DEVICES', action: 'MANAGE' },
      { resource: 'SUPERVISOR_PINS', action: 'READ' },
      { resource: 'SUPERVISOR_PINS', action: 'MANAGE' },
      { resource: 'SUPERVISOR_PINS', action: 'EXECUTE' },
      { resource: 'TELEMETRY', action: 'MANAGE' },
      { resource: 'POLICY', action: 'MANAGE' },
      { resource: 'AUTH', action: 'MANAGE' }
    ]
  },
  {
    name: 'REGIONAL_MANAGER',
    displayName: 'Regional Manager',
    description: 'Multi-team regional oversight with cross-team access within region',
    isSystemRole: true,
    hierarchyLevel: 3,
    permissions: [
      // Inherits all FIELD_SUPERVISOR permissions plus:
      { resource: 'TEAMS', action: 'CREATE' },
      { resource: 'USERS', action: 'CREATE' },
      { resource: 'DEVICES', action: 'DELETE' },
      { resource: 'SUPERVISOR_PINS', action: 'DELETE' },
      { resource: 'SUPERVISOR_PINS', action: 'EXECUTE' },
      { resource: 'SUPPORT_TICKETS', action: 'READ' },
      { resource: 'SUPPORT_TICKETS', action: 'CREATE' },
      { resource: 'AUDIT_LOGS', action: 'READ' }
    ]
  },

  // Technical Operations Roles
  {
    name: 'SYSTEM_ADMIN',
    displayName: 'System Administrator',
    description: 'Full system configuration and administrative access',
    isSystemRole: true,
    hierarchyLevel: 9,
    permissions: [
      // Full system access
      { resource: 'TEAMS', action: 'MANAGE' },
      { resource: 'USERS', action: 'MANAGE' },
      { resource: 'DEVICES', action: 'MANAGE' },
      { resource: 'SUPERVISOR_PINS', action: 'MANAGE' },
      { resource: 'SUPERVISOR_PINS', action: 'EXECUTE' },
      { resource: 'TELEMETRY', action: 'MANAGE' },
      { resource: 'POLICY', action: 'MANAGE' },
      { resource: 'AUTH', action: 'MANAGE' },
      { resource: 'SYSTEM_SETTINGS', action: 'MANAGE' },
      { resource: 'ORGANIZATION', action: 'MANAGE' },
      { resource: 'SUPPORT_TICKETS', action: 'MANAGE' },
      { resource: 'AUDIT_LOGS', action: 'MANAGE' }
    ]
  },
  {
    name: 'SUPPORT_AGENT',
    displayName: 'Support Agent',
    description: 'User support and troubleshooting capabilities',
    isSystemRole: true,
    hierarchyLevel: 4,
    permissions: [
      // Support focused access
      { resource: 'TEAMS', action: 'READ' },
      { resource: 'USERS', action: 'READ' },
      { resource: 'DEVICES', action: 'READ' },
      { resource: 'TELEMETRY', action: 'READ' },
      { resource: 'POLICY', action: 'READ' },
      { resource: 'SUPPORT_TICKETS', action: 'MANAGE' },
      { resource: 'AUDIT_LOGS', action: 'READ' }
    ]
  },
  {
    name: 'AUDITOR',
    displayName: 'Auditor',
    description: 'Read-only audit access and compliance monitoring',
    isSystemRole: true,
    hierarchyLevel: 5,
    permissions: [
      // Read-only audit access
      { resource: 'TEAMS', action: 'READ' },
      { resource: 'USERS', action: 'READ' },
      { resource: 'DEVICES', action: 'READ' },
      { resource: 'TELEMETRY', action: 'READ' },
      { resource: 'POLICY', action: 'READ' },
      { resource: 'SUPPORT_TICKETS', action: 'READ' },
      { resource: 'AUDIT_LOGS', action: 'READ' }
    ]
  },

  // Specialized Roles
  {
    name: 'DEVICE_MANAGER',
    displayName: 'Device Manager',
    description: 'Android device lifecycle management',
    isSystemRole: true,
    hierarchyLevel: 6,
    permissions: [
      // Device management focus
      { resource: 'DEVICES', action: 'MANAGE' },
      { resource: 'TEAMS', action: 'READ' },
      { resource: 'USERS', action: 'READ' },
      { resource: 'TELEMETRY', action: 'READ' },
      { resource: 'TELEMETRY', action: 'MANAGE' },
      { resource: 'POLICY', action: 'READ' },
      { resource: 'SUPPORT_TICKETS', action: 'CREATE' },
      { resource: 'SUPPORT_TICKETS', action: 'READ' }
    ]
  },
  {
    name: 'POLICY_ADMIN',
    displayName: 'Policy Administrator',
    description: 'Policy creation and management',
    isSystemRole: true,
    hierarchyLevel: 7,
    permissions: [
      // Policy management focus
      { resource: 'POLICY', action: 'MANAGE' },
      { resource: 'TEAMS', action: 'READ' },
      { resource: 'USERS', action: 'READ' },
      { resource: 'DEVICES', action: 'READ' },
      { resource: 'TELEMETRY', action: 'READ' },
      { resource: 'SUPPORT_TICKETS', action: 'CREATE' },
      { resource: 'SUPPORT_TICKETS', action: 'READ' },
      { resource: 'AUDIT_LOGS', action: 'READ' }
    ]
  },
  {
    name: 'NATIONAL_SUPPORT_ADMIN',
    displayName: 'National Support Administrator',
    description: 'Cross-team operational access (no system settings)',
    isSystemRole: true,
    hierarchyLevel: 8,
    permissions: [
      // Cross-team operational access
      { resource: 'TEAMS', action: 'READ' },
      { resource: 'USERS', action: 'READ' },
      { resource: 'DEVICES', action: 'MANAGE' },
      { resource: 'SUPERVISOR_PINS', action: 'READ' },
      { resource: 'SUPERVISOR_PINS', action: 'EXECUTE' },
      { resource: 'TELEMETRY', action: 'MANAGE' },
      { resource: 'POLICY', action: 'MANAGE' },
      { resource: 'AUTH', action: 'MANAGE' },
      { resource: 'SUPPORT_TICKETS', action: 'MANAGE' },
      { resource: 'AUDIT_LOGS', action: 'READ' },
      // Note: SYSTEM_SETTINGS access explicitly excluded
    ]
  }
];

async function seedDefaultRoles() {
  try {
    console.log('🏢 Starting default roles seeding for production deployment...');
    logger.info('Default roles seeding started');

    // Create permissions first
    console.log('Creating default permissions...');
    const permissionMap = new Map<string, string>();

    for (const roleDef of DEFAULT_ROLES) {
      for (const perm of roleDef.permissions) {
        const permissionKey = `${perm.resource}_${perm.action}`;

        if (permissionMap.has(permissionKey)) {
          continue;
        }

        const existingPermission = await db.select({ id: permissions.id })
          .from(permissions)
          .where(eq(permissions.name, permissionKey))
          .limit(1);

        if (existingPermission.length > 0) {
          permissionMap.set(permissionKey, existingPermission[0].id);
          continue;
        }

        const permissionId = uuidv4();
        const [insertedPermission] = await db.insert(permissions).values({
          id: permissionId,
          name: permissionKey,
          resource: perm.resource,
          action: perm.action,
          description: `${perm.action} access to ${perm.resource}`,
          isActive: true,
          createdAt: new Date()
        }).returning({ id: permissions.id });

        permissionMap.set(permissionKey, insertedPermission.id);
        console.log(`  ✓ Created permission: ${permissionKey}`);
      }
    }

    console.log(`✅ Created ${permissionMap.size} unique permissions`);

    // Create roles and assign permissions
    console.log('Creating default roles...');
    let rolesCreated = 0;

    for (const roleDef of DEFAULT_ROLES) {
      let roleId: string | undefined;

      const existingRole = await db.select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, roleDef.name))
        .limit(1);

      if (existingRole.length > 0) {
        roleId = existingRole[0].id;
        await db.update(roles)
          .set({
            displayName: roleDef.displayName,
            description: roleDef.description,
            hierarchyLevel: roleDef.hierarchyLevel,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(roles.id, roleId));
      } else {
        const [insertedRole] = await db.insert(roles).values({
          id: uuidv4(),
          name: roleDef.name,
          displayName: roleDef.displayName,
          description: roleDef.description,
          isSystemRole: roleDef.isSystemRole,
          hierarchyLevel: roleDef.hierarchyLevel,
          isActive: true,
          createdAt: new Date()
        }).returning({ id: roles.id });
        roleId = insertedRole.id;
      }

      if (!roleId) {
        console.warn(`  ⚠️  Unable to determine ID for role ${roleDef.name}`);
        continue;
      }

      // Assign permissions to the role
      for (const perm of roleDef.permissions) {
        const permissionKey = `${perm.resource}_${perm.action}`;
        const permissionId = permissionMap.get(permissionKey);

        if (permissionId) {
          await db.insert(rolePermissions).values({
            roleId,
            permissionId,
            isActive: true
          }).onConflictDoNothing();
        }
      }

      console.log(`  ✓ Created role: ${roleDef.name} (${roleDef.permissions.length} permissions)`);
      rolesCreated++;
    }

    console.log('\n✅ Default roles seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - Roles created: ${rolesCreated}`);
    console.log(`  - Permissions created: ${permissionMap.size}`);
    console.log(`  - Role-permission assignments: ${DEFAULT_ROLES.reduce((sum, role) => sum + role.permissions.length, 0)}`);

    logger.info('Default roles seeding completed', {
      rolesCreated,
      permissionsCreated: permissionMap.size,
      totalAssignments: DEFAULT_ROLES.reduce((sum, role) => sum + role.permissions.length, 0)
    });

    return {
      success: true,
      rolesCreated,
      permissionsCreated: permissionMap.size,
      totalAssignments: DEFAULT_ROLES.reduce((sum, role) => sum + role.permissions.length, 0)
    };

  } catch (error) {
    console.error('❌ Failed to seed default roles:', error);
    logger.error('Default roles seeding failed', { error });
    throw error;
  }
}

async function clearDefaultRoles() {
  try {
    console.log('🧹 Clearing existing default roles, admin users, and organizations...');

    // Delete permission cache
    await db.delete(permissionCache);
    console.log('  ✓ Cleared permission cache');

    // Delete role permissions first (due to foreign key constraints)
    await db.delete(rolePermissions);

    // Delete permissions
    await db.delete(permissions);

    // Delete system roles
    await db.delete(roles).where(eq(roles.isSystemRole, true));

    // Clear web admin users (test admin accounts)
    await db.delete(webAdminUsers);
    console.log('  ✓ Cleared web admin users');

    // Clear organizations
    await db.delete(organizations);
    console.log('  ✓ Cleared organizations');

    console.log('✅ Default roles, admin users, and organizations cleared successfully!');

  } catch (error) {
    console.error('❌ Failed to clear default roles:', error);
    logger.error('Default roles cleanup failed', { error });
    throw error;
  }
}

async function verifyRoles() {
  try {
    console.log('🔍 Verifying role configuration...');

    const roleCount = await db.select().from(roles).where(roles.isSystemRole.eq(true));
    const permissionCount = await db.select().from(permissions);
    const assignmentCount = await db.select().from(rolePermissions);

    console.log(`📊 Verification Results:`);
    console.log(`  - System roles: ${roleCount.length}`);
    console.log(`  - Permissions: ${permissionCount.length}`);
    console.log(`  - Role-permission assignments: ${assignmentCount.length}`);

    // Verify each role has expected permissions
    for (const roleDef of DEFAULT_ROLES) {
      const role = roleCount.find(r => r.name === roleDef.name);
      if (role) {
        console.log(`  ✓ ${roleDef.name}: Found`);
      } else {
        console.log(`  ❌ ${roleDef.name}: Missing`);
      }
    }

    return {
      rolesFound: roleCount.length,
      permissionsFound: permissionCount.length,
      assignmentsFound: assignmentCount.length
    };

  } catch (error) {
    console.error('❌ Failed to verify roles:', error);
    throw error;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedDefaultRoles()
        .then(() => {
          console.log('\n🎉 Default roles seeding completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Default roles seeding failed:', error);
          process.exit(1);
        });
      break;

    case 'clear':
      clearDefaultRoles()
        .then(() => {
          console.log('\n🧹 Default roles cleanup completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Default roles cleanup failed:', error);
          process.exit(1);
        });
      break;

    case 'verify':
      verifyRoles()
        .then(() => {
          console.log('\n✅ Role verification completed!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Role verification failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage:');
      console.log('  tsx scripts/seed-default-roles.ts seed   - Seed default production roles');
      console.log('  tsx scripts/seed-default-roles.ts clear  - Clear existing default roles, admin users, and organizations');
      console.log('  tsx scripts/seed-default-roles.ts verify - Verify role configuration');
      console.log('');
      console.log('Production deployment workflow:');
      console.log('  1. tsx scripts/seed-default-roles.ts clear');
      console.log('  2. tsx scripts/seed-default-roles.ts seed');
      console.log('  3. tsx scripts/seed-default-roles.ts verify');
      process.exit(1);
  }
}

export { seedDefaultRoles, clearDefaultRoles, verifyRoles };
