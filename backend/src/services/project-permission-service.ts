import { db } from '../lib/db/index.js';
import {
  permissions,
  rolePermissions,
  roles,
  users,
  userRoleAssignments,
  projects,
  projectAssignments,
  projectTeamAssignments,
  teams,
  permissionActionEnum,
  permissionScopeEnum,
  resourceTypeEnum
} from '../lib/db/schema.js';
import { eq, and, or, inArray, isNull, not } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { projectService } from './project-service.js';

// ===== INTERFACES & TYPES =====

export interface ProjectPermissionMatrix {
  [roleName: string]: {
    [action: string]: {
      allowed: boolean;
      scope: string[];
      conditions?: Record<string, any>;
    };
  };
}

export interface ProjectAccessContext {
  userId: string;
  projectId?: string;
  userTeamId?: string;
  organizationId?: string;
  action: string;
  deviceTeamId?: string;
  requestId?: string;
}

export interface ProjectPermissionCheckResult {
  allowed: boolean;
  reason?: string;
  accessType?: 'direct' | 'team' | 'organization' | 'role_based' | 'none';
  grantedBy?: {
    type: 'assignment' | 'role';
    id: string;
    name: string;
  };
  scope?: string;
  conditions?: Record<string, any>;
  projectId?: string;
}

export interface ProjectAssignmentContext {
  projectId: string;
  assigneeId: string;
  assigneeType: 'user' | 'team';
  assignedBy: string;
  roleInProject?: string;
  assignedUntil?: Date;
}

// ===== PROJECT PERMISSION SERVICE =====

/**
 * Project-specific permission service for handling PROJECTS resource access
 *
 * This service provides:
 * - Project permission creation and management
 * - Role-based project access control
 * - Geographic scope enforcement (NATIONAL/REGIONAL)
 * - User and team assignment validation
 * - Integration with existing AuthorizationService
 */
export class ProjectPermissionService {

  // Role hierarchy levels for project access
  private static readonly ROLE_HIERARCHY = {
    'TEAM_MEMBER': 1,
    'FIELD_SUPERVISOR': 2,
    'REGIONAL_MANAGER': 3,
    'DEVICE_MANAGER': 4,
    'POLICY_ADMIN': 5,
    'SUPPORT_AGENT': 6,
    'AUDITOR': 7,
    'SYSTEM_ADMIN': 8,
    'NATIONAL_SUPPORT_ADMIN': 9
  };

