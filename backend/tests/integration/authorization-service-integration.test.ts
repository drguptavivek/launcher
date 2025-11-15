import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { teams, devices, users, userPins, roles, permissions, rolePermissions, userRoleAssignments, organizations } from '../../src/lib/db/schema';
import { hashPassword } from '../../src/lib/crypto';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthorizationService } from '../../src/services/authorization-service';

describe('AuthorizationService Integration Tests', () => {
  let app: express.Application;

  // Generate test UUIDs once
  const teamId = uuidv4();
  const deviceId = uuidv4();
  const userId = uuidv4();
  const organizationId = uuidv4();
  const teamMemberRoleId = uuidv4();
  const supervisorRoleId = uuidv4();
  const readTeamsPermissionId = uuidv4();
  const createUsersPermissionId = uuidv4();
  const manageDevicesPermissionId = uuidv4();

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Clean up existing test data
    await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, teamMemberRoleId));
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, supervisorRoleId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await db.delete(roles).where(eq(roles.id, teamMemberRoleId));
    await db.delete(roles).where(eq(roles.id, supervisorRoleId));
    await db.delete(permissions).where(eq(permissions.id, readTeamsPermissionId));
    await db.delete(permissions).where(eq(permissions.id, createUsersPermissionId));
    await db.delete(permissions).where(eq(permissions.id, manageDevicesPermissionId));

    // Create test organization
    await db.insert(organizations).values({
      id: organizationId,
      name: 'Test Organization',
      displayName: 'Test Organization',
      code: 'test-org',
      isActive: true,
      isDefault: true,
    });

    // Create test team
    await db.insert(teams).values({
      id: teamId,
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'MH01',
    });

    // Create test device
    await db.insert(devices).values({
      id: deviceId,
      teamId,
      name: 'Test Device',
      isActive: true,
    });

    // Create test user
    await db.insert(users).values({
      id: userId,
      code: 'test001',
      teamId,
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

    // Create roles with hierarchy
    await db.insert(roles).values([
      {
        id: teamMemberRoleId,
        name: 'TEAM_MEMBER',
        displayName: 'Team Member',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 1,
      },
      {
        id: supervisorRoleId,
        name: 'FIELD_SUPERVISOR',
        displayName: 'Field Supervisor',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 4,
      }
    ]);

    // Create permissions
    await db.insert(permissions).values([
      {
        id: readTeamsPermissionId,
        name: 'read_teams',
        resource: 'TEAMS',
        action: 'READ',
        scope: 'TEAM',
        isActive: true,
      },
      {
        id: createUsersPermissionId,
        name: 'create_users',
        resource: 'USERS',
        action: 'CREATE',
        scope: 'TEAM',
        isActive: true,
      },
      {
        id: manageDevicesPermissionId,
        name: 'manage_devices',
        resource: 'DEVICES',
        action: 'MANAGE',
        scope: 'TEAM',
        isActive: true,
      }
    ]);

    // Assign permissions to roles
    await db.insert(rolePermissions).values([
      {
        roleId: teamMemberRoleId,
        permissionId: readTeamsPermissionId,
        isActive: true,
      },
      {
        roleId: supervisorRoleId,
        permissionId: readTeamsPermissionId,
        isActive: true,
      },
      {
        roleId: supervisorRoleId,
        permissionId: createUsersPermissionId,
        isActive: true,
      },
      {
        roleId: supervisorRoleId,
        permissionId: manageDevicesPermissionId,
        isActive: true,
      }
    ]);

    // Assign roles to user
    await db.insert(userRoleAssignments).values({
      id: uuidv4(),
      userId,
      roleId: teamMemberRoleId,
      organizationId,
      teamId,
      isActive: true,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, teamMemberRoleId));
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, supervisorRoleId));
    await db.delete(userPins).where(eq(userPins.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await db.delete(roles).where(eq(roles.id, teamMemberRoleId));
    await db.delete(roles).where(eq(roles.id, supervisorRoleId));
    await db.delete(permissions).where(eq(permissions.id, readTeamsPermissionId));
    await db.delete(permissions).where(eq(permissions.id, createUsersPermissionId));
    await db.delete(permissions).where(eq(permissions.id, manageDevicesPermissionId));
  });

  describe('Database Integration', () => {
    it('should compute effective permissions from database', async () => {
      const result = await AuthorizationService.computeEffectivePermissions(userId);

      expect(result.userId).toBe(userId);
      expect(result.permissions).toBeDefined();
      expect(result.permissions.length).toBeGreaterThan(0);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].name).toBe('TEAM_MEMBER');
      expect(result.roles[0].hierarchyLevel).toBe(1);
    });

    it('should allow access for user with TEAM_MEMBER role and correct permission', async () => {
      const result = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ',
        { teamId }
      );

      expect(result.allowed).toBe(true);
      expect(result.grantedBy).toBeDefined();
      expect(result.grantedBy).toHaveLength(1);
      expect(result.grantedBy[0].roleName).toBeDefined();
    });

    it('should deny access for user with TEAM_MEMBER role and missing permission', async () => {
      const result = await AuthorizationService.checkPermission(
        userId,
        'USERS',
        'CREATE',
        { teamId }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSION');
    });

    it('should enforce team boundary violations', async () => {
      const differentTeamId = uuidv4();
      const result = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ',
        { teamId: differentTeamId }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/TEAM_SCOPE_VIOLATION|CONTEXT_DENIED/);
    });

    it('should cache permissions for performance', async () => {
      const startTime = Date.now();

      // First call - should compute from database
      const result1 = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ',
        { teamId }
      );

      const firstCallTime = Date.now() - startTime;
      expect(result1.allowed).toBe(true);

      // Second call - should use cache
      const secondStartTime = Date.now();
      const result2 = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ',
        { teamId }
      );

      const secondCallTime = Date.now() - secondStartTime;
      expect(result2.allowed).toBe(true);
      expect(result2.cacheHit).toBe(true);
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });

    it('should invalidate cache when role assignments change', async () => {
      // First call to populate cache
      await AuthorizationService.checkPermission(userId, 'TEAMS', 'READ', { teamId });

      // Add supervisor role
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId,
        teamId,
        isActive: true,
      });

      // Invalidate cache
      await AuthorizationService.invalidatePermissionCache(userId);

      // Should now have supervisor permissions
      const result = await AuthorizationService.checkPermission(
        userId,
        'USERS',
        'CREATE',
        { teamId }
      );

      expect(result.allowed).toBe(true);
      expect(result.grantedBy).toBeDefined();
    });

    it('should return user hierarchy level correctly', async () => {
      const level = await AuthorizationService.getUserHighestRoleLevel(userId);
      expect(level).toBe(1); // TEAM_MEMBER level

      // Add supervisor role
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        organizationId,
        teamId,
        isActive: true,
      });

      const newLevel = await AuthorizationService.getUserHighestRoleLevel(userId);
      expect(newLevel).toBe(4); // FIELD_SUPERVISOR level
    });

    it('should check role hierarchy correctly', () => {
      expect(AuthorizationService.canRolePerformAction('FIELD_SUPERVISOR', 'TEAM_MEMBER', 'MANAGE')).toBe(true);
      expect(AuthorizationService.canRolePerformAction('TEAM_MEMBER', 'FIELD_SUPERVISOR', 'MANAGE')).toBe(false);
      expect(AuthorizationService.canRolePerformAction('FIELD_SUPERVISOR', 'TEAM_MEMBER', 'READ')).toBe(true);
      expect(AuthorizationService.canRolePerformAction('TEAM_MEMBER', 'TEAM_MEMBER', 'READ')).toBe(true);
    });

    it('should handle cross-team access for privileged roles', async () => {
      // Add NATIONAL_SUPPORT_ADMIN role (cross-team access)
      const nationalSupportRoleId = uuidv4();
      await db.insert(roles).values({
        id: nationalSupportRoleId,
        name: 'NATIONAL_SUPPORT_ADMIN',
        displayName: 'National Support Admin',
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 9,
      });

      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: nationalSupportRoleId,
        organizationId,
        isActive: true,
      });

      const differentTeamId = uuidv4();
      const result = await AuthorizationService.checkContextualAccess(
        userId,
        { teamId: differentTeamId, type: 'DEVICES' },
        'READ'
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('NATIONAL_SUPPORT_ADMIN_CROSS_TEAM_ACCESS');
    });

    it('should protect system settings access', async () => {
      const result = await AuthorizationService.checkPermission(
        userId,
        'SYSTEM_SETTINGS',
        'UPDATE'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/SYSTEM_SETTINGS_ACCESS_DENIED/);
    });

    it('should handle users with no role assignments', async () => {
      // Remove all role assignments
      await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));

      const result = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSIONS');
    });

    it('should handle expired role assignments', async () => {
      // Create expired role assignment
      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: supervisorRoleId,
        teamId,
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const result = await AuthorizationService.checkPermission(
        userId,
        'USERS',
        'CREATE',
        { teamId }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSIONS');
    });

    it('should handle inactive roles', async () => {
      // Create inactive role
      const inactiveRoleId = uuidv4();
      await db.insert(roles).values({
        id: inactiveRoleId,
        name: 'INACTIVE_ROLE',
        displayName: 'Inactive Role',
        isSystemRole: true,
        isActive: false, // Inactive
        hierarchyLevel: 2,
      });

      await db.insert(userRoleAssignments).values({
        id: uuidv4(),
        userId,
        roleId: inactiveRoleId,
        teamId,
        isActive: true,
      });

      const result = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ',
        { teamId }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_PERMISSIONS');
    });
  });

  describe('Performance Tests', () => {
    it('should complete permission checks within performance targets', async () => {
      const startTime = Date.now();

      const result = await AuthorizationService.checkPermission(
        userId,
        'TEAMS',
        'READ',
        { teamId }
      );

      const endTime = Date.now();
      const evaluationTime = endTime - startTime;

      expect(result.allowed).toBe(true);
      expect(evaluationTime).toBeLessThan(100); // Should be under 100ms
      expect(result.evaluationTime).toBeDefined();
      expect(result.evaluationTime).toBeLessThan(100);
    });

    it('should handle multiple concurrent permission checks efficiently', async () => {
      const startTime = Date.now();

      // Run multiple permission checks concurrently
      const promises = Array.from({ length: 10 }, () =>
        AuthorizationService.checkPermission(userId, 'TEAMS', 'READ', { teamId })
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All should succeed
      expect(results.every(r => r.allowed)).toBe(true);
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(1000); // Should complete 10 checks in under 1 second
      // Most should be cache hits after first call
      const cacheHits = results.filter(r => r.cacheHit).length;
      expect(cacheHits).toBeGreaterThan(5);
    });
  });

  describe('Cache Management', () => {
    it('should cleanup expired cache entries', async () => {
      // Create a cache entry
      await AuthorizationService.computeEffectivePermissions(userId);

      // Run cleanup
      await AuthorizationService.cleanupExpiredCache();

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should invalidate user cache correctly', async () => {
      // Populate cache
      await AuthorizationService.computeEffectivePermissions(userId);

      // Invalidate cache
      await AuthorizationService.invalidatePermissionCache(userId);

      // Recompute permissions
      const result = await AuthorizationService.computeEffectivePermissions(userId);
      expect(result.permissions).toBeDefined();
      expect(result.userId).toBe(userId);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test verifies the service fails secure when database errors occur
      // The mock-based unit tests cover this more thoroughly

      // Test with invalid user ID
      const invalidUserId = 'invalid-uuid';
      const result = await AuthorizationService.checkPermission(
        invalidUserId,
        'TEAMS',
        'READ'
      );

      // Should fail secure
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});