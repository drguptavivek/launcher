import { db, roles, permissions, rolePermissions, userRoleAssignments, users, teams, permissionCache } from '../lib/db';
import { projectPermissionService } from './project-permission-service';
import { logger } from '../lib/logger';
import {
  Role,
  Permission,
  UserRoleAssignment,
  PermissionCache,
  userRoleEnum,
  permissionScopeEnum,
  permissionActionEnum,
  resourceTypeEnum
} from '../lib/db/schema';
import {
  eq,
  and,
  or,
  inArray,
  isNull,
  not,
  lt,
  gt,
  desc,
  asc,
  sql
} from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// ===== INTERFACES & TYPES =====

/**
 * Permission check context for boundary validation
 */
export interface PermissionContext {
  teamId?: string;
  regionId?: string;
  organizationId?: string;
  resourceId?: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Resolved permission with metadata
 */
export interface ResolvedPermission {
  id: string;
  resource: string;
  action: string;
  scope: string;
  conditions?: Record<string, any>;
  inheritedFrom?: string; // Role ID that granted this permission
  isCrossTeam: boolean;
  expiresAt?: Date;
}

/**
 * User effective permissions result
 */
export interface EffectivePermissions {
  userId: string;
  permissions: ResolvedPermission[];
  computedAt: Date;
  expiresAt: Date;
  version: number;
  roles: Array<{
    id: string;
    name: string;
    hierarchyLevel: number;
    teamId?: string;
    regionId?: string;
  }>;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: string;
  grantedBy?: Array<{
    roleId: string;
    roleName: string;
    permissionId: string;
  }>;
  cacheHit?: boolean;
  evaluationTime?: number;
}

/**
 * Role hierarchy mapping for inheritance
 */
interface RoleHierarchy {
  [key: string]: {
    level: number;
    inherits?: string[];
  };
}

/**
 * Cache entry for resolved permissions
 */
interface PermissionCacheEntry {
  permissions: ResolvedPermission[];
  computedAt: Date;
  expiresAt: Date;
  version: number;
  roles: string[];
}

/**
 * Access control evaluation context
 */
export interface AccessEvaluationContext {
  user: {
    id: string;
    teamId: string;
    role?: string;
    isActive: boolean;
  };
  resource: {
    type: string;
    id?: string;
    teamId?: string;
    regionId?: string;
    organizationId?: string;
  };
  action: string;
  context: PermissionContext;
}

// ===== AUTHORIZATION SERVICE =====

/**
 * Enhanced Authorization Service for SurveyLauncher RBAC System
 *
 * Features:
 * - Dynamic permission resolution from database
 * - Permission caching with TTL (<100ms target)
 * - Role hierarchy and inheritance support
 * - Context-aware access control (team, region, organization boundaries)
 * - Special handling for NATIONAL_SUPPORT_ADMIN cross-team access
 * - System settings protection (SYSTEM_SETTINGS resource)
 * - Comprehensive audit logging
 */
export class AuthorizationService {
  // Cache TTL: 5 minutes for permission cache
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;

  // System settings protection flag
  private static readonly SYSTEM_SETTINGS_RESOURCE = 'SYSTEM_SETTINGS';

  // Cross-team access roles
  private static readonly CROSS_TEAM_ROLES = [
    'NATIONAL_SUPPORT_ADMIN',
    'SYSTEM_ADMIN',
    'AUDITOR'
  ];

