import { db, roles, permissions, rolePermissions, userRoleAssignments, users, teams } from '../lib/db';
import { logger } from '../lib/logger';
import {
  Role,
  NewRole,
  Permission,
  NewPermission,
  RolePermission,
  UserRoleAssignment,
  NewUserRoleAssignment
} from '../lib/db/schema';
import {
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  inArray,
  isNull,
  not
} from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Interfaces for role management
export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  isSystemRole?: boolean;
  hierarchyLevel?: number;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  isActive?: boolean;
  hierarchyLevel?: number;
  permissionIds?: string[];
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  organizationId: string;
  teamId?: string;
  regionId?: string;
  expiresAt?: Date;
  context?: Record<string, any>;
}

export interface RoleAssignmentOptions {
  assignedBy: string;
  teamId?: string;
  regionId?: string;
  expiresAt?: Date;
  context?: Record<string, any>;
}

export interface RoleResult {
  success: boolean;
  role?: Role;
  error?: {
    code: string;
    message: string;
  };
}

export interface RolesResult {
  success: boolean;
  roles?: Role[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AssignmentResult {
  success: boolean;
  assignment?: UserRoleAssignment;
  error?: {
    code: string;
    message: string;
  };
}

export interface AssignmentsResult {
  success: boolean;
  assignments?: UserRoleAssignment[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Role Service - Manages roles, permissions, and user role assignments
 * Provides enterprise-grade RBAC functionality with caching and audit trails
 */
export class RoleService {
  /**
   * Create a new role
   */
  static async createRole(roleData: CreateRoleRequest): Promise<RoleResult> {
    try {
      logger.info('Creating new role', {
        roleName: roleData.name,
        displayName: roleData.displayName,
        isSystemRole: roleData.isSystemRole
      });

      // Check if role name already exists
      const existingRole = await db.select()
        .from(roles)
        .where(eq(roles.name, roleData.name))
        .limit(1);

      if (existingRole.length > 0) {
        return {
          success: false,
          error: {
            code: 'ROLE_EXISTS',
            message: `Role with name '${roleData.name}' already exists`
          }
        };
      }

      // Start transaction to create role and assign permissions
      const result = await db.transaction(async (tx) => {
        // Create the role
        const newRole: NewRole = {
          name: roleData.name.toUpperCase(),
          displayName: roleData.displayName,
          description: roleData.description || null,
          isSystemRole: roleData.isSystemRole || false,
          isActive: true,
          hierarchyLevel: roleData.hierarchyLevel || 0
        };

        const insertedRoles = await tx.insert(roles)
          .values(newRole)
          .returning();

        const createdRole = insertedRoles[0];

        // Assign permissions if provided
        if (roleData.permissionIds && roleData.permissionIds.length > 0) {
          const permissionAssignments = roleData.permissionIds.map(permissionId => ({
            roleId: createdRole.id,
            permissionId,
            isActive: true
          }));

          await tx.insert(rolePermissions)
            .values(permissionAssignments);
        }

        return createdRole;
      });

      logger.info('Role created successfully', {
        roleId: result.id,
        roleName: result.name
      });

      return {
        success: true,
        role: result
      };
    } catch (error) {
      logger.error('Failed to create role', {
        error: error instanceof Error ? error.message : String(error),
        roleData
      });

      return {
        success: false,
        error: {
          code: 'ROLE_CREATION_FAILED',
          message: 'Failed to create role due to database error'
        }
      };
    }
  }

  /**
   * Update an existing role
   */
  static async updateRole(roleId: string, updates: UpdateRoleRequest): Promise<RoleResult> {
    try {
      logger.info('Updating role', { roleId, updates });

      // Check if role exists
      const existingRole = await db.select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (existingRole.length === 0) {
        return {
          success: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'Role not found'
          }
        };
      }

      const role = existingRole[0];

      // Prevent modification of system roles
      if (role.isSystemRole) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_ROLE_IMMUTABLE',
            message: 'System roles cannot be modified'
          }
        };
      }

      // Update role and permissions in transaction
      const result = await db.transaction(async (tx) => {
        // Update role basic info
        const updateData: Partial<NewRole> = {};
        if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
        if (updates.hierarchyLevel !== undefined) updateData.hierarchyLevel = updates.hierarchyLevel;

        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          await tx.update(roles)
            .set(updateData)
            .where(eq(roles.id, roleId));
        }

        // Update permissions if provided
        if (updates.permissionIds !== undefined) {
          // Remove existing permissions
          await tx.delete(rolePermissions)
            .where(eq(rolePermissions.roleId, roleId));

          // Add new permissions
          if (updates.permissionIds.length > 0) {
            const permissionAssignments = updates.permissionIds.map(permissionId => ({
              roleId,
              permissionId,
              isActive: true
            }));

            await tx.insert(rolePermissions)
              .values(permissionAssignments);
          }
        }

        // Return updated role
        const updatedRoles = await tx.select()
          .from(roles)
          .where(eq(roles.id, roleId))
          .limit(1);

        return updatedRoles[0];
      });

      logger.info('Role updated successfully', {
        roleId: result.id,
        roleName: result.name
      });

      return {
        success: true,
        role: result
      };
    } catch (error) {
      logger.error('Failed to update role', {
        error: error instanceof Error ? error.message : String(error),
        roleId,
        updates
      });

      return {
        success: false,
        error: {
          code: 'ROLE_UPDATE_FAILED',
          message: 'Failed to update role due to database error'
        }
      };
    }
  }

  /**
   * Delete a role (soft delete by deactivating)
   */
  static async deleteRole(roleId: string): Promise<RoleResult> {
    try {
      logger.info('Deleting role', { roleId });

      // Check if role exists
      const existingRole = await db.select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (existingRole.length === 0) {
        return {
          success: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'Role not found'
          }
        };
      }

      const role = existingRole[0];

      // Prevent deletion of system roles
      if (role.isSystemRole) {
        return {
          success: false,
          error: {
            code: 'SYSTEM_ROLE_IMMUTABLE',
            message: 'System roles cannot be deleted'
          }
        };
      }

      // Check for active user assignments
      const activeAssignments = await db.select()
        .from(userRoleAssignments)
        .where(and(
          eq(userRoleAssignments.roleId, roleId),
          eq(userRoleAssignments.isActive, true)
        ))
        .limit(1);

      if (activeAssignments.length > 0) {
        return {
          success: false,
          error: {
            code: 'ROLE_IN_USE',
            message: 'Cannot delete role with active user assignments'
          }
        };
      }

      // Soft delete role
      await db.update(roles)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(roles.id, roleId));

      logger.info('Role deleted successfully', {
        roleId,
        roleName: role.name
      });

      return {
        success: true,
        role: { ...role, isActive: false }
      };
    } catch (error) {
      logger.error('Failed to delete role', {
        error: error instanceof Error ? error.message : String(error),
        roleId
      });

      return {
        success: false,
        error: {
          code: 'ROLE_DELETION_FAILED',
          message: 'Failed to delete role due to database error'
        }
      };
    }
  }

  /**
   * Get role by ID
   */
  static async getRole(roleId: string): Promise<RoleResult> {
    try {
      const roleResult = await db.select()
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (roleResult.length === 0) {
        return {
          success: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'Role not found'
          }
        };
      }

      return {
        success: true,
        role: roleResult[0]
      };
    } catch (error) {
      logger.error('Failed to get role', {
        error: error instanceof Error ? error.message : String(error),
        roleId
      });

      return {
        success: false,
        error: {
          code: 'ROLE_FETCH_FAILED',
          message: 'Failed to fetch role'
        }
      };
    }
  }

  /**
   * List roles with pagination and filtering
   */
  static async listRoles(options: {
    page?: number;
    limit?: number;
    search?: string;
    includeInactive?: boolean;
    includeSystemRoles?: boolean;
  } = {}): Promise<RolesResult> {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        includeInactive = false,
        includeSystemRoles = true
      } = options;

      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions = [];

      if (!includeInactive) {
        conditions.push(eq(roles.isActive, true));
      }

      if (!includeSystemRoles) {
        conditions.push(eq(roles.isSystemRole, false));
      }

      if (search) {
        conditions.push(
          or(
            ilike(roles.name, `%${search}%`),
            ilike(roles.displayName, `%${search}%`),
            ilike(roles.description, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db.select({ count: roles.id })
        .from(roles)
        .where(whereClause);

      const total = countResult.length;

      // Get roles
      const rolesResult = await db.select()
        .from(roles)
        .where(whereClause)
        .orderBy(desc(roles.hierarchyLevel), asc(roles.name))
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      logger.info('Roles listed successfully', {
        page,
        limit,
        total,
        totalPages,
        search,
        includeInactive
      });

      return {
        success: true,
        roles: rolesResult,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Failed to list roles', {
        error: error instanceof Error ? error.message : String(error),
        options
      });

      return {
        success: false,
        error: {
          code: 'ROLES_LIST_FAILED',
          message: 'Failed to list roles'
        }
      };
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(
    userId: string,
    roleId: string,
    options: RoleAssignmentOptions
  ): Promise<AssignmentResult> {
    try {
      logger.info('Assigning role to user', {
        userId,
        roleId,
        assignedBy: options.assignedBy,
        teamId: options.teamId,
        organizationId: options.teamId || userId
      });

      // Verify user exists
      const userResult = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      // Verify role exists and is active
      const roleResult = await db.select()
        .from(roles)
        .where(and(
          eq(roles.id, roleId),
          eq(roles.isActive, true)
        ))
        .limit(1);

      if (roleResult.length === 0) {
        return {
          success: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'Role not found or inactive'
          }
        };
      }

      // Check for existing assignment
      const existingAssignment = await db.select()
        .from(userRoleAssignments)
        .where(and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.roleId, roleId),
          eq(userRoleAssignments.isActive, true)
        ))
        .limit(1);

      if (existingAssignment.length > 0) {
        return {
          success: false,
          error: {
            code: 'ASSIGNMENT_EXISTS',
            message: 'User already has this role assigned'
          }
        };
      }

      // Create role assignment
      const newAssignment: NewUserRoleAssignment = {
        userId,
        roleId,
        organizationId: options.teamId || userId, // Use team ID as org context, fallback to user ID
        teamId: options.teamId || null,
        regionId: options.regionId || null,
        grantedBy: options.assignedBy,
        expiresAt: options.expiresAt || null,
        context: options.context || null,
        isActive: true
      };

      const insertedAssignments = await db.insert(userRoleAssignments)
        .values(newAssignment)
        .returning();

      const assignment = insertedAssignments[0];

      logger.info('Role assigned successfully', {
        assignmentId: assignment.id,
        userId,
        roleId
      });

      return {
        success: true,
        assignment
      };
    } catch (error) {
      logger.error('Failed to assign role to user', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        roleId,
        options
      });

      return {
        success: false,
        error: {
          code: 'ROLE_ASSIGNMENT_FAILED',
          message: 'Failed to assign role to user'
        }
      };
    }
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(userId: string, roleId: string): Promise<AssignmentResult> {
    try {
      logger.info('Removing role from user', { userId, roleId });

      // Find existing assignment
      const existingAssignment = await db.select()
        .from(userRoleAssignments)
        .where(and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.roleId, roleId),
          eq(userRoleAssignments.isActive, true)
        ))
        .limit(1);

      if (existingAssignment.length === 0) {
        return {
          success: false,
          error: {
            code: 'ASSIGNMENT_NOT_FOUND',
            message: 'Role assignment not found'
          }
        };
      }

      // Deactivate assignment
      await db.update(userRoleAssignments)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.roleId, roleId)
        ));

      logger.info('Role removed successfully', {
        userId,
        roleId
      });

      return {
        success: true,
        assignment: { ...existingAssignment[0], isActive: false }
      };
    } catch (error) {
      logger.error('Failed to remove role from user', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        roleId
      });

      return {
        success: false,
        error: {
          code: 'ROLE_REMOVAL_FAILED',
          message: 'Failed to remove role from user'
        }
      };
    }
  }

  /**
   * Get user's roles (including inactive if requested)
   */
  static async getUserRoles(
    userId: string,
    includeInactive: boolean = false
  ): Promise<AssignmentsResult> {
    try {
      const conditions = [eq(userRoleAssignments.userId, userId)];

      if (!includeInactive) {
        conditions.push(eq(userRoleAssignments.isActive, true));
      }

      const assignmentsResult = await db.select({
        assignment: userRoleAssignments,
        role: roles,
        user: users,
        team: teams
      })
        .from(userRoleAssignments)
        .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
        .innerJoin(users, eq(userRoleAssignments.userId, users.id))
        .leftJoin(teams, eq(userRoleAssignments.teamId, teams.id))
        .where(and(...conditions))
        .orderBy(desc(userRoleAssignments.grantedAt));

      // Map results to include role information
      const assignments = assignmentsResult.map(result => ({
        ...result.assignment,
        role: result.role,
        user: result.user,
        team: result.team
      }));

      return {
        success: true,
        assignments: assignments as any
      };
    } catch (error) {
      logger.error('Failed to get user roles', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });

      return {
        success: false,
        error: {
          code: 'USER_ROLES_FETCH_FAILED',
          message: 'Failed to fetch user roles'
        }
      };
    }
  }

  /**
   * Get role permissions
   */
  static async getRolePermissions(roleId: string): Promise<{
    success: boolean;
    permissions?: Permission[];
    error?: { code: string; message: string };
  }> {
    try {
      const permissionsResult = await db.select({
        permission: permissions,
        rolePermission: rolePermissions
      })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.isActive, true),
          eq(permissions.isActive, true)
        ))
        .orderBy(permissions.resource, permissions.action);

      const rolePermissions = permissionsResult.map(result => result.permission);

      return {
        success: true,
        permissions: rolePermissions
      };
    } catch (error) {
      logger.error('Failed to get role permissions', {
        error: error instanceof Error ? error.message : String(error),
        roleId
      });

      return {
        success: false,
        error: {
          code: 'ROLE_PERMISSIONS_FETCH_FAILED',
          message: 'Failed to fetch role permissions'
        }
      };
    }
  }
}