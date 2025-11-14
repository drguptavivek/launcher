import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, roles, permissions, rolePermissions, userRoleAssignments, users, teams, permissionCache } from '../../src/lib/db';
import { AuthorizationService } from '../../src/services/authorization-service';
import { RoleService } from '../../src/services/role-service';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

// Test data interfaces
interface TestUser {
  id: string;
  code: string;
  teamId: string;
  displayName: string;
  role?: string;
  isActive: boolean;
}

interface TestRole {
  id: string;
  name: string;
  displayName: string;
  hierarchyLevel: number;
  isActive: boolean;
}

interface TestPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  scope: string;
  isActive: boolean;
}

describe('RBAC Services', () => {
  let testTeam: any;
  let testUser: TestUser;
  let testRole: TestRole;
  let testPermission: TestPermission;

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(permissionCache);
    await db.delete(userRoleAssignments);
    await db.delete(rolePermissions);
    await db.delete(permissions);
    await db.delete(roles);

    // Create test team
    const teamResult = await db.insert(teams).values({
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'TEST',
      isActive: true
    }).returning();

    testTeam = teamResult[0];

    // Create test user
    const userResult = await db.insert(users).values({
      code: 'TEST001',
      teamId: testTeam.id,
      displayName: 'Test User',
      role: 'TEAM_MEMBER',
      isActive: true
    }).returning();

    testUser = userResult[0];

    // Create test role
    const roleResult = await db.insert(roles).values({
      name: 'TEST_ROLE',
      displayName: 'Test Role',
      description: 'Test role for unit testing',
      hierarchyLevel: 5,
      isActive: true
    }).returning();

    testRole = roleResult[0];

    // Create test permission
    const permissionResult = await db.insert(permissions).values({
      name: 'TEST_PERMISSION',
      resource: 'TEAMS',
      action: 'READ',
      scope: 'TEAM',
      description: 'Test permission',
      isActive: true
    }).returning();

    testPermission = permissionResult[0];
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(permissionCache);
    await db.delete(userRoleAssignments);
    await db.delete(rolePermissions);
    await db.delete(permissions);
    await db.delete(roles);
    await db.delete(users);
    await db.delete(teams);
  });

  describe('RoleService', () => {
    describe('createRole', () => {
      it('should create a new role successfully', async () => {
        const roleData = {
          name: 'NEW_TEST_ROLE',
          displayName: 'New Test Role',
          description: 'A new role for testing',
          hierarchyLevel: 3
        };

        const result = await RoleService.createRole(roleData);

        expect(result.success).toBe(true);
        expect(result.role).toBeDefined();
        expect(result.role!.name).toBe('NEW_TEST_ROLE');
        expect(result.role!.displayName).toBe('New Test Role');
        expect(result.role!.hierarchyLevel).toBe(3);
      });

      it('should fail to create role with duplicate name', async () => {
        const roleData = {
          name: 'TEST_ROLE',
          displayName: 'Duplicate Role'
        };

        const result = await RoleService.createRole(roleData);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('ROLE_EXISTS');
      });

      it('should create role with permissions', async () => {
        const roleData = {
          name: 'ROLE_WITH_PERMISSIONS',
          displayName: 'Role With Permissions',
          permissionIds: [testPermission.id]
        };

        const result = await RoleService.createRole(roleData);

        expect(result.success).toBe(true);

        // Verify permission was assigned
        const rolePerms = await db.select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, result.role!.id));

        expect(rolePerms).toHaveLength(1);
        expect(rolePerms[0].permissionId).toBe(testPermission.id);
      });
    });

    describe('assignRoleToUser', () => {
      it('should assign role to user successfully', async () => {
        const assignmentData = {
          assignedBy: testUser.id,
          teamId: testTeam.id
        };

        const result = await RoleService.assignRoleToUser(
          testUser.id,
          testRole.id,
          assignmentData
        );

        expect(result.success).toBe(true);
        expect(result.assignment).toBeDefined();
        expect(result.assignment!.userId).toBe(testUser.id);
        expect(result.assignment!.roleId).toBe(testRole.id);
        expect(result.assignment!.isActive).toBe(true);
      });

      it('should fail to assign role to non-existent user', async () => {
        const nonExistentUserId = uuidv4();
        const assignmentData = { assignedBy: testUser.id };

        const result = await RoleService.assignRoleToUser(
          nonExistentUserId,
          testRole.id,
          assignmentData
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('USER_NOT_FOUND');
      });

      it('should fail to assign non-existent role', async () => {
        const nonExistentRoleId = uuidv4();
        const assignmentData = { assignedBy: testUser.id };

        const result = await RoleService.assignRoleToUser(
          testUser.id,
          nonExistentRoleId,
          assignmentData
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('ROLE_NOT_FOUND');
      });

      it('should fail to assign duplicate role to user', async () => {
        const assignmentData = { assignedBy: testUser.id };

        // First assignment should succeed
        await RoleService.assignRoleToUser(testUser.id, testRole.id, assignmentData);

        // Second assignment should fail
        const result = await RoleService.assignRoleToUser(testUser.id, testRole.id, assignmentData);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('ASSIGNMENT_EXISTS');
      });
    });

    describe('getUserRoles', () => {
      it('should return user roles correctly', async () => {
        // Assign role to user
        await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });

        const result = await RoleService.getUserRoles(testUser.id);

        expect(result.success).toBe(true);
        expect(result.assignments).toHaveLength(1);
        expect(result.assignments![0].userId).toBe(testUser.id);
        expect(result.assignments![0].roleId).toBe(testRole.id);
      });

      it('should return empty roles for user with no assignments', async () => {
        const result = await RoleService.getUserRoles(testUser.id);

        expect(result.success).toBe(true);
        expect(result.assignments).toHaveLength(0);
      });
    });

    describe('removeRoleFromUser', () => {
      it('should remove role from user successfully', async () => {
        // Assign role first
        await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });

        const result = await RoleService.removeRoleFromUser(testUser.id, testRole.id);

        expect(result.success).toBe(true);
        expect(result.assignment?.isActive).toBe(false);
      });

      it('should fail to remove non-existent assignment', async () => {
        const result = await RoleService.removeRoleFromUser(testUser.id, testRole.id);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('ASSIGNMENT_NOT_FOUND');
      });
    });
  });

  describe('AuthorizationService', () => {
    describe('checkPermission', () => {
      beforeEach(async () => {
        // Assign role and permission for authorization tests
        await db.insert(rolePermissions).values({
          roleId: testRole.id,
          permissionId: testPermission.id,
          isActive: true
        });

        await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });
      });

      it('should allow access for user with correct permission', async () => {
        const result = await AuthorizationService.checkPermission(
          testUser.id,
          'TEAMS' as any,
          'READ' as any
        );

        expect(result.allowed).toBe(true);
        expect(result.context).toBeDefined();
        expect(result.context!.permissions.length).toBeGreaterThan(0);
      });

      it('should deny access for user without permission', async () => {
        const result = await AuthorizationService.checkPermission(
          testUser.id,
          'DEVICES' as any,
          'DELETE' as any
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBeDefined();
      });

      it('should use cache for repeated permission checks', async () => {
        // First check
        const result1 = await AuthorizationService.checkPermission(
          testUser.id,
          'TEAMS' as any,
          'READ' as any
        );

        // Second check (should hit cache)
        const result2 = await AuthorizationService.checkPermission(
          testUser.id,
          'TEAMS' as any,
          'READ' as any
        );

        expect(result1.allowed).toBe(true);
        expect(result2.allowed).toBe(true);
        expect(result2.evaluationTime!).toBeLessThan(result1.evaluationTime!);
      });

      it('should handle system settings access restrictions', async () => {
        const result = await AuthorizationService.checkPermission(
          testUser.id,
          'SYSTEM_SETTINGS' as any,
          'READ' as any
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('SYSTEM_SETTINGS_ACCESS_DENIED');
      });
    });

    describe('computeEffectivePermissions', () => {
      it('should compute effective permissions correctly', async () => {
        // Assign role and permission
        await db.insert(rolePermissions).values({
          roleId: testRole.id,
          permissionId: testPermission.id,
          isActive: true
        });

        await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });

        const result = await AuthorizationService.computeEffectivePermissions(testUser.id);

        expect(result.userId).toBe(testUser.id);
        expect(result.permissions.length).toBeGreaterThan(0);
        expect(result.roles.length).toBeGreaterThan(0);
        expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });

      it('should return empty permissions for user with no roles', async () => {
        const newUserId = uuidv4();

        // Create a user with no role assignments
        await db.insert(users).values({
          id: newUserId,
          code: 'NO_ROLES_USER',
          teamId: testTeam.id,
          displayName: 'No Roles User',
          role: 'TEAM_MEMBER',
          isActive: true
        });

        const result = await AuthorizationService.computeEffectivePermissions(newUserId);

        expect(result.userId).toBe(newUserId);
        expect(result.permissions.length).toBe(0);
        expect(result.roles.length).toBe(0);
      });
    });

    describe('checkContextualAccess', () => {
      it('should allow access within team boundary', async () => {
        await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });

        const result = await AuthorizationService.checkContextualAccess(
          testUser.id,
          {
            type: 'TEAMS',
            teamId: testTeam.id
          },
          'READ'
        );

        expect(result.allowed).toBe(true);
      });

      it('should deny access outside team boundary for regular role', async () => {
        await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });

        const otherTeamId = uuidv4();

        const result = await AuthorizationService.checkContextualAccess(
          testUser.id,
          {
            type: 'TEAMS',
            teamId: otherTeamId
          },
          'READ'
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('TEAM_BOUNDARY_VIOLATION');
      });
    });

    describe('invalidatePermissionCache', () => {
      it('should invalidate user permission cache', async () => {
        // First, compute permissions to populate cache
        await AuthorizationService.computeEffectivePermissions(testUser.id);

        // Invalidate cache
        await AuthorizationService.invalidatePermissionCache(testUser.id);

        // Verify cache is invalidated by computing again
        const result = await AuthorizationService.computeEffectivePermissions(testUser.id);

        expect(result.userId).toBe(testUser.id);
        // Should recompute successfully
      });
    });

    describe('hasAnyRole', () => {
      it('should return true for user with matching role', async () => {
        await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });

        const result = await AuthorizationService.hasAnyRole(testUser.id, ['TEST_ROLE']);

        expect(result).toBe(true);
      });

      it('should return false for user without matching role', async () => {
        const result = await AuthorizationService.hasAnyRole(testUser.id, ['NON_EXISTENT_ROLE']);

        expect(result).toBe(false);
      });
    });

    describe('NATIONAL_SUPPORT_ADMIN special handling', () => {
      it('should allow cross-team operational access for NATIONAL_SUPPORT_ADMIN', async () => {
        // Create NATIONAL_SUPPORT_ADMIN role
        const nationalSupportRole = await db.insert(roles).values({
          name: 'NATIONAL_SUPPORT_ADMIN',
          displayName: 'National Support Admin',
          hierarchyLevel: 9,
          isActive: true
        }).returning();

        // Create operational permission
        const operationalPermission = await db.insert(permissions).values({
          name: 'OPERATIONAL_ACCESS',
          resource: 'TELEMETRY',
          action: 'READ',
          scope: 'ORGANIZATION',
          isActive: true
        }).returning();

        // Assign permission to role
        await db.insert(rolePermissions).values({
          roleId: nationalSupportRole[0].id,
          permissionId: operationalPermission[0].id,
          isActive: true
        });

        // Assign role to user
        await RoleService.assignRoleToUser(testUser.id, nationalSupportRole[0].id, { assignedBy: testUser.id });

        const result = await AuthorizationService.checkContextualAccess(
          testUser.id,
          {
            type: 'TELEMETRY',
            teamId: uuidv4() // Different team
          },
          'READ'
        );

        expect(result.allowed).toBe(true);
      });

      it('should deny system settings access for NATIONAL_SUPPORT_ADMIN', async () => {
        // Create NATIONAL_SUPPORT_ADMIN role
        const nationalSupportRole = await db.insert(roles).values({
          name: 'NATIONAL_SUPPORT_ADMIN',
          displayName: 'National Support Admin',
          hierarchyLevel: 9,
          isActive: true
        }).returning();

        // Assign role to user
        await RoleService.assignRoleToUser(testUser.id, nationalSupportRole[0].id, { assignedBy: testUser.id });

        const result = await AuthorizationService.checkContextualAccess(
          testUser.id,
          {
            type: 'SYSTEM_SETTINGS',
            teamId: testTeam.id
          },
          'READ'
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('SYSTEM_SETTINGS_ACCESS_DENIED_NATIONAL_SUPPORT');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should resolve permissions within performance target', async () => {
      // Setup multiple roles and permissions
      const rolesToCreate = 5;
      const permissionsPerRole = 3;

      for (let i = 0; i < rolesToCreate; i++) {
        const role = await db.insert(roles).values({
          name: `PERF_ROLE_${i}`,
          displayName: `Performance Role ${i}`,
          hierarchyLevel: i,
          isActive: true
        }).returning();

        for (let j = 0; j < permissionsPerRole; j++) {
          const permission = await db.insert(permissions).values({
            name: `PERF_PERMISSION_${i}_${j}`,
            resource: 'TEAMS',
            action: 'READ',
            scope: 'TEAM',
            isActive: true
          }).returning();

          await db.insert(rolePermissions).values({
            roleId: role[0].id,
            permissionId: permission[0].id,
            isActive: true
          });
        }

        await RoleService.assignRoleToUser(testUser.id, role[0].id, { assignedBy: testUser.id });
      }

      const startTime = Date.now();
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'TEAMS' as any,
        'READ' as any
      );
      const endTime = Date.now();

      expect(result.allowed).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be under 100ms
    });

    it('should handle concurrent permission checks efficiently', async () => {
      // Setup basic role assignment
      await RoleService.assignRoleToUser(testUser.id, testRole.id, { assignedBy: testUser.id });

      const promises = Array.from({ length: 10 }, (_, i) =>
        AuthorizationService.checkPermission(
          testUser.id,
          'TEAMS' as any,
          'READ' as any,
          { requestId: `test-${i}` }
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results.every(r => r.allowed)).toBe(true);
      expect(endTime - startTime).toBeLessThan(200); // Should handle concurrent checks efficiently
    });
  });
});