  // Role hierarchy definition
  private static readonly ROLE_HIERARCHY: RoleHierarchy = {
    'TEAM_MEMBER': { level: 1 },
    'SUPPORT_AGENT': { level: 2, inherits: ['TEAM_MEMBER'] },
    'DEVICE_MANAGER': { level: 3, inherits: ['TEAM_MEMBER'] },
    'FIELD_SUPERVISOR': { level: 4, inherits: ['TEAM_MEMBER'] },
    'POLICY_ADMIN': { level: 5, inherits: ['FIELD_SUPERVISOR'] },
    'REGIONAL_MANAGER': { level: 6, inherits: ['FIELD_SUPERVISOR', 'POLICY_ADMIN'] },
    'SYSTEM_ADMIN': { level: 7, inherits: ['REGIONAL_MANAGER', 'POLICY_ADMIN'] },
    'AUDITOR': { level: 8, inherits: ['SYSTEM_ADMIN'] },
    'NATIONAL_SUPPORT_ADMIN': { level: 9, inherits: ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'] }
  };

  // In-memory permission cache (fallback)
  private static memoryCache: Map<string, PermissionCacheEntry> = new Map();

  // Simple lock mechanism for concurrent access protection
  private static computeLocks: Map<string, Promise<EffectivePermissions>> = new Map();

  /**
   * Core permission checking method with caching and context validation
   */
  static async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: PermissionContext
  ): Promise<PermissionCheckResult> {
    const startTime = Date.now();
    const requestId = context?.requestId || uuidv4();

    try {
      logger.info('Permission check initiated', {
        userId,
        resource,
        action,
        requestId,
        context
      });

      // Special protection for SYSTEM_SETTINGS resource
      if (resource === this.SYSTEM_SETTINGS_RESOURCE) {
        return this.checkSystemSettingsAccess(userId, action, context, requestId);
      }

      // Special handling for PROJECTS resource
      if (resource === 'PROJECTS') {
        return this.checkProjectsAccess(userId, action, context, requestId);
      }

      // Try cache first
      const cachedResult = await this.checkCachedPermission(userId, resource, action, context);
      if (cachedResult) {
        logger.info('Permission cache hit', {
          userId,
          resource,
          action,
          allowed: cachedResult.allowed,
          requestId,
          evaluationTime: Date.now() - startTime
        });

        return {
          ...cachedResult,
          cacheHit: true,
          evaluationTime: Date.now() - startTime
        };
      }

      // Compute effective permissions
      const effectivePermissions = await this.computeEffectivePermissions(userId, context);
      if (!effectivePermissions.permissions || effectivePermissions.permissions.length === 0) {
        logger.warn('No effective permissions found for user', {
          userId,
          resource,
          action,
          requestId
        });

        return {
          allowed: false,
          reason: 'NO_PERMISSIONS',
          evaluationTime: Date.now() - startTime
        };
      }

      // Check permissions with context validation
      const permissionResult = await this.evaluatePermissions(
        effectivePermissions.permissions,
        resource,
        action,
        context
      );

      // Cache the result for faster future checks
      await this.cachePermissionResult(userId, resource, action, permissionResult, context);

      const evaluationTime = Date.now() - startTime;

      // Comprehensive audit logging
      logger.info('Permission evaluated', {
        auditAction: 'permission.check',
        userId,
        resource,
        action,
        allowed: permissionResult.allowed,
        reason: permissionResult.reason,
        grantedBy: permissionResult.grantedBy,
        evaluationTime,
        requestId,
        context
      });

      return {
        ...permissionResult,
        cacheHit: false,
        evaluationTime
      };

    } catch (error) {
      logger.error('Permission check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        resource,
        action,
        requestId,
        evaluationTime: Date.now() - startTime
      });

      // Fail secure: deny access on errors
      return {
        allowed: false,
        reason: 'SYSTEM_ERROR',
        evaluationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Compute user's effective permissions with role inheritance
   */
  static async computeEffectivePermissions(
    userId: string,
    context?: PermissionContext
  ): Promise<EffectivePermissions> {
    const startTime = Date.now();

    try {
      // Check permission cache first
      const cachedPermissions = await this.getCachedPermissions(userId);
      if (cachedPermissions && cachedPermissions.expiresAt > new Date()) {
        logger.debug('Using cached effective permissions', {
          userId,
          permissionCount: cachedPermissions.permissions.length,
          expiresAt: cachedPermissions.expiresAt
        });
        return cachedPermissions;
      }

      // Use lock mechanism to prevent concurrent computation
      const lockKey = `compute-permissions:${userId}`;

      if (this.computeLocks.has(lockKey)) {
        // Wait for existing computation to complete
        return this.computeLocks.get(lockKey)!;
      }

      // Start computation with lock
      const computation = this.doComputeEffectivePermissions(userId, context);
      this.computeLocks.set(lockKey, computation);

      try {
        const result = await computation;
        return result;
      } finally {
        // Remove lock after computation
        this.computeLocks.delete(lockKey);
      }
    } catch (error) {
      logger.error('Failed to compute effective permissions', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        computationTime: Date.now() - startTime
      });

      return this.createEmptyEffectivePermissions(userId);
    }
  }

  /**
   * Actual computation method (extracted for locking)
   */
  private static async doComputeEffectivePermissions(
    userId: string,
    context?: PermissionContext
  ): Promise<EffectivePermissions> {
    const startTime = Date.now();

    try {
      // Get user's role assignments
      const roleAssignments = await this.getUserRoleAssignments(userId);
      if (!roleAssignments || roleAssignments.length === 0) {
        logger.info('No role assignments found for user', { userId });
        return this.createEmptyEffectivePermissions(userId);
      }

      // Resolve roles with hierarchy
      const resolvedRoles = await this.resolveRolesWithHierarchy(roleAssignments, context);

      // Get permissions for all resolved roles
      const allPermissions = await this.getPermissionsForRoles(resolvedRoles.map(r => r.id));

      // Apply role inheritance and deduplicate
      const effectivePermissions = await this.applyRoleInheritance(
        allPermissions,
        resolvedRoles,
        context
      );

      // Cache the computed permissions
      const effectivePermissionsResult: EffectivePermissions = {
        userId,
        permissions: effectivePermissions,
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + this.CACHE_TTL_MS),
        version: await this.getPermissionCacheVersion(userId),
        roles: resolvedRoles.map(role => ({
          id: role.id,
          name: role.name,
          hierarchyLevel: role.hierarchyLevel
        }))
      };

      await this.cacheEffectivePermissions(userId, effectivePermissionsResult);

      logger.info('Effective permissions computed', {
        userId,
        permissionCount: effectivePermissions.length,
        roleCount: resolvedRoles.length,
        computationTime: Date.now() - startTime
      });

      return effectivePermissionsResult;

    } catch (error) {
      logger.error('Failed to compute effective permissions', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        computationTime: Date.now() - startTime
      });

      return this.createEmptyEffectivePermissions(userId);
    }
  }

