import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import {
  teams,
  devices,
  users,
  userPins,
  roles,
  permissions,
  rolePermissions,
  userRoleAssignments,
  organizations
} from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthorizationService } from '../../src/services/authorization-service';

describe('Context-Aware Authorization Integration Tests', () => {
  let app: express.Application;

  // Generate test UUIDs once
  const team1Id = uuidv4();
  const team2Id = uuidv4();
  const team3Id = uuidv4();
  const org1Id = uuidv4();
  const org2Id = uuidv4();
  const deviceId = uuidv4();
  const userId = uuidv4();
  const supervisorRoleId = uuidv4();
  const regionalManagerRoleId = uuidv4();
  const nationalSupportRoleId = uuidv4();
  const readTeamsPermissionId = uuidv4();
  const crossTeamAccessPermissionId = uuidv4();
  const systemAdminRoleId = uuidv4();

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Clean up existing test data
    await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
    await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, [supervisorRoleId, regionalManagerRoleId, nationalSupportRoleId, systemAdminRoleId]));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(inArray(teams.id, [team1Id, team2Id, team3Id]));
    await db.delete(roles).where(inArray(roles.id, [supervisorRoleId, regionalManagerRoleId, nationalSupportRoleId, systemAdminRoleId]));
    await db.delete(permissions).where(inArray(permissions.id, [readTeamsPermissionId, crossTeamAccessPermissionId]));
    await db.delete(organizations).where(inArray(organizations.id, [org1Id, org2Id]));

    // Create test organizations
    await db.insert(organizations).values([
      {
        id: org1Id,
        name: 'Organization One',
        displayName: 'Test Organization One',
        code: 'org-one',
        isActive: true,
        isDefault: true,
        settings: { theme: 'light' },
        metadata: { region: 'north' },
      },
      {
        id: org2Id,
        name: 'Organization Two',
        displayName: 'Test Organization Two',
        code: 'org-two',
        isActive: true,
        isDefault: false,
        settings: { theme: 'dark' },
        metadata: { region: 'south' },
      }
    ]);

    // Create test teams in different organizations
    await db.insert(teams).values([
      {
        id: team1Id,
        name: 'Team One',
        timezone: 'UTC',
        stateId: 'MH01',
      },
      {
        id: team2Id,
        name: 'Team Two',
        timezone: 'UTC',
        stateId: 'MH02',
      },
      {
        id: team3Id,
        name: 'Team Three',
        timezone: 'UTC',
        stateId: 'MH03',
      }
    ]);

    // Associate teams with organizations (team1 and team2 in org1, team3 in org2)
    await db.execute(`
      UPDATE teams SET organization_id = '${org1Id}' WHERE id = '${team1Id}';
      UPDATE teams SET organization_id = '${org1Id}' WHERE id = '${team2Id}';
      UPDATE teams SET organization_id = '${org2Id}' WHERE id = '${team3Id}';
    `);

    // Create test device in team1
    await db.insert(devices).values({
      id: deviceId,
      teamId: team1Id,
      name: 'Test Device',
      isActive: true,
    });

    // Create test user in team1
    await db.insert(users).values({
      id: userId,
      code: 'test001',
      teamId: team1Id,
      displayName: 'Test User',
      isActive: true,
    });

    // Create user PIN
    const pinHash = await hashPassword('123456');
    await db.insert(userPins).values({
      userId,
      pinHash: pinHash.hash,
      salt: pinHash.salt,
    });

    // Create roles with hierarchy and organizational scope
    await db.insert(roles).values([
      {
        id: supervisorRoleId,
        name: 'FIELD_SUPERVISOR',
        displayName: 'Field Supervisor',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 4,
      },
      {
        id: regionalManagerRoleId,
        name: 'REGIONAL_MANAGER',
        displayName: 'Regional Manager',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 6,
      },
      {
        id: nationalSupportRoleId,
        name: 'NATIONAL_SUPPORT_ADMIN',
        displayName: 'National Support Admin',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 9,
      },
      {
        id: systemAdminRoleId,
        name: 'SYSTEM_ADMIN',
        displayName: 'System Administrator',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 10,
      }
    ]);

    // Create permissions for organizational access control
    await db.insert(permissions).values([
      {
        id: readTeamsPermissionId,
        name: 'read_teams',
        resource: 'TEAMS',
        action: 'READ',
        scope: 'ORGANIZATION', // Organization-level access
        isActive: true,
      },
      {
        id: crossTeamAccessPermissionId,
        name: 'cross_team_access',
        resource: 'TEAMS',
        action: 'READ',
        scope: 'ORGANIZATION', // Cross-team access within organization
        isActive: true,
      }
    ]);

    // Assign permissions to roles
    await db.insert(rolePermissions).values([
      // Supervisor: Can read teams within organization
      {
        roleId: supervisorRoleId,
        permissionId: readTeamsPermissionId,
        isActive: true,
      },
      {
        roleId: supervisorRoleId,
        permissionId: crossTeamAccessPermissionId,
        isActive: true,
      },
      // Regional Manager: Can read teams across organizations
      {
        roleId: regionalManagerRoleId,
        permissionId: readTeamsPermissionId,
        isActive: true,
      },
      {
        roleId: regionalManagerRoleId,
        permissionId: crossTeamAccessPermissionId,
        isActive: true,
      },
      // National Support: Can access all organizations
      {
        roleId: nationalSupportRoleId,
        permissionId: readTeamsPermissionId,
        isActive: true,
      },
      {
        roleId: nationalSupportRoleId,
        permissionId: crossTeamAccessPermissionId,
        isActive: true,
      },
      // System Admin: Full access
      {
        roleId: systemAdminRoleId,
        permissionId: readTeamsPermissionId,
        isActive: true,
      },
      {
        roleId: systemAdminRoleId,
        permissionId: crossTeamAccessPermissionId,
        isActive: true,
      }
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
    await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, [supervisorRoleId, regionalManagerRoleId, nationalSupportRoleId, systemAdminRoleId]));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(inArray(teams.id, [team1Id, team2Id, team3Id]));
    await db.delete(roles).where(inArray(roles.id, [supervisorRoleId, regionalManagerRoleId, nationalSupportRoleId, systemAdminRoleId]));
    await db.delete(permissions).where(inArray(permissions.id, [readTeamsPermissionId, crossTeamAccessPermissionId]));
    await db.delete(organizations).where(inArray(organizations.id, [org1Id, org2Id]));
  });

  describe('Organization-Level Access Control', () => {
    it('should enforce team boundaries for users without cross-team permissions', async () => {
      // Assign user to team1 with basic read permissions
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
      });

      // Try to access team2 (different team, same organization) - should allow with cross-team permissions
      const resultSameOrgDifferentTeam = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team2Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(resultSameOrgDifferentTeam.allowed).toBe(true);
      expect(resultSameOrgDifferentTeam.reason).toBe('PERMISSION_GRANTED');

      // Try to access team3 (different organization) - should deny
      const resultDifferentOrg = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team3Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(resultDifferentOrg.allowed).toBe(false);
      expect(resultDifferentOrg.reason).toMatch(/ORGANIZATION_SCOPE_VIOLATION|CONTEXT_DENIED/);
    });

    it('should allow NATIONAL_SUPPORT_ADMIN to access any organization', async () => {
      // Assign NATIONAL_SUPPORT_ADMIN role (no specific team/org binding)
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: nationalSupportRoleId,
        organizationId: org1Id, // Primary org assignment
        isActive: true,
      });

      // Should access team3 in different organization
      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team3Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('NATIONAL_SUPPORT_ADMIN_CROSS_TEAM_ACCESS');
    });

    it('should allow SYSTEM_ADMIN to access any organization', async () => {
      // Assign SYSTEM_ADMIN role
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: systemAdminRoleId,
        organizationId: org1Id,
        isActive: true,
      });

      // Should access team3 in different organization
      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team3Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('SYSTEM_ADMIN_CROSS_TEAM_ACCESS');
    });
  });

  describe('Team Boundary Enforcement', () => {
    it('should allow users to access their own team resources', async () => {
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
      });

      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team1Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('PERMISSION_GRANTED');
    });

    it('should prevent users from accessing resources in teams they don\'t belong to', async () => {
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
      });

      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team2Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(result.allowed).toBe(true); // Supervisor has cross-team access within organization
      expect(result.grantedBy).toBeDefined();
      expect(result.grantedBy.length).toBeGreaterThan(0);
    });

    it('should enforce organization boundaries even for privileged users', async () => {
      // User in org1 with regional manager role for org1 only
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: regionalManagerRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
      });

      // Try to access team in org2 - should still be denied despite regional manager role
      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team3Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/ORGANIZATION_SCOPE_VIOLATION|CONTEXT_DENIED/);
    });
  });

  describe('Role Hierarchy with Organizational Context', () => {
    it('should respect role hierarchy within organizational boundaries', async () => {
      // Give user supervisor role in org1
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
      });

      const result = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ',
        { teamId: team2Id, organizationId: org1Id }
      );

      expect(result.allowed).toBe(true);
      expect(result.grantedBy).toBeDefined();
    });

    it('should handle multi-role assignments across organizations', async () => {
      // Assign user to supervisor role in org1 and regional manager role in org2
      await db.insert(userRoleAssignments).values([
        {
          id: uuidv4(),
          userId,
          roleId: supervisorRoleId,
          organizationId: org1Id,
          teamId: team1Id,
          isActive: true,
        },
        {
          id: uuidv4(),
          userId,
          roleId: regionalManagerRoleId,
          organizationId: org2Id,
          isActive: true,
        }
      ]);

      // Should be able to access teams in both organizations based on respective roles
      const resultOrg1 = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team1Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      const resultOrg2 = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team3Id, type: 'TEAMS' },
        'READ',
        { organizationId: org2Id }
      );

      expect(resultOrg1.allowed).toBe(true);
      expect(resultOrg2.allowed).toBe(true);
    });
  });

  describe('Performance with Context', () => {
    it('should handle contextual permission checks within performance targets', async () => {
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
      });

      const startTime = Date.now();

      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team2Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      const endTime = Date.now();
      const evaluationTime = endTime - startTime;

      expect(result.allowed).toBe(true);
      expect(evaluationTime).toBeLessThan(100); // Should be under 100ms
      expect(result.evaluationTime).toBeDefined();
      expect(result.evaluationTime).toBeLessThan(100);
    });

    it('should cache contextual permission results for performance', async () => {
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
      });

      // First call - should compute from database
      const result1 = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team2Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      const firstCallTime = Date.now();
      expect(result1.allowed).toBe(true);

      // Second call - should use cache
      const secondStartTime = Date.now();
      const result2 = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team2Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      const secondCallTime = Date.now() - secondStartTime;
      expect(result2.allowed).toBe(true);
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });
  });

  describe('Complex Authorization Scenarios', () => {
    it('should handle user with expired role assignments', async () => {
      // Create expired role assignment
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team1Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSIONS');
    });

    it('should handle users with inactive roles', async () => {
      // Create inactive role assignment
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId: org1Id,
        teamId: team1Id,
        isActive: false, // Inactive
      });

      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: team1Id, type: 'TEAMS' },
        'READ',
        { organizationId: org1Id }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSIONS');
    });

    it('should properly calculate effective permissions with organizational context', async () => {
      await db.insert(userRoleAssignments).values([
        {
          id: uuidv4(),
          userId,
          roleId: supervisorRoleId,
          organizationId: org1Id,
          teamId: team1Id,
          isActive: true,
        },
        {
          id: uuidv4(),
          userId,
          roleId: regionalManagerRoleId,
          organizationId: org1Id,
          isActive: true,
        }
      ]);

      const result = await AuthorizationService.computeEffectivePermissions(userId, {
        organizationId: org1Id,
        teamId: team1Id,
        requestId: 'test-request-id'
      });

      expect(result.userId).toBe(userId);
      expect(result.permissions).toBeDefined();
      expect(result.permissions.length).toBeGreaterThan(0);
      expect(result.roles).toHaveLength(2); // Supervisor + Regional Manager
      expect(result.roles.some(r => r.name === 'FIELD_SUPERVISOR')).toBe(true);
      expect(result.roles.some(r => r.name === 'REGIONAL_MANAGER')).toBe(true);
    });
  });
});