import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebAdminAuthService } from '../../src/services/web-admin-auth-service';
import { db } from '../../src/lib/db';
import { webAdminUsers } from '../../src/lib/db/schema';
import { eq, like } from 'drizzle-orm';

describe('WebAdminAuthService - Role Validation', () => {
  let authService: WebAdminAuthService;
  const testEmailPrefix = 'test-role-validation';

  beforeEach(async () => {
    authService = new WebAdminAuthService();
    // Clean up any test data from previous runs
    await db.delete(webAdminUsers).where(like(webAdminUsers.email, `%${testEmailPrefix}%`));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(webAdminUsers).where(like(webAdminUsers.email, `%${testEmailPrefix}%`));
  });

  describe('TEAM_MEMBER role restrictions', () => {
    it('should reject login attempts for TEAM_MEMBER role', async () => {
      // Attempt to create a web admin user with TEAM_MEMBER role
      const result = await authService.createWebAdminUser({
        email: `${testEmailPrefix}-team-member@example.com`,
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'TEAM_MEMBER'
      });

      // Creation should fail due to role validation
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    it('should allow creation of valid web admin roles', async () => {
      const result = await authService.createWebAdminUser({
        email: `${testEmailPrefix}-admin@example.com`,
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'SYSTEM_ADMIN'
      });

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('SYSTEM_ADMIN');
    });

    it('should allow creation of hybrid roles (FIELD_SUPERVISOR, REGIONAL_MANAGER)', async () => {
      // Test FIELD_SUPERVISOR
      const supervisorResult = await authService.createWebAdminUser({
        email: `${testEmailPrefix}-supervisor@example.com`,
        password: 'testpassword123',
        firstName: 'Field',
        lastName: 'Supervisor',
        role: 'FIELD_SUPERVISOR'
      });

      expect(supervisorResult.success).toBe(true);
      expect(supervisorResult.user?.role).toBe('FIELD_SUPERVISOR');

      // Test REGIONAL_MANAGER
      const managerResult = await authService.createWebAdminUser({
        email: `${testEmailPrefix}-manager@example.com`,
        password: 'testpassword123',
        firstName: 'Regional',
        lastName: 'Manager',
        role: 'REGIONAL_MANAGER'
      });

      expect(managerResult.success).toBe(true);
      expect(managerResult.user?.role).toBe('REGIONAL_MANAGER');
    });

    it('should allow creation of all web-admin only roles', async () => {
      const webOnlyRoles = [
        'SUPPORT_AGENT',
        'AUDITOR',
        'DEVICE_MANAGER',
        'POLICY_ADMIN',
        'NATIONAL_SUPPORT_ADMIN'
      ];

      for (const role of webOnlyRoles) {
        const result = await authService.createWebAdminUser({
          email: `${testEmailPrefix}-${role.toLowerCase()}@example.com`,
          password: 'testpassword123',
          firstName: 'Test',
          lastName: role.charAt(0) + role.slice(1).toLowerCase(),
          role: role
        });

        expect(result.success).toBe(true);
        expect(result.user?.role).toBe(role);
      }
    });

    it('should reject invalid role names', async () => {
      const invalidRoles = [
        'INVALID_ROLE',
        'ADMIN', // Old role name
        'SUPERVISOR', // Old role name
        'random_string'
      ];

      for (const role of invalidRoles) {
        const result = await authService.createWebAdminUser({
          email: `${testEmailPrefix}-invalid-${Date.now()}@example.com`,
          password: 'testpassword123',
          firstName: 'Test',
          lastName: 'User',
          role: role
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid role');
      }

      // Test empty string role explicitly
      const emptyRoleResult = await authService.createWebAdminUser({
        email: `${testEmailPrefix}-empty-${Date.now()}@example.com`,
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: ''
      });

      expect(emptyRoleResult.success).toBe(false);
      expect(emptyRoleResult.error).toContain('Role is required');
    });
  });
});