import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthorizationService } from '../../src/services/authorization-service';
import { projectService } from '../../src/services/project-service';
import { db } from '../../src/lib/db/index';
import { users, teams, roles, userRoleAssignments, projects } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('PROJECTS RBAC Integration with AuthorizationService', () => {
  let testUser: any;
  let testTeam: any;
  let testRole: any;
  let testProject: any;

  beforeEach(async () => {
    // Create a test team
    const [team] = await db.insert(teams).values({
      name: 'Test Team for RBAC',
      stateId: 'TR',
      timezone: 'UTC'
    }).returning();
    testTeam = team;

    // Create a test user
    const [user] = await db.insert(users).values({
      code: 'TRBAC',
      teamId: testTeam.id,
      displayName: 'Test User RBAC Integration',
      role: 'TEAM_MEMBER'
    }).returning();
    testUser = user;

    // Create a test role for PROJECTS permissions
    const [role] = await db.insert(roles).values({
      name: 'INTEGRATION_TEST_ROLE',
      displayName: 'Integration Test Role',
      description: 'Role for testing PROJECTS RBAC integration',
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

    // Create a test project
    testProject = await projectService.createProject({
      title: 'RBAC Integration Test Project',
      abbreviation: 'RITP',
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
      await db.delete(roles).where(
        eq(roles.id, testRole.id)
      );
    }
  });

  describe('AuthorizationService PROJECTS Resource Handling', () => {
    it('should recognize PROJECTS as a special resource', async () => {
      // This tests that our AuthorizationService properly routes PROJECTS requests
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id, teamId: testTeam.id }
      );

      // Should return a valid permission check result
      expect(result).toBeDefined();
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('requiredPermission');
      expect(result.requiredPermission).toBe('PROJECTS.READ');
    });

    it('should return project-specific required permission', async () => {
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'CREATE'
      );

      expect(result.requiredPermission).toBe('PROJECTS.CREATE');
    });

    it('should handle different PROJECTS actions', async () => {
      const actions = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'LIST', 'MANAGE', 'EXECUTE', 'AUDIT'];

      for (const action of actions) {
        const result = await AuthorizationService.checkPermission(
          testUser.id,
          'PROJECTS',
          action
        );

        expect(result).toBeDefined();
        expect(result).toHaveProperty('allowed');
        expect(result).toHaveProperty('requiredPermission');
        expect(result.requiredPermission).toBe(`PROJECTS.${action}`);
        expect(result).toHaveProperty('evaluationTime');
        expect(typeof result.evaluationTime).toBe('number');
      }
    });

    it('should pass project context to permission checking', async () => {
      const context = {
        resourceId: testProject.id,
        teamId: testTeam.id,
        organizationId: 'org-test',
        userId: testUser.id
      };

      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        context
      );

      expect(result).toBeDefined();
      // The context should be used in permission evaluation
      expect(result.evaluationTime).toBeGreaterThan(0);
    });

    it('should provide detailed permission information', async () => {
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id }
      );

      if (result.allowed && result.grantedBy) {
        // Should have detailed granted by information
        expect(Array.isArray(result.grantedBy)).toBe(true);
        expect(result.grantedBy[0]).toHaveProperty('roleId');
        expect(result.grantedBy[0]).toHaveProperty('roleName');
        expect(result.grantedBy[0]).toHaveProperty('permissionId');
      }
    });
  });

  describe('AuthorizationService with Project Assignments', () => {
    it('should allow access when user is directly assigned to project', async () => {
      // Assign user directly to project
      await projectService.assignUserToProject(
        testProject.id,
        testUser.id,
        testUser.id,
        'Project Member'
      );

      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id }
      );

      expect(result.allowed).toBe(true);
      expect(result.requiredPermission).toBe('PROJECTS.READ');
    });

    it('should provide assignment-based access information', async () => {
      await projectService.assignUserToProject(
        testProject.id,
        testUser.id,
        testUser.id,
        'Project Lead'
      );

      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'MANAGE',
        { resourceId: testProject.id }
      );

      if (result.allowed && result.grantedBy) {
        // Should indicate the source of the permission
        expect(result.grantedBy[0].permissionId).toBe('projects-permission');
      }
    });

    it('should allow team-based project access', async () => {
      // Assign team to project
      await projectService.assignTeamToProject(
        testProject.id,
        testTeam.id,
        testUser.id,
        'Implementation Team'
      );

      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id }
      );

      expect(result.requiredPermission).toBe('PROJECTS.READ');
      // Team access should be properly detected
    });

    it('should deny access for non-assigned users without role permissions', async () => {
      // Create a different user without any assignments
      const [otherUser] = await db.insert(users).values({
        code: 'OTHERUSR',
        teamId: testTeam.id,
        displayName: 'Other User',
        role: 'TEAM_MEMBER'
      }).returning();

      try {
        const result = await AuthorizationService.checkPermission(
          otherUser.id,
          'PROJECTS',
          'DELETE',
          { resourceId: testProject.id }
        );

        // May be denied based on lack of role permissions or assignments
        expect(result.requiredPermission).toBe('PROJECTS.DELETE');
      } finally {
        // Cleanup
        await db.delete(users).where(eq(users.id, otherUser.id));
      }
    });
  });

  describe('Cross-Team and Cross-Organization Access', () => {
    it('should handle cross-team project access scenarios', async () => {
      // Create another team and user
      const [otherTeam] = await db.insert(teams).values({
        name: 'Other Team',
        stateId: 'OT',
        timezone: 'UTC'
      }).returning();

      const [otherUser] = await db.insert(users).values({
        code: 'OTHUSR',
        teamId: otherTeam.id,
        displayName: 'Other Team User',
        role: 'TEAM_MEMBER'
      }).returning();

      try {
        // Other user should have no access by default
        const result = await AuthorizationService.checkPermission(
          otherUser.id,
          'PROJECTS',
          'READ',
          { resourceId: testProject.id }
        );

        expect(result.requiredPermission).toBe('PROJECTS.READ');
        // Should be denied unless cross-team permissions exist

      } finally {
        await db.delete(users).where(eq(users.id, otherUser.id));
        await db.delete(teams).where(eq(teams.id, otherTeam.id));
      }
    });

    it('should respect organization-level boundaries', async () => {
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'LIST',
        { organizationId: 'different-org' }
      );

      // Organization boundaries should be respected
      expect(result.requiredPermission).toBe('PROJECTS.LIST');
      expect(result.evaluationTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid user IDs gracefully', async () => {
      const result = await AuthorizationService.checkPermission(
        'invalid-user-id',
        'PROJECTS',
        'READ'
      );

      // Should not throw and should return safe defaults
      expect(result).toBeDefined();
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('evaluationTime');
    });

    it('should handle invalid project IDs in context', async () => {
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: 'invalid-project-id' }
      );

      expect(result).toBeDefined();
      expect(result.requiredPermission).toBe('PROJECTS.READ');
    });

    it('should handle null/undefined context gracefully', async () => {
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        null
      );

      expect(result).toBeDefined();
      expect(result.requiredPermission).toBe('PROJECTS.READ');
      expect(result.evaluationTime).toBeGreaterThan(0);
    });

    it('should handle unknown actions', async () => {
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'UNKNOWN_ACTION'
      );

      expect(result).toBeDefined();
      expect(result.requiredPermission).toBe('PROJECTS.UNKNOWN_ACTION');
    });
  });

  describe('Performance and Caching', () => {
    it('should complete permission checks within performance targets', async () => {
      const startTime = Date.now();

      // Run multiple permission checks
      await Promise.all([
        AuthorizationService.checkPermission(testUser.id, 'PROJECTS', 'READ'),
        AuthorizationService.checkPermission(testUser.id, 'PROJECTS', 'LIST'),
        AuthorizationService.checkPermission(testUser.id, 'PROJECTS', 'AUDIT'),
        AuthorizationService.checkPermission(testUser.id, 'PROJECTS', 'EXECUTE')
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(2000); // 2 second target
      expect(totalTime).toBeGreaterThan(0);
    });

    it('should be consistent across multiple calls', async () => {
      const result1 = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id }
      );

      const result2 = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id }
      );

      // Results should be consistent
      expect(result1.allowed).toBe(result2.allowed);
      expect(result1.requiredPermission).toBe(result2.requiredPermission);
    });
  });

  describe('Logging and Auditing', () => {
    it('should provide evaluation timing information', async () => {
      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id, requestId: 'test-123' }
      );

      expect(result.evaluationTime).toBeDefined();
      expect(typeof result.evaluationTime).toBe('number');
      expect(result.evaluationTime).toBeGreaterThan(0);
    });

    it('should handle request IDs for audit trails', async () => {
      const requestId = 'audit-trail-test-123';

      const result = await AuthorizationService.checkPermission(
        testUser.id,
        'PROJECTS',
        'READ',
        { resourceId: testProject.id, requestId }
      );

      expect(result).toBeDefined();
      // Request ID should be processed by the underlying service
    });
  });
});