  /**
   * Check contextual access boundaries (team, region, organization)
   */
  static async checkContextualAccess(
    userId: string,
    targetResource: { teamId?: string; regionId?: string; organizationId?: string; type: string },
    action: string,
    context?: PermissionContext
  ): Promise<PermissionCheckResult> {
    try {
      const userRoles = await this.getUserRoleAssignments(userId);
      if (!userRoles || userRoles.length === 0) {
        return { allowed: false, reason: 'NO_ROLES' };
      }

      // Check if user has cross-team access roles
      const hasCrossTeamAccess = userRoles.some(assignment => {
        const role = assignment.role as Role;
        return this.CROSS_TEAM_ROLES.includes(role.name);
      });

      // Special handling for NATIONAL_SUPPORT_ADMIN
      const nationalSupportRoles = userRoles.filter(assignment => {
        const role = assignment.role as Role;
        return role.name === 'NATIONAL_SUPPORT_ADMIN';
      });

      if (nationalSupportRoles.length > 0) {
        // NATIONAL_SUPPORT_ADMIN can access operational resources across teams
        // but NOT system settings
        if (targetResource.type === this.SYSTEM_SETTINGS_RESOURCE) {
          logger.warn('NATIONAL_SUPPORT_ADMIN denied access to SYSTEM_SETTINGS', {
            userId,
            targetResource,
            action
          });
          return {
            allowed: false,
            reason: 'SYSTEM_SETTINGS_ACCESS_DENIED_NATIONAL_SUPPORT'
          };
        }

        return {
          allowed: true,
          reason: 'NATIONAL_SUPPORT_ADMIN_CROSS_TEAM_ACCESS'
        };
      }

      // For non-cross-team roles, enforce boundaries
      if (!hasCrossTeamAccess) {
        // Check team boundary
        if (targetResource.teamId) {
          const userTeamIds = userRoles
            .map(assignment => assignment.teamId)
            .filter((teamId): teamId is string => Boolean(teamId));

          if (userTeamIds.length === 0 || !userTeamIds.includes(targetResource.teamId)) {
            logger.warn('Team boundary violation', {
              userId,
              userTeamIds,
              targetTeamId: targetResource.teamId,
              action
            });
            return {
              allowed: false,
              reason: 'TEAM_BOUNDARY_VIOLATION'
            };
          }
        }

        // Check region boundary (if applicable)
        if (targetResource.regionId) {
          const userRegionIds = userRoles
            .map(assignment => assignment.regionId)
            .filter((regionId): regionId is string => Boolean(regionId));

          if (userRegionIds.length === 0 || !userRegionIds.includes(targetResource.regionId)) {
            logger.warn('Region boundary violation', {
              userId,
              userRegionIds,
              targetRegionId: targetResource.regionId,
              action
            });
            return {
              allowed: false,
              reason: 'REGION_BOUNDARY_VIOLATION'
            };
          }
        }
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Contextual access check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        targetResource,
        action
      });

      return {
        allowed: false,
        reason: 'CONTEXT_CHECK_ERROR'
      };
    }
  }

  /**
   * Invalidate permission cache for user
   */
  static async invalidatePermissionCache(userId: string): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.delete(userId);

      // Clear database cache
      await db.delete(permissionCache)
        .where(eq(permissionCache.userId, userId));

      // Increment cache version
      const maxVersionResult = await db.select({ max: permissionCache.version }).from(permissionCache).limit(1);
      const nextVersion = (maxVersionResult[0]?.max || 0) + 1;

      await db.update(permissionCache)
        .set({ version: nextVersion })
        .where(eq(permissionCache.userId, userId));

      logger.info('Permission cache invalidated', { userId });

    } catch (error) {
      logger.error('Failed to invalidate permission cache', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }
  }

  /**
   * Get inherited permissions through role hierarchy
   */
  static async getInheritedPermissions(
    userId: string,
    resource?: string
  ): Promise<ResolvedPermission[]> {
    try {
      const effectivePermissions = await this.computeEffectivePermissions(userId);

      if (!resource) {
        return effectivePermissions.permissions;
      }

      return effectivePermissions.permissions.filter(
        permission => permission.resource === resource
      );

    } catch (error) {
      logger.error('Failed to get inherited permissions', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        resource
      });
      return [];
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Check system settings access with special restrictions
   */
  private static async checkSystemSettingsAccess(
    userId: string,
    action: string,
    context?: PermissionContext,
    requestId?: string
  ): Promise<PermissionCheckResult> {
    try {
      // Only SYSTEM_ADMIN can access system settings
      const systemAdminRoles = await db
        .select({
          assignment: userRoleAssignments,
          role: roles
        })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.isActive, true),
          eq(roles.name, 'SYSTEM_ADMIN'),
          eq(roles.isActive, true),
          or(
            isNull(userRoleAssignments.expiresAt),
            gt(userRoleAssignments.expiresAt, new Date())
          )
        ));

      if (systemAdminRoles.length === 0) {
        logger.warn('System settings access denied - no SYSTEM_ADMIN role', {
          userId,
          action,
          requestId
        });

        return {
          allowed: false,
          reason: 'SYSTEM_SETTINGS_ACCESS_DENIED'
        };
      }

      // Additional validation for sensitive actions
      const restrictedActions = ['DELETE', 'MANAGE'];
      if (restrictedActions.includes(action)) {
        // Log sensitive system settings access attempts
        logger.warn('Sensitive system settings action attempted', {
          userId,
          action,
          requestId,
          context,
          requiresAudit: true
        });

        // Could add additional approval requirements here
      }

      return {
        allowed: true,
        grantedBy: systemAdminRoles.map(role => ({
          roleId: role.role.id,
          roleName: role.role.name,
          permissionId: 'system-admin-access'
        }))
      };

    } catch (error) {
      logger.error('System settings access check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        action,
        requestId
      });

      return {
        allowed: false,
        reason: 'SYSTEM_SETTINGS_CHECK_ERROR'
      };
    }
  }

  /**
   * Check PROJECTS resource access using ProjectPermissionService
   */
  private static async checkProjectsAccess(
    userId: string,
    action: string,
    context?: PermissionContext,
    requestId?: string
  ): Promise<PermissionCheckResult> {
    try {
      logger.info('PROJECTS resource access check', {
        userId,
        action,
        resourceId: context?.resourceId,
        requestId
      });

      // Delegate to ProjectPermissionService for project-specific logic
      const projectResult = await projectPermissionService.checkProjectPermission(
        userId,
        action,
        context?.resourceId, // Project ID if available
        {
          userId,
          userTeamId: context?.teamId,
          organizationId: context?.organizationId,
          action,
          deviceTeamId: context?.deviceId ? undefined : undefined, // Could be enhanced
          requestId
        }
      );

      // Convert ProjectPermissionCheckResult to PermissionCheckResult format
      const grantedBy = projectResult.grantedBy ? [{
        roleId: projectResult.grantedBy.id,
        roleName: projectResult.grantedBy.name,
        permissionId: 'projects-permission'
      }] : [];

      return {
        allowed: projectResult.allowed,
        reason: projectResult.reason,
        grantedBy,
        evaluationTime: Date.now(),
        requiredPermission: `PROJECTS.${action}`,
        cacheHit: false // Project permissions are handled separately from main cache
      };

    } catch (error) {
      logger.error('PROJECTS access check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        action,
        resourceId: context?.resourceId,
        requestId
      });

      return {
        allowed: false,
        reason: 'PROJECTS_CHECK_ERROR',
        requiredPermission: `PROJECTS.${action}`
      };
    }
  }

  /**
   * Check cached permission result
   */
  private static async checkCachedPermission(
    userId: string,
    resource: string,
    action: string,
    context?: PermissionContext
  ): Promise<PermissionCheckResult | null> {
    try {
      // Check memory cache first
      const cacheKey = `${userId}:${resource}:${action}:${context?.teamId || 'global'}`;
      const memoryEntry = this.memoryCache.get(cacheKey);

      if (memoryEntry && memoryEntry.expiresAt > new Date()) {
        // If cache contains empty permissions, it means no permissions were found
        if (!memoryEntry.permissions || memoryEntry.permissions.length === 0) {
          return {
            allowed: false,
            reason: 'NO_PERMISSIONS'
          };
        }

        const permission = memoryEntry.permissions.find(p =>
          p.resource === resource &&
          (p.action === action || p.action === 'MANAGE')
        );

        if (permission) {
          return {
            allowed: true,
            grantedBy: [{ roleId: permission.inheritedFrom || 'unknown', roleName: 'cached', permissionId: permission.id }]
          };
        }
      }

      return null;

    } catch (error) {
      logger.debug('Cache check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        resource,
        action
      });
      return null;
    }
  }

  /**
   * Get user's active role assignments
   */
  private static async getUserRoleAssignments(userId: string): Promise<Array<UserRoleAssignment & { role?: Role }>> {
    try {
      const assignments = await db
        .select({
          assignment: userRoleAssignments,
          role: roles,
          user: users,
          team: teams
        })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .innerJoin(users, eq(userRoleAssignments.userId, users.id))
        .leftJoin(teams, eq(userRoleAssignments.teamId, teams.id))
        .where(and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.isActive, true),
          eq(roles.isActive, true),
          eq(users.isActive, true),
          or(
            isNull(userRoleAssignments.expiresAt),
            gt(userRoleAssignments.expiresAt, new Date())
          )
        ));

      return assignments.map(item => ({
        ...item.assignment,
        role: item.role,
        user: item.user,
        team: item.team
      }));

    } catch (error) {
      logger.error('Failed to get user role assignments', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }

  /**
   * Resolve roles with hierarchy inheritance
   */
  private static async resolveRolesWithHierarchy(
    roleAssignments: Array<UserRoleAssignment & { role?: Role }>,
    context?: PermissionContext
  ): Promise<Role[]> {
    const resolvedRoles: Set<Role> = new Set();
    const processedRoles = new Set<string>();

    // Add directly assigned roles
    for (const assignment of roleAssignments) {
      if (assignment.role && !processedRoles.has(assignment.role.id)) {
        resolvedRoles.add(assignment.role);
        processedRoles.add(assignment.role.id);

        // Add inherited roles
        await this.addInheritedRoles(assignment.role, resolvedRoles, processedRoles);
      }
    }

    return Array.from(resolvedRoles);
  }

  /**
   * Recursively add inherited roles based on hierarchy
   */
  private static async addInheritedRoles(
    role: Role,
    resolvedRoles: Set<Role>,
    processedRoles: Set<string>
  ): Promise<void> {
    const hierarchyInfo = this.ROLE_HIERARCHY[role.name];
    if (!hierarchyInfo?.inherits) {
      return;
    }

    for (const inheritedRoleName of hierarchyInfo.inherits) {
      const inheritedRole = await db
        .select()
        .from(roles)
        .where(and(
          eq(roles.name, inheritedRoleName),
          eq(roles.isActive, true)
        ))
        .limit(1);

      if (inheritedRole.length > 0 && !processedRoles.has(inheritedRole[0].id)) {
        resolvedRoles.add(inheritedRole[0]);
        processedRoles.add(inheritedRole[0].id);

        // Recursively add further inherited roles
        await this.addInheritedRoles(inheritedRole[0], resolvedRoles, processedRoles);
      }
    }
  }

  /**
   * Get permissions for specified roles
   */
  private static async getPermissionsForRoles(roleIds: string[]): Promise<Array<Permission & { roleId?: string }>> {
    if (roleIds.length === 0) {
      return [];
    }

    try {
      const rolePermissionsResult = await db
        .select({
          permission: permissions,
          rolePermission: rolePermissions
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(and(
          inArray(rolePermissions.roleId, roleIds),
          eq(rolePermissions.isActive, true),
          eq(permissions.isActive, true)
        ));

      return rolePermissionsResult.map((item: any) => ({
        ...item.permission,
        roleId: item.rolePermission.roleId
      }));

    } catch (error) {
      logger.error('Failed to get permissions for roles', {
        error: error instanceof Error ? error.message : String(error),
        roleIds
      });
      return [];
    }
  }

  /**
   * Apply role inheritance and deduplicate permissions
   */
  private static async applyRoleInheritance(
    allPermissions: Array<Permission & { roleId?: string }>,
    resolvedRoles: Role[],
    context?: PermissionContext
  ): Promise<ResolvedPermission[]> {
    const permissionMap = new Map<string, ResolvedPermission>();

    for (const permission of allPermissions) {
      const role = resolvedRoles.find(r => r.id === permission.roleId);
      if (!role) {
        continue;
      }

      const key = `${permission.resource}:${permission.action}:${permission.scope}`;

      // Keep the highest level permission (highest hierarchy level wins)
      const existingPermission = permissionMap.get(key);
      if (!existingPermission || role.hierarchyLevel > 0) {
        permissionMap.set(key, {
          id: permission.id,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          conditions: permission.conditions as Record<string, any>,
          inheritedFrom: role.id,
          isCrossTeam: this.CROSS_TEAM_ROLES.includes(role.name),
          expiresAt: undefined
        });
      }
    }

    return Array.from(permissionMap.values());
  }

  /**
   * Evaluate permissions against resource and action with context
   */
  private static async evaluatePermissions(
    permissions: ResolvedPermission[],
    resource: string,
    action: string,
    context?: PermissionContext
  ): Promise<PermissionCheckResult> {
    // Find exact matches
    const exactMatches = permissions.filter(p =>
      p.resource === resource && p.action === action
    );

    // Find manage permissions (grant all actions)
    const managePermissions = permissions.filter(p =>
      p.resource === resource && p.action === 'MANAGE'
    );

    // Combine and prioritize exact matches over manage
    const applicablePermissions = [...exactMatches, ...managePermissions];

    if (applicablePermissions.length === 0) {
      return {
        allowed: false,
        reason: 'NO_PERMISSION'
      };
    }

    // Evaluate conditions and boundaries for each applicable permission
    for (const permission of applicablePermissions) {
      const contextResult = await this.evaluatePermissionContext(
        permission,
        resource,
        action,
        context
      );

      if (contextResult.allowed) {
        return {
          allowed: true,
          grantedBy: [{
            roleId: permission.inheritedFrom || 'unknown',
            roleName: 'resolved',
            permissionId: permission.id
          }],
          context: {
            permissions: applicablePermissions
          }
        };
      }
    }

    return {
      allowed: false,
      reason: 'CONTEXT_DENIED'
    };
  }

  /**
   * Evaluate permission context and conditions
   */
  private static async evaluatePermissionContext(
    permission: ResolvedPermission,
    resource: string,
    action: string,
    context?: PermissionContext
  ): Promise<PermissionCheckResult> {
    // Check scope-based access
    if (permission.scope === 'USER' && context?.userId) {
      // User scope - can only access own resources
      if (permission.isCrossTeam || context.userId === context.userId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'USER_SCOPE_VIOLATION' };
    }

    if (permission.scope === 'TEAM' && context?.teamId) {
      // Team scope - can access team resources
      if (permission.isCrossTeam || context.teamId === context.teamId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'TEAM_SCOPE_VIOLATION' };
    }

    if (permission.scope === 'REGION' && context?.regionId) {
      // Region scope - can access regional resources
      if (permission.isCrossTeam || context.regionId === context.regionId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'REGION_SCOPE_VIOLATION' };
    }

    if (permission.scope === 'ORGANIZATION' || permission.scope === 'SYSTEM') {
      // Organization/System scope - full access within scope
      return { allowed: true };
    }

    // Evaluate additional conditions if present
    if (permission.conditions) {
      return this.evaluatePermissionConditions(permission.conditions, context);
    }

    return { allowed: true };
  }

  /**
   * Evaluate permission conditions
   */
  private static evaluatePermissionConditions(
    conditions: Record<string, any>,
    context?: PermissionContext
  ): PermissionCheckResult {
    // Temporal conditions
    if (conditions.timeWindow) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = conditions.timeWindow.start || 0;
      const endTime = conditions.timeWindow.end || 1439; // 23:59

      if (currentTime < startTime || currentTime > endTime) {
        return { allowed: false, reason: 'TIME_WINDOW_VIOLATION' };
      }
    }

    // Day of week conditions
    if (conditions.allowedDays && conditions.allowedDays.length > 0) {
      const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      if (!conditions.allowedDays.includes(currentDay)) {
        return { allowed: false, reason: 'DAY_OF_WEEK_VIOLATION' };
      }
    }

    // IP restrictions
    if (conditions.allowedIPs && conditions.allowedIPs.length > 0) {
      if (!context?.ipAddress || !conditions.allowedIPs.includes(context.ipAddress)) {
        return { allowed: false, reason: 'IP_RESTRICTION_VIOLATION' };
      }
    }

    return { allowed: true };
  }

  /**
   * Get cached permissions from database
   */
  private static async getCachedPermissions(userId: string): Promise<EffectivePermissions | null> {
    try {
      const cached = await db
        .select()
        .from(permissionCache)
        .where(and(
          eq(permissionCache.userId, userId),
          gt(permissionCache.expiresAt, new Date())
        ))
        .limit(1);

      if (cached.length > 0) {
        const cacheEntry = cached[0];
        return {
          userId,
          permissions: cacheEntry.effectivePermissions as ResolvedPermission[],
          computedAt: cacheEntry.computedAt,
          expiresAt: cacheEntry.expiresAt,
          version: cacheEntry.version,
          roles: [] // Roles are cached separately or recomputed
        };
      }

      return null;

    } catch (error) {
      logger.debug('Failed to get cached permissions', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return null;
    }
  }

  /**
   * Cache effective permissions in database
   */
  private static async cacheEffectivePermissions(
    userId: string,
    effectivePermissions: EffectivePermissions
  ): Promise<void> {
    try {
      await db.insert(permissionCache)
        .values({
          userId,
          effectivePermissions: JSON.parse(JSON.stringify(effectivePermissions.permissions)),
          computedAt: effectivePermissions.computedAt,
          expiresAt: effectivePermissions.expiresAt,
          version: effectivePermissions.version
        })
        .onConflictDoUpdate({
          target: permissionCache.userId,
          set: {
            effectivePermissions: JSON.parse(JSON.stringify(effectivePermissions.permissions)),
            computedAt: effectivePermissions.computedAt,
            expiresAt: effectivePermissions.expiresAt,
            version: effectivePermissions.version
          }
        });

    } catch (error) {
      logger.error('Failed to cache effective permissions', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }
  }

  /**
   * Cache individual permission check result
   */
  private static async cachePermissionResult(
    userId: string,
    resource: string,
    action: string,
    result: PermissionCheckResult,
    context?: PermissionContext
  ): Promise<void> {
    try {
      const cacheKey = `${userId}:${resource}:${action}:${context?.teamId || 'global'}`;
      const cacheEntry: PermissionCacheEntry = {
        permissions: result.allowed ? [{
          id: uuidv4(),
          resource,
          action,
          scope: 'CACHED',
          isCrossTeam: false
        }] : [],
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + this.CACHE_TTL_MS / 10), // Shorter cache for individual checks
        version: 1,
        roles: []
      };

      this.memoryCache.set(cacheKey, cacheEntry);

    } catch (error) {
      logger.debug('Failed to cache permission result', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        resource,
        action
      });
    }
  }

  /**
   * Get current permission cache version for user
   */
  private static async getPermissionCacheVersion(userId: string): Promise<number> {
    try {
      const cacheEntry = await db
        .select({ version: permissionCache.version })
        .from(permissionCache)
        .where(eq(permissionCache.userId, userId))
        .limit(1);

      return cacheEntry.length > 0 ? cacheEntry[0].version + 1 : 1;

    } catch (error) {
      return 1;
    }
  }

  /**
   * Create empty effective permissions result
   */
  private static createEmptyEffectivePermissions(userId: string): EffectivePermissions {
    return {
      userId,
      permissions: [],
      computedAt: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_TTL_MS),
      version: 1,
      roles: []
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if user has any of the specified roles
   */
  static async hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      const assignments = await db
        .select({
          assignment: userRoleAssignments,
          role: roles
        })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .where(and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.isActive, true),
          eq(roles.isActive, true),
          inArray(roles.name, roleNames),
          or(
            isNull(userRoleAssignments.expiresAt),
            gt(userRoleAssignments.expiresAt, new Date())
          )
        ));

      return assignments.length > 0;

    } catch (error) {
      logger.error('Failed to check user roles', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        roleNames
      });
      return false;
    }
  }

  /**
   * Get user's highest role hierarchy level
   */
  static async getUserHighestRoleLevel(userId: string): Promise<number> {
    try {
      const assignments = await this.getUserRoleAssignments(userId);
      let highestLevel = 0;

      for (const assignment of assignments) {
        if (assignment.role) {
          const hierarchyInfo = this.ROLE_HIERARCHY[assignment.role.name];
          if (hierarchyInfo && hierarchyInfo.level > highestLevel) {
            highestLevel = hierarchyInfo.level;
          }
        }
      }

      return highestLevel;

    } catch (error) {
      logger.error('Failed to get user highest role level', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return 0;
    }
  }

  /**
   * Check if role can perform action based on hierarchy
   */
  static canRolePerformAction(roleName: string, targetRoleName: string, action: string): boolean {
    const roleHierarchy = this.ROLE_HIERARCHY[roleName];
    const targetHierarchy = this.ROLE_HIERARCHY[targetRoleName];

    if (!roleHierarchy || !targetHierarchy) {
      return false;
    }

    // Higher level roles can manage lower level roles
    if (action === 'MANAGE') {
      return roleHierarchy.level > targetHierarchy.level;
    }

    // Same level roles can perform read/list actions
    if (['READ', 'LIST'].includes(action)) {
      return roleHierarchy.level >= targetHierarchy.level;
    }

    return roleHierarchy.level >= targetHierarchy.level;
  }

  /**
   * Clean up expired cache entries
   */
  static async cleanupExpiredCache(): Promise<void> {
    try {
      // Clean database cache
      await db.delete(permissionCache)
        .where(lt(permissionCache.expiresAt, new Date()));

      // Clean memory cache
      const now = new Date();
      this.memoryCache.forEach((entry, key) => {
        if (entry.expiresAt < now) {
          this.memoryCache.delete(key);
        }
      });

      // Clean expired compute locks
      this.computeLocks.forEach((computation, key) => {
        // Check if computation has been running too long (timeout)
        const lockStart = new Date();
        lockStart.setMinutes(lockStart.getMinutes() - 10); // 10 minute timeout
        if (lockStart < now) {
          this.computeLocks.delete(key);
        }
      });

      logger.info('Permission cache cleanup completed');

    } catch (error) {
      logger.error('Cache cleanup failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Export default for convenience
export default AuthorizationService;