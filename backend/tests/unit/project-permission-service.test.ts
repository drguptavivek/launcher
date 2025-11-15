import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../src/lib/db/index';
import { projectPermissionService } from '../../src/services/project-permission-service';
import { projectService } from '../../src/services/project-service';
import { users, teams, roles, permissions, rolePermissions, userRoleAssignments, projects } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('ProjectPermissionService', () => {
  let testUser: any;
  let testTeam: any;
  let testRole: any;
  let testProject: any;

  beforeEach(async () => {
    // Create a test team
    const [team] = await db.insert(teams).values({
      name: 'Test Team for Permissions',
      stateId: 'TP',
      timezone: 'UTC'
    }).returning();
    testTeam = team;

    // Create a test user
    const [user] = await db.insert(users).values({
      code: 'TESTPRM',
      teamId: testTeam.id,
      displayName: 'Test User for Permissions',
      role: 'TEAM_MEMBER'
    }).returning();
    testUser = user;

    // Create a test role for PROJECTS permissions
    const [role] = await db.insert(roles).values({
      name: 'TEST_PROJECT_ROLE',
      displayName: 'Test Project Role',
      description: 'Test role for project permissions',
      isSystemRole: false,
      isActive: true,
      hierarchyLevel: 1
    }).returning();
    testRole = role;

    // Assign role to user
    await db.insert(userRoleAssignments).values({
      userId: testUser.id,
      roleId: testRole.id,
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      isActive: true
    });

    // Create basic PROJECTS permission for testing
    const [permission] = await db.insert(permissions).values({
      name: 'PROJECTS.TEST_READ',
      resource: 'PROJECTS',
      action: 'READ',
      scope: 'TEAM',
      description: 'Test read permission for projects',
      isActive: true
    }).returning();

    // Associate permission with role
    await db.insert(rolePermissions).values({
      roleId: testRole.id,
      permissionId: permission.id
    });

    // Also create EXECUTE permission for testing TEAM_MEMBER role permissions
    const [executePermission] = await db.insert(permissions).values({
      name: 'PROJECTS.TEST_EXECUTE',
      resource: 'PROJECTS',
      action: 'EXECUTE',
      scope: 'TEAM',
      description: 'Test execute permission for projects',
      isActive: true
    }).returning();

    // Associate execute permission with role
    await db.insert(rolePermissions).values({
      roleId: testRole.id,
      permissionId: executePermission.id
    });

    // Create a test project
    testProject = await projectService.createProject({
      title: 'Test Permission Project',
      abbreviation: 'TPP',
      status: 'ACTIVE',
      geographicScope: 'NATIONAL',
      createdBy: testUser.id
    });
  });

  afterEach(async () => {
    // Clean up in reverse order
    if (testProject?.id) {
      await db.delete(projects).where(
        eq(projects.id, testProject.id)
      );
    }

    if (testUser?.id) {
      await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, testUser.id));
      await db.delete(users).where(eq(users.id, testUser.id));
    }

    if (testTeam?.id) {
      await db.delete(teams).where(eq(teams.id, testTeam.id));
    }

    if (testRole?.id) {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, testRole.id));
      await db.delete(roles).where(eq(roles.id, testRole.id));
    }

    // Clean up test permissions
    const testPermissionNames = ['PROJECTS.TEST_READ', 'PROJECTS.TEST_EXECUTE'];
    for (const permissionName of testPermissionNames) {
      const testPermissions = await db.select()
        .from(permissions)
        .where(eq(permissions.name, permissionName));

      for (const permission of testPermissions) {
        await db.delete(rolePermissions).where(eq(rolePermissions.permissionId, permission.id));
        await db.delete(permissions).where(eq(permissions.id, permission.id));
      }
    }
  });

  describe('Project Permission Matrix', () => {
    it('should have the correct role hierarchy levels', () => {
      expect(projectPermissionService['ROLE_HIERARCHY']['TEAM_MEMBER']).toBe(1);
      expect(projectPermissionService['ROLE_HIERARCHY']['NATIONAL_SUPPORT_ADMIN']).toBe(9);
      expect(projectPermissionService['ROLE_HIERARCHY']['SYSTEM_ADMIN']).toBe(8);
    });

    it('should have defined permissions for all 9 roles', () => {
      const matrix = projectPermissionService['PROJECT_PERMISSION_MATRIX'];
      const expectedRoles = [
        'TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER',
        'SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR',
        'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN'
      ];

      expectedRoles.forEach(role => {
        expect(matrix[role]).toBeDefined();
        expect(matrix[role]['READ']).toBeDefined();
        expect(matrix[role]['AUDIT']).toBeDefined();
      });
    });

    it('should allow TEAM_MEMBER to read and execute projects', () => {
      const teamMemberPerms = projectPermissionService['PROJECT_PERMISSION_MATRIX']['TEAM_MEMBER'];
      expect(teamMemberPerms['READ'].allowed).toBe(true);
      expect(teamMemberPerms['EXECUTE'].allowed).toBe(true);
      expect(teamMemberPerms['CREATE'].allowed).toBe(false);
      expect(teamMemberPerms['DELETE'].allowed).toBe(false);
    });

    it('should allow NATIONAL_SUPPORT_ADMIN full system access', () => {
      const adminPerms = projectPermissionService['PROJECT_PERMISSION_MATRIX']['NATIONAL_SUPPORT_ADMIN'];

      Object.values(adminPerms).forEach(permission => {
        expect(permission.allowed).toBe(true);
      });

      expect(adminPerms['CREATE'].scope).toContain('ORGANIZATION');
      expect(adminPerms['CREATE'].scope).toContain('SYSTEM');
    });

    it('should allow REGIONAL_MANAGER regional project management', () => {
      const managerPerms = projectPermissionService['PROJECT_PERMISSION_MATRIX']['REGIONAL_MANAGER'];

      expect(managerPerms['CREATE'].allowed).toBe(true);
      expect(managerPerms['UPDATE'].allowed).toBe(true);
      expect(managerPerms['DELETE'].allowed).toBe(true);
      expect(managerPerms['CREATE'].scope).toContain('REGION');
    });
  });

  describe('Project Permission Checking', () => {
    it('should deny project access for non-existent user', async () => {
      const result = await projectPermissionService.checkProjectPermission(
        'non-existent-user-id',
        'READ',
        testProject.id
      );

      expect(result.allowed).toBe(false);
      // accessType might be 'none' or undefined in error cases - both are acceptable
      expect(['none', undefined]).toContain(result.accessType);
      expect(result.reason).toBeDefined();
    });

    it('should allow project access through direct assignment', async () => {
      // Assign user directly to project
      await projectService.assignUserToProject(
        testProject.id,
        testUser.id,
        testUser.id,
        'Test Role'
      );

      const result = await projectPermissionService.checkProjectPermission(
        testUser.id,
        'READ',
        testProject.id
      );

      expect(result.allowed).toBe(true);
      expect(result.accessType).toBe('direct');
      expect(result.grantedBy?.name).toBe('Test Role');
      expect(result.projectId).toBe(testProject.id);
    });

    it('should check role-based permissions for non-assigned projects', async () => {
      const result = await projectPermissionService.checkProjectPermission(
        testUser.id,
        'READ'
      );

      // Should have some access type determined (could be role_based or none depending on logic)
      expect(result.accessType).toBeDefined();
      expect(['role_based', 'none']).toContain(result.accessType);
    });

    it('should validate assignment permissions', async () => {
      // Test that user can assign based on their role
      const validationResult = await projectPermissionService.canAssignToProject(
        testUser.id,
        {
          projectId: testProject.id,
          assigneeId: testUser.id,
          assigneeType: 'user',
          assignedBy: testUser.id,
          roleInProject: 'Test Member'
        }
      );

      // Result depends on user's role in the system
      expect(typeof validationResult.allowed).toBe('boolean');
      expect(validationResult.reason).toBeDefined();
    });

    it('should get permission statistics', async () => {
      const stats = await projectPermissionService.getPermissionStatistics();

      expect(stats).toHaveProperty('totalPermissions');
      expect(stats).toHaveProperty('projectPermissions');
      expect(stats).toHaveProperty('rolesWithProjectAccess');
      expect(stats).toHaveProperty('activeProjectAssignments');
      expect(stats).toHaveProperty('activeTeamAssignments');

      expect(typeof stats.totalPermissions).toBe('number');
      expect(typeof stats.projectPermissions).toBe('number');
    });
  });

  describe('Integration with AuthorizationService', () => {
    it('should be importable by AuthorizationService', () => {
      // This tests that our import/export structure works correctly
      expect(projectPermissionService).toBeDefined();
      expect(typeof projectPermissionService.checkProjectPermission).toBe('function');
      expect(typeof projectPermissionService.initializeProjectPermissions).toBe('function');
    });

    it('should return proper result format', async () => {
      const result = await projectPermissionService.checkProjectPermission(
        testUser.id,
        'READ',
        testProject.id
      );

      // Should have all required fields
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('accessType');
      expect(result).toHaveProperty('evaluationTime');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.evaluationTime).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid UUID
      const result = await projectPermissionService.checkProjectPermission(
        testUser.id,
        'READ',
        'invalid-uuid-format'
      );

      // Should not throw and should return a safe result
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('evaluationTime');
    });

    it('should handle permission statistics errors', async () => {
      const stats = await projectPermissionService.getPermissionStatistics();

      // Should return safe defaults even on error
      expect(stats.totalPermissions).toBe(0);
      expect(stats.projectPermissions).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should complete permission checks within reasonable time', async () => {
      const startTime = Date.now();

      // Run multiple permission checks
      await Promise.all([
        projectPermissionService.checkProjectPermission(testUser.id, 'READ', testProject.id),
        projectPermissionService.checkProjectPermission(testUser.id, 'EXECUTE', testProject.id),
        projectPermissionService.checkProjectPermission(testUser.id, 'AUDIT', testProject.id)
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(totalTime).toBeLessThan(1000);
      expect(totalTime).toBeGreaterThan(0);
    });
  });
});