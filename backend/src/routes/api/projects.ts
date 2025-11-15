import { Router, Response } from 'express';
import { z } from 'zod';
import { projectService } from '../../services/project-service';
import { projectPermissionService } from '../../services/project-permission-service';
import { logger } from '../../lib/logger';
import {
  authenticateToken,
  requirePermission,
  AuthenticatedRequest,
  Resource,
  Action,
  EnhancedAuthenticatedRequest
} from '../../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  // Check for web admin authentication first
  const accessToken = req.headers['authorization']?.replace('Bearer ', '') || req.cookies?.access_token;

  if (accessToken) {
    // Try to verify as web admin token
    try {
      const { JWTUtils } = require('../../lib/crypto');
      const decoded = JWTUtils.verifyAccessToken(accessToken);

      if (decoded.success && decoded.payload.type === 'web_admin') {
        // Set up user context for web admin
        (req as any).user = {
          id: decoded.payload.sub,
          email: decoded.payload.email,
          role: decoded.payload.role,
          teamId: null, // Web admins not tied to specific teams
          displayName: decoded.payload.email
        };
        (req as any).authorization = {
          userId: decoded.payload.sub,
          permissions: [
            {
              resource: 'PROJECTS',
              action: 'CREATE',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            },
            {
              resource: 'PROJECTS',
              action: 'READ',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            },
            {
              resource: 'PROJECTS',
              action: 'UPDATE',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            },
            {
              resource: 'PROJECTS',
              action: 'DELETE',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            },
            {
              resource: 'PROJECTS',
              action: 'LIST',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            },
            {
              resource: 'PROJECTS',
              action: 'MANAGE',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            },
            {
              resource: 'PROJECTS',
              action: 'EXECUTE',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            },
            {
              resource: 'PROJECTS',
              action: 'AUDIT',
              scope: 'ORGANIZATION',
              inheritedFrom: 'WEB_ADMIN_ROLE'
            }
          ],
          computedAt: new Date(),
          expiresAt: new Date(Date.now() + 20 * 60 * 1000) // 20 minutes
        };
        return next(); // Important: return here to skip regular authentication
      }
    } catch (error) {
      // Web admin token verification failed, continue to normal auth
      console.error('Web admin token verification failed:', error);
    }
  }

  // Fall back to regular authentication only if not web admin
  authenticateToken(req, res, next).catch((error) => {
    console.error('Authentication failed:', error);
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
        request_id: req.headers['x-request-id']
      }
    });
  });
});

// Validation schemas
const createProjectSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(255, 'Title too long'),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(50, 'Abbreviation too long'),
  contactPersonDetails: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  geographicScope: z.enum(['NATIONAL', 'REGIONAL']).default('NATIONAL'),
  regionId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional()
});

const updateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(50, 'Abbreviation too long').optional(),
  contactPersonDetails: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  geographicScope: z.enum(['NATIONAL', 'REGIONAL']).optional(),
  regionId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().optional()
});

const assignUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  roleInProject: z.string().max(100, 'Role too long').optional(),
  assignedUntil: z.string().datetime().optional()
});

const assignTeamSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  assignedRole: z.string().max(100, 'Role too long').optional(),
  assignedUntil: z.string().datetime().optional()
});

const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).default('ALL'),
  geographicScope: z.enum(['NATIONAL', 'REGIONAL', 'ALL']).default('ALL'),
  organizationId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'abbreviation']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: z.coerce.boolean().default(false)
});

// Validation middleware
const validateRequest = (schema: z.ZodObject<any, any>) => {
  return (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
      }
      next(error);
    }
  };
};

const validateQuery = (schema: z.ZodObject<any, any>) => {
  return (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
      }
      next(error);
    }
  };
};

/**
 * GET /api/v1/projects
 * List projects with filtering and pagination
 */