  /**
   * Define the complete PROJECTS permission matrix for all 9 roles
   */
  private static readonly PROJECT_PERMISSION_MATRIX: ProjectPermissionMatrix = {
    // Field Operations Roles
    'TEAM_MEMBER': {
      'CREATE': { allowed: false, scope: [] },
      'READ': { allowed: true, scope: ['USER', 'TEAM'] },
      'UPDATE': { allowed: false, scope: [] },
      'DELETE': { allowed: false, scope: [] },
      'LIST': { allowed: true, scope: ['USER', 'TEAM'] },
      'MANAGE': { allowed: false, scope: [] },
      'EXECUTE': { allowed: true, scope: ['USER'] },
      'AUDIT': { allowed: true, scope: ['USER', 'TEAM'] }
    },

    'FIELD_SUPERVISOR': {
      'CREATE': { allowed: false, scope: [] },
      'READ': { allowed: true, scope: ['USER', 'TEAM', 'REGION'] },
      'UPDATE': { allowed: true, scope: ['USER', 'TEAM'] },
      'DELETE': { allowed: false, scope: [] },
      'LIST': { allowed: true, scope: ['USER', 'TEAM', 'REGION'] },
      'MANAGE': { allowed: true, scope: ['USER', 'TEAM'] },
      'EXECUTE': { allowed: true, scope: ['USER', 'TEAM'] },
      'AUDIT': { allowed: true, scope: ['USER', 'TEAM', 'REGION'] }
    },

    'REGIONAL_MANAGER': {
      'CREATE': { allowed: true, scope: ['REGION'] },
      'READ': { allowed: true, scope: ['REGION', 'ORGANIZATION'] },
      'UPDATE': { allowed: true, scope: ['REGION'] },
      'DELETE': { allowed: true, scope: ['REGION'] },
      'LIST': { allowed: true, scope: ['REGION', 'ORGANIZATION'] },
      'MANAGE': { allowed: true, scope: ['REGION'] },
      'EXECUTE': { allowed: true, scope: ['REGION'] },
      'AUDIT': { allowed: true, scope: ['REGION', 'ORGANIZATION'] }
    },

    // Technical Operations Roles
    'SYSTEM_ADMIN': {
      'CREATE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'READ': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'UPDATE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'DELETE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'LIST': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'MANAGE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'EXECUTE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'AUDIT': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] }
    },

    'SUPPORT_AGENT': {
      'CREATE': { allowed: false, scope: [] },
      'READ': { allowed: true, scope: ['ORGANIZATION'] },
      'UPDATE': { allowed: false, scope: [] },
      'DELETE': { allowed: false, scope: [] },
      'LIST': { allowed: true, scope: ['ORGANIZATION'] },
      'MANAGE': { allowed: false, scope: [] },
      'EXECUTE': { allowed: false, scope: [] },
      'AUDIT': { allowed: true, scope: ['ORGANIZATION'] }
    },

    'AUDITOR': {
      'CREATE': { allowed: false, scope: [] },
      'READ': { allowed: true, scope: ['ORGANIZATION'] },
      'UPDATE': { allowed: false, scope: [] },
      'DELETE': { allowed: false, scope: [] },
      'LIST': { allowed: true, scope: ['ORGANIZATION'] },
      'MANAGE': { allowed: false, scope: [] },
      'EXECUTE': { allowed: false, scope: [] },
      'AUDIT': { allowed: true, scope: ['ORGANIZATION'] }
    },

    // Specialized Roles
    'DEVICE_MANAGER': {
      'CREATE': { allowed: false, scope: [] },
      'READ': { allowed: true, scope: ['USER', 'TEAM'] },
      'UPDATE': { allowed: true, scope: ['USER', 'TEAM'] },
      'DELETE': { allowed: false, scope: [] },
      'LIST': { allowed: true, scope: ['USER', 'TEAM'] },
      'MANAGE': { allowed: false, scope: [] },
      'EXECUTE': { allowed: true, scope: ['USER', 'TEAM'] },
      'AUDIT': { allowed: true, scope: ['USER', 'TEAM'] }
    },

    'POLICY_ADMIN': {
      'CREATE': { allowed: false, scope: [] },
      'READ': { allowed: true, scope: ['ORGANIZATION'] },
      'UPDATE': { allowed: false, scope: [] },
      'DELETE': { allowed: false, scope: [] },
      'LIST': { allowed: true, scope: ['ORGANIZATION'] },
      'MANAGE': { allowed: false, scope: [] },
      'EXECUTE': { allowed: false, scope: [] },
      'AUDIT': { allowed: true, scope: ['ORGANIZATION'] }
    },

    'NATIONAL_SUPPORT_ADMIN': {
      'CREATE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'READ': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'UPDATE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'DELETE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'LIST': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'MANAGE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'EXECUTE': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] },
      'AUDIT': { allowed: true, scope: ['ORGANIZATION', 'SYSTEM'] }
    }
  };

  /**
   * Initialize PROJECTS permissions for all roles
   * This should be called during system setup or migration
   */
  static async initializeProjectPermissions(): Promise<void> {
    logger.info('Initializing PROJECTS permissions for all roles');

    try {
      const permissionIds: string[] = [];

      for (const [roleName, rolePermissionConfig] of Object.entries(this.PROJECT_PERMISSION_MATRIX)) {
        // Get the role
        const [role] = await db.select()
          .from(roles)
          .where(eq(roles.name, roleName))
          .limit(1);

        if (!role) {
          logger.warn(`Role ${roleName} not found, skipping permissions`);
          continue;
        }

        // Create permissions for each action
        for (const [action, permissionConfig] of Object.entries(rolePermissionConfig)) {
          if (!permissionConfig.allowed) {
            continue; // Skip denied permissions to keep database clean
          }

          const permissionName = `PROJECTS.${action}`;
          const description = `${action} access to projects (${permissionConfig.scope.join(', ')})`;

          // Check if permission already exists
          const [existingPermission] = await db.select()
            .from(permissions)
            .where(eq(permissions.name, permissionName))
            .limit(1);

          let permissionId: string;

          if (existingPermission) {
            permissionId = existingPermission.id;
            logger.debug(`Permission ${permissionName} already exists`);
          } else {
            // Create new permission
            const [newPermission] = await db.insert(permissions)
              .values({
                name: permissionName,
                resource: 'PROJECTS',
                action: action as any,
                scope: permissionConfig.scope[0] as any, // Use the first scope as default
                description,
                conditions: permissionConfig.conditions || null,
                isActive: true
              })
              .returning();

            permissionId = newPermission.id;
            logger.info(`Created permission: ${permissionName}`);
          }

          // Associate permission with role
          const [existingRolePermission] = await db.select()
            .from(rolePermissions)
            .where(and(
              eq(rolePermissions.roleId, role.id),
              eq(rolePermissions.permissionId, permissionId)
            ))
            .limit(1);

          if (!existingRolePermission) {
            await db.insert(rolePermissions)
              .values({
                roleId: role.id,
                permissionId,
                grantedBy: null // System initialization - no specific user
              });

            logger.info(`Associated permission ${permissionName} with role ${roleName}`);
          }

          permissionIds.push(permissionId);
        }
      }

      logger.info(`PROJECTS permissions initialized successfully`, {
        totalPermissions: permissionIds.length,
        rolesInitialized: Object.keys(this.PROJECT_PERMISSION_MATRIX).length
      });

    } catch (error) {
      logger.error('Failed to initialize PROJECTS permissions', { error });
      throw error;
    }
  }

  /**
   * Check if a user has access to a specific project action
   */
  static async checkProjectPermission(
    userId: string,
    action: string,
    projectId?: string,
    context?: Partial<ProjectAccessContext>
  ): Promise<ProjectPermissionCheckResult> {
    const requestId = context?.requestId || crypto.randomUUID();
    const startTime = Date.now();

    try {
      logger.info('Project permission check initiated', {
        userId,
        action,
        projectId,
        requestId
      });

      // 1. Check direct project assignment access
      if (projectId) {
        const assignmentAccess = await this.checkAssignmentAccess(userId, projectId, action, requestId);
        if (assignmentAccess.allowed) {
          return {
            ...assignmentAccess,
            evaluationTime: Date.now() - startTime
          };
        }
      }

      // 2. Check role-based project permissions
      const roleAccess = await this.checkRoleBasedAccess(userId, action, projectId, context);

      return {
        ...roleAccess,
        evaluationTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Project permission check failed', {
        userId,
        action,
        projectId,
        requestId,
        error: error.message
      });

      return {
        allowed: false,
        reason: 'Permission check error',
        evaluationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if user has direct assignment access to a project
   */
  private static async checkAssignmentAccess(
    userId: string,
    projectId: string,
    action: string,
    requestId: string
  ): Promise<ProjectPermissionCheckResult> {
    // Check direct user assignment
    const [userAssignment] = await db.select()
      .from(projectAssignments)
      .where(and(
        eq(projectAssignments.projectId, projectId),
        eq(projectAssignments.userId, userId),
        eq(projectAssignments.isActive, true)
      ))
      .limit(1);

    if (userAssignment) {
      logger.info('User has direct project assignment', {
        userId,
        projectId,
        roleInProject: userAssignment.roleInProject,
        requestId
      });

      return {
        allowed: true,
        accessType: 'direct',
        grantedBy: {
          type: 'assignment',
          id: userAssignment.id,
          name: userAssignment.roleInProject || 'Project Member'
        },
        projectId,
        reason: 'Direct project assignment'
      };
    }

    // Check team assignment
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.teamId) {
      const [teamAssignment] = await db.select()
        .from(projectTeamAssignments)
        .where(and(
          eq(projectTeamAssignments.projectId, projectId),
          eq(projectTeamAssignments.teamId, user.teamId),
          eq(projectTeamAssignments.isActive, true)
        ))
        .limit(1);

      if (teamAssignment) {
        logger.info('User has team project assignment', {
          userId,
          teamId: user.teamId,
          projectId,
          assignedRole: teamAssignment.assignedRole,
          requestId
        });

        return {
          allowed: true,
          accessType: 'team',
          grantedBy: {
            type: 'assignment',
            id: teamAssignment.id,
            name: teamAssignment.assignedRole || 'Team Member'
          },
          projectId,
          reason: 'Team project assignment'
        };
      }
    }

    return {
      allowed: false,
      accessType: 'none',
      projectId,
      reason: 'No project assignment found'
    };
  }

  /**
   * Check role-based project access
   */
  private static async checkRoleBasedAccess(
    userId: string,
    action: string,
    projectId?: string,
    context?: Partial<ProjectAccessContext>
  ): Promise<ProjectPermissionCheckResult> {
    // Get user's active roles
    const userRoles = await db.select({
      roleId: userRoleAssignments.roleId,
      roleName: roles.name,
      roleHierarchy: roles.hierarchyLevel,
      teamId: userRoleAssignments.teamId,
      regionId: userRoleAssignments.regionId,
      organizationId: userRoleAssignments.organizationId
    })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, true)
      ));

    if (userRoles.length === 0) {
      return {
        allowed: false,
        reason: 'User has no active roles',
        accessType: 'none'
      };
    }

    // Sort by hierarchy level (highest first)
    userRoles.sort((a, b) => b.roleHierarchy - a.roleHierarchy);

    // Check each role in hierarchy order
    for (const userRole of userRoles) {
      const rolePermissions = this.PROJECT_PERMISSION_MATRIX[userRole.roleName];

      if (!rolePermissions || !rolePermissions[action]?.allowed) {
        continue; // This role doesn't have permission for this action
      }

      const permission = rolePermissions[action];
      const allowedScopes = permission.scope;

      // Check geographic boundaries for REGIONAL projects
      if (projectId) {
        const project = await projectService.getProject(projectId);
        if (!project) {
          continue; // Project doesn't exist
        }

        // Check REGIONAL_MANAGER restrictions
        if (userRole.roleName === 'REGIONAL_MANAGER' && project.geographicScope === 'REGIONAL') {
          // REGIONAL_MANAGER can only access REGIONAL projects in their own region
          if (project.regionId && project.regionId !== userRole.regionId) {
            logger.info('REGIONAL_MANAGER geographic boundary violation', {
              userId,
              projectId,
              projectRegionId: project.regionId,
              managerRegionId: userRole.regionId
            });
            continue;
          }
        }
      }

      // Check if user has access at the required scope
      const scopeCheck = await this.validateAccessScope(
        allowedScopes,
        userRole,
        projectId,
        context
      );

      if (scopeCheck.allowed) {
        logger.info('Role-based project access granted', {
          userId,
          role: userRole.roleName,
          action,
          projectId,
          scope: scopeCheck.scope
        });

        return {
          allowed: true,
          accessType: 'role_based',
          grantedBy: {
            type: 'role',
            id: userRole.roleId,
            name: userRole.roleName
          },
          scope: scopeCheck.scope,
          projectId,
          reason: `Role-based access (${userRole.roleName})`
        };
      }
    }

    return {
      allowed: false,
      reason: 'No role has permission for this action',
      accessType: 'none'
    };
  }

  /**
   * Validate that user has access at the required scope
   */
  private static async validateAccessScope(
    allowedScopes: string[],
    userRole: any,
    projectId?: string,
    context?: Partial<ProjectAccessContext>
  ): Promise<{ allowed: boolean; scope?: string }> {
    for (const scope of allowedScopes) {
      switch (scope) {
        case 'USER':
          // Always allowed - user can access their own resources
          return { allowed: true, scope: 'USER' };

        case 'TEAM':
          // User must belong to the same team as the resource
          if (projectId) {
            const project = await projectService.getProject(projectId);
            // Check if user is assigned to the project (handled in assignment check)
            // or if user's team is assigned to the project
            const user = await db.select({ teamId: users.teamId })
              .from(users)
              .where(eq(users.id, context?.userId || ''))
              .limit(1);

            if (user.length > 0 && user[0].teamId) {
              // Check if team is assigned to project
              const [teamAssignment] = await db.select()
                .from(projectTeamAssignments)
                .where(and(
                  eq(projectTeamAssignments.projectId, projectId),
                  eq(projectTeamAssignments.teamId, user[0].teamId),
                  eq(projectTeamAssignments.isActive, true)
                ))
                .limit(1);

              if (teamAssignment) {
                return { allowed: true, scope: 'TEAM' };
              }
            }
          }
          break;

        case 'REGION':
          // User must be in the same region or have regional access
          if (userRole.regionId) {
            if (projectId) {
              const project = await projectService.getProject(projectId);
              if (project?.regionId === userRole.regionId) {
                return { allowed: true, scope: 'REGION' };
              }
            } else {
              // No specific project - allow regional access
              return { allowed: true, scope: 'REGION' };
            }
          }
          break;

        case 'ORGANIZATION':
          // Always allowed for organization-wide access
          return { allowed: true, scope: 'ORGANIZATION' };

        case 'SYSTEM':
          // System-wide access (highest privilege)
          return { allowed: true, scope: 'SYSTEM' };
      }
    }

    return { allowed: false };
  }

  /**
   * Get all projects a user can access based on their permissions
   */
  static async getUserAccessibleProjects(
    userId: string,
    action: string = 'READ',
    options: {
      status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
      geographicScope?: 'NATIONAL' | 'REGIONAL' | 'ALL';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    projects: any[];
    total: number;
    accessTypes: { direct: number; team: number; role: number };
  }> {
    const { status = 'ACTIVE', geographicScope = 'ALL', limit = 50, offset = 0 } = options;

    try {
      // Get projects through direct and team assignments
      const assignmentProjects = await projectService.getUserProjects(userId, {
        status,
        geographicScope,
        limit,
        offset
      });

      // Get additional projects through role-based access
      const roleProjects = await this.getRoleBasedProjects(userId, action, {
        status,
        geographicScope,
        limit,
        offset
      });

      // Combine and deduplicate projects
      const allProjects = [...assignmentProjects.projects, ...roleProjects.projects];
      const projectMap = new Map();

      let directCount = 0;
      let teamCount = 0;
      let roleCount = 0;

      for (const project of allProjects) {
        if (!projectMap.has(project.id)) {
          projectMap.set(project.id, project);

          // Determine access type (simplified for now)
          const accessCheck = await projectService.canUserAccessProject(userId, project.id);
          if (accessCheck.canAccess) {
            if (accessCheck.accessType === 'direct') directCount++;
            else if (accessCheck.accessType === 'team') teamCount++;
            else roleCount++;
          }
        }
      }

      return {
        projects: Array.from(projectMap.values()),
        total: projectMap.size,
        accessTypes: {
          direct: directCount,
          team: teamCount,
          role: roleCount
        }
      };

    } catch (error) {
      logger.error('Failed to get user accessible projects', { userId, action, error });
      return {
        projects: [],
        total: 0,
        accessTypes: { direct: 0, team: 0, role: 0 }
      };
    }
  }

  /**
   * Get projects accessible through role permissions (not direct assignments)
   */
  private static async getRoleBasedProjects(
    userId: string,
    action: string,
    options: any
  ): Promise<{ projects: any[] }> {
    // For now, return empty - role-based project listing would require
    // complex joins and is typically handled through organization/region filtering
    return { projects: [] };
  }

  /**
   * Validate project assignment permissions
   */
  static async canAssignToProject(
    assignerId: string,
    assignment: ProjectAssignmentContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check if assigner has MANAGE permission for projects
      const permissionCheck = await this.checkProjectPermission(
        assignerId,
        'MANAGE',
        assignment.projectId
      );

      if (!permissionCheck.allowed) {
        return {
          allowed: false,
          reason: 'Assigner lacks project management permissions'
        };
      }

      // Validate assignment rules based on assigner role
      const [assigner] = await db.select({
        roleName: roles.name,
        teamId: users.teamId,
        regionId: userRoleAssignments.regionId
      })
        .from(users)
        .innerJoin(userRoleAssignments, eq(userRoleAssignments.userId, users.id))
        .innerJoin(roles, eq(roles.id, userRoleAssignments.roleId))
        .where(and(
          eq(users.id, assignerId),
          eq(userRoleAssignments.isActive, true)
        ))
        .limit(1);

      if (!assigner) {
        return {
          allowed: false,
          reason: 'Assigner not found or has no active roles'
        };
      }

      // Check role-specific assignment constraints
      const assignerRole = assigner.roleName;

      // Most roles can assign within their scope
      const canAssignRoles = [
        'SYSTEM_ADMIN',
        'NATIONAL_SUPPORT_ADMIN',
        'REGIONAL_MANAGER',
        'FIELD_SUPERVISOR'
      ];

      if (!canAssignRoles.includes(assignerRole)) {
        return {
          allowed: false,
          reason: `${assignerRole} role cannot assign users to projects`
        };
      }

      // Additional validation for regional managers
      if (assignerRole === 'REGIONAL_MANAGER') {
        const project = await projectService.getProject(assignment.projectId);
        if (project?.geographicScope === 'REGIONAL' && project.regionId !== assigner.regionId) {
          return {
            allowed: false,
            reason: 'Cannot assign to projects outside your region'
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Failed to validate project assignment', {
        assignerId,
        assignment,
        error: error.message
      });

      return {
        allowed: false,
        reason: 'Assignment validation error'
      };
    }
  }

  /**
   * Get permission statistics for monitoring
   */
  static async getPermissionStatistics(): Promise<{
    totalPermissions: number;
    projectPermissions: number;
    rolesWithProjectAccess: number;
    activeProjectAssignments: number;
    activeTeamAssignments: number;
  }> {
    try {
      const [totalPermissionsResult] = await db.select({ count: permissions.id })
        .from(permissions);

      const [projectPermissionsResult] = await db.select({ count: permissions.id })
        .from(permissions)
        .where(eq(permissions.resource, 'PROJECTS'));

      const [activeAssignmentsResult] = await db.select({ count: projectAssignments.id })
        .from(projectAssignments)
        .where(eq(projectAssignments.isActive, true));

      const [activeTeamAssignmentsResult] = await db.select({ count: projectTeamAssignments.id })
        .from(projectTeamAssignments)
        .where(eq(projectTeamAssignments.isActive, true));

      // Count roles with PROJECTS permissions
      const rolesWithProjectAccess = await db
        .select({ roleName: roles.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
        .where(and(
          eq(permissions.resource, 'PROJECTS'),
          eq(permissions.isActive, true)
        ))
        .groupBy(roles.name);

      return {
        totalPermissions: Number(totalPermissionsResult?.count) || 0,
        projectPermissions: Number(projectPermissionsResult?.count) || 0,
        rolesWithProjectAccess: rolesWithProjectAccess.length,
        activeProjectAssignments: Number(activeAssignmentsResult?.count) || 0,
        activeTeamAssignments: Number(activeTeamAssignmentsResult?.count) || 0
      };

    } catch (error) {
      logger.error('Failed to get permission statistics', { error });
      return {
        totalPermissions: 0,
        projectPermissions: 0,
        rolesWithProjectAccess: 0,
        activeProjectAssignments: 0,
        activeTeamAssignments: 0
      };
    }
  }
}

// Export singleton instance
export const projectPermissionService = ProjectPermissionService;