router.get('/',
  validateQuery(listProjectsSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    // Custom permission check for web admin compatibility
    if (!req.user || !req.authorization) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }

    // Check if user has LIST permission for PROJECTS
    const hasListPermission = req.authorization.permissions.some(p =>
      p.resource === 'PROJECTS' && p.action === 'LIST'
    );

    if (!hasListPermission) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to list projects'
        }
      });
    }
    try {
      const userId = req.user?.id;
      const options = req.query as any;

      // Check what projects this user can access
      const accessibleProjects = await projectPermissionService.getUserAccessibleProjects(
        userId!,
        'LIST',
        {
          status: options.status,
          geographicScope: options.geographicScope,
          limit: options.limit,
          offset: (options.page - 1) * options.limit
        }
      );

      // If user has broad access, get full paginated list
      if (accessibleProjects.total > options.limit) {
        const fullList = await projectService.listProjects(options);
        return res.json({
          ok: true,
          projects: fullList.projects,
          pagination: {
            page: options.page,
            limit: options.limit,
            total: fullList.total,
            totalPages: fullList.totalPages
          },
          accessTypes: accessibleProjects.accessTypes
        });
      }

      return res.json({
        ok: true,
        projects: accessibleProjects.projects,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: accessibleProjects.total,
          totalPages: Math.ceil(accessibleProjects.total / options.limit)
        },
        accessTypes: accessibleProjects.accessTypes
      });

    } catch (error: any) {
      logger.error('list_projects_endpoint_error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * GET /api/v1/projects/my
 * Get projects accessible to current user
 */
router.get('/my',
  requirePermission(Resource.PROJECTS, Action.READ),
  validateQuery(listProjectsSchema.partial()),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const options = req.query as any;

      const userProjects = await projectService.getUserProjects(userId!, options);

      return res.json({
        ok: true,
        projects: userProjects.projects,
        total: userProjects.total
      });

    } catch (error: any) {
      logger.error('get_my_projects_error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * GET /api/v1/projects/:id
 * Get project by ID
 */
router.get('/:id',
  requirePermission(Resource.PROJECTS, Action.READ),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if user has access to this specific project
      const accessCheck = await projectPermissionService.checkProjectPermission(
        userId!,
        'READ',
        id
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: accessCheck.reason || 'Access denied to this project'
          }
        });
      }

      const project = await projectService.getProject(id);

      if (!project) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found'
          }
        });
      }

      return res.json({
        ok: true,
        project,
        accessType: accessCheck.accessType,
        grantedBy: accessCheck.grantedBy
      });

    } catch (error: any) {
      logger.error('get_project_endpoint_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * POST /api/v1/projects
 * Create new project
 */
router.post('/',
  requirePermission(Resource.PROJECTS, Action.CREATE),
  validateRequest(createProjectSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const projectData = req.body;

      // Check if abbreviation is unique
      const isUnique = await projectService.isAbbreviationUnique(projectData.abbreviation);
      if (!isUnique) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'ABBREVIATION_NOT_UNIQUE',
            message: 'Project abbreviation must be unique'
          }
        });
      }

      // Create project
      const project = await projectService.createProject({
        ...projectData,
        createdBy: userId!
      });

      logger.info('project_created', {
        projectId: project.id,
        title: project.title,
        abbreviation: project.abbreviation,
        createdBy: userId
      });

      return res.status(201).json({
        ok: true,
        project,
        message: 'Project created successfully'
      });

    } catch (error: any) {
      logger.error('create_project_endpoint_error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * PUT /api/v1/projects/:id
 * Update project
 */
router.put('/:id',
  requirePermission(Resource.PROJECTS, Action.UPDATE),
  validateRequest(updateProjectSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;

      // Check if user has access to update this project
      const accessCheck = await projectPermissionService.checkProjectPermission(
        userId!,
        'UPDATE',
        id
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: accessCheck.reason || 'Access denied to update this project'
          }
        });
      }

      // Check abbreviation uniqueness if being updated
      if (updateData.abbreviation) {
        const isUnique = await projectService.isAbbreviationUnique(updateData.abbreviation, id);
        if (!isUnique) {
          return res.status(400).json({
            ok: false,
            error: {
              code: 'ABBREVIATION_NOT_UNIQUE',
              message: 'Project abbreviation must be unique'
            }
          });
        }
      }

      const project = await projectService.updateProject(id, updateData);

      if (!project) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found'
          }
        });
      }

      logger.info('project_updated', {
        projectId: id,
        updatedBy: userId
      });

      return res.json({
        ok: true,
        project,
        message: 'Project updated successfully'
      });

    } catch (error: any) {
      logger.error('update_project_endpoint_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * DELETE /api/v1/projects/:id
 * Soft delete project
 */
router.delete('/:id',
  requirePermission(Resource.PROJECTS, Action.DELETE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if user has access to delete this project
      const accessCheck = await projectPermissionService.checkProjectPermission(
        userId!,
        'DELETE',
        id
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: accessCheck.reason || 'Access denied to delete this project'
          }
        });
      }

      const success = await projectService.deleteProject(id);

      if (!success) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found'
          }
        });
      }

      logger.info('project_deleted', {
        projectId: id,
        deletedBy: userId
      });

      return res.json({
        ok: true,
        message: 'Project deleted successfully'
      });

    } catch (error: any) {
      logger.error('delete_project_endpoint_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * POST /api/v1/projects/:id/restore
 * Restore soft deleted project
 */
router.post('/:id/restore',
  requirePermission(Resource.PROJECTS, Action.MANAGE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if user has management access
      const accessCheck = await projectPermissionService.checkProjectPermission(
        userId!,
        'MANAGE',
        id
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: accessCheck.reason || 'Access denied to restore this project'
          }
        });
      }

      const project = await projectService.restoreProject(id);

      if (!project) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found'
          }
        });
      }

      logger.info('project_restored', {
        projectId: id,
        restoredBy: userId
      });

      return res.json({
        ok: true,
        project,
        message: 'Project restored successfully'
      });

    } catch (error: any) {
      logger.error('restore_project_endpoint_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * GET /api/v1/projects/:id/members
 * Get project members (users and teams)
 */
router.get('/:id/members',
  requirePermission(Resource.PROJECTS, Action.READ),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if user has access to this project
      const accessCheck = await projectPermissionService.checkProjectPermission(
        userId!,
        'READ',
        id
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: accessCheck.reason || 'Access denied to this project'
          }
        });
      }

      const members = await projectService.getProjectMembers(id);

      return res.json({
        ok: true,
        members
      });

    } catch (error: any) {
      logger.error('get_project_members_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * POST /api/v1/projects/:id/assign-user
 * Assign user to project
 */
router.post('/:id/assign-user',
  requirePermission(Resource.PROJECTS, Action.MANAGE),
  validateRequest(assignUserSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, roleInProject, assignedUntil } = req.body;
      const assignedBy = req.user?.id;

      // Check if assigner has management access
      const accessCheck = await projectPermissionService.canAssignToProject(assignedBy!, {
        projectId: id,
        assigneeId: userId,
        assigneeType: 'user',
        assignedBy: assignedBy!,
        roleInProject,
        assignedUntil: assignedUntil ? new Date(assignedUntil) : undefined
      });

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'ASSIGNMENT_DENIED',
            message: accessCheck.reason || 'Not authorized to assign users to this project'
          }
        });
      }

      const assignment = await projectService.assignUserToProject(
        id,
        userId,
        assignedBy!,
        roleInProject,
        assignedUntil ? new Date(assignedUntil) : undefined
      );

      logger.info('user_assigned_to_project', {
        projectId: id,
        assignedUserId: userId,
        assignedBy,
        roleInProject
      });

      return res.status(201).json({
        ok: true,
        assignment,
        message: 'User assigned to project successfully'
      });

    } catch (error: any) {
      logger.error('assign_user_to_project_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * POST /api/v1/projects/:id/assign-team
 * Assign team to project
 */
router.post('/:id/assign-team',
  requirePermission(Resource.PROJECTS, Action.MANAGE),
  validateRequest(assignTeamSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { teamId, assignedRole, assignedUntil } = req.body;
      const assignedBy = req.user?.id;

      // Check if assigner has management access
      const accessCheck = await projectPermissionService.canAssignToProject(assignedBy!, {
        projectId: id,
        assigneeId: teamId,
        assigneeType: 'team',
        assignedBy: assignedBy!,
        roleInProject: assignedRole,
        assignedUntil: assignedUntil ? new Date(assignedUntil) : undefined
      });

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'ASSIGNMENT_DENIED',
            message: accessCheck.reason || 'Not authorized to assign teams to this project'
          }
        });
      }

      const assignment = await projectService.assignTeamToProject(
        id,
        teamId,
        assignedBy!,
        assignedRole,
        assignedUntil ? new Date(assignedUntil) : undefined
      );

      logger.info('team_assigned_to_project', {
        projectId: id,
        assignedTeamId: teamId,
        assignedBy,
        assignedRole
      });

      return res.status(201).json({
        ok: true,
        assignment,
        message: 'Team assigned to project successfully'
      });

    } catch (error: any) {
      logger.error('assign_team_to_project_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * DELETE /api/v1/projects/:id/remove-user/:userId
 * Remove user from project
 */
router.delete('/:id/remove-user/:userId',
  requirePermission(Resource.PROJECTS, Action.MANAGE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, userId } = req.params;
      const assignedBy = req.user?.id;

      // Check if assigner has management access
      const accessCheck = await projectPermissionService.checkProjectPermission(
        assignedBy!,
        'MANAGE',
        id
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: accessCheck.reason || 'Access denied to manage this project'
          }
        });
      }

      const success = await projectService.removeUserFromProject(id, userId);

      if (!success) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'USER_ASSIGNMENT_NOT_FOUND',
            message: 'User assignment not found'
          }
        });
      }

      logger.info('user_removed_from_project', {
        projectId: id,
        removedUserId: userId,
        removedBy: assignedBy
      });

      return res.json({
        ok: true,
        message: 'User removed from project successfully'
      });

    } catch (error: any) {
      logger.error('remove_user_from_project_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * DELETE /api/v1/projects/:id/remove-team/:teamId
 * Remove team from project
 */
router.delete('/:id/remove-team/:teamId',
  requirePermission(Resource.PROJECTS, Action.MANAGE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, teamId } = req.params;
      const assignedBy = req.user?.id;

      // Check if assigner has management access
      const accessCheck = await projectPermissionService.checkProjectPermission(
        assignedBy!,
        'MANAGE',
        id
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: accessCheck.reason || 'Access denied to manage this project'
          }
        });
      }

      const success = await projectService.removeTeamFromProject(id, teamId);

      if (!success) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'TEAM_ASSIGNMENT_NOT_FOUND',
            message: 'Team assignment not found'
          }
        });
      }

      logger.info('team_removed_from_project', {
        projectId: id,
        removedTeamId: teamId,
        removedBy: assignedBy
      });

      return res.json({
        ok: true,
        message: 'Team removed from project successfully'
      });

    } catch (error: any) {
      logger.error('remove_team_from_project_error', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

/**
 * GET /api/v1/projects/stats
 * Get project permission statistics (admin only)
 */
router.get('/stats',
  requirePermission(Resource.PROJECTS, Action.AUDIT),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await projectPermissionService.getPermissionStatistics();

      return res.json({
        ok: true,
        stats
      });

    } catch (error: any) {
      logger.error('get_project_stats_error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      return res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          request_id: req.headers['x-request-id'],
        },
      });
    }
  }
);

export default router;