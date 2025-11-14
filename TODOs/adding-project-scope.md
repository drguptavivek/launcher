# SurveyLauncher PROJECT SCOPE Strategy & Implementation Plan

**Created**: 2025-11-14
**Priority**: HIGH
**Status**: PLANNING
**Target**: Backend Project Management Integration with RBAC

## 🎯 Executive Summary

The SurveyLauncher backend has implemented a comprehensive 9-role RBAC system with enterprise-grade security and multi-tenant architecture. The next strategic evolution requires adding a PROJECT construct that enables national-level project coordination while maintaining the existing security boundaries and access control patterns. This plan defines the integration of project management capabilities with the current RBAC system without breaking changes.

## 📊 Current System State Analysis

### ✅ What's Implemented
- **9-Role RBAC System**: Complete enterprise-scale access control
- **Database Schema**: Multi-tenant architecture with teams, users, devices, roles, permissions
- **AuthorizationService**: Advanced permission resolution with caching and cross-team access
- **API Infrastructure**: RESTful endpoints with comprehensive middleware protection
- **Audit System**: Complete access logging and security event tracking
- **Performance Optimized**: <100ms permission resolution with effective caching

### ❌ Strategic Gaps Identified
- **Project-Level Organization**: No mechanism to group teams/users across organizational boundaries
- **National Coordination**: Limited ability to manage multi-regional initiatives
- **Flexible Assignment**: No support for both individual and team-based project assignments
- **Project Lifecycle**: Missing project status management and oversight capabilities
- **Resource Association**: Devices and telemetry cannot be grouped by project context

## 🔮 Strategic Project Implementation Plan

### Phase 1: PROJECT Schema Integration

#### 1.1 Project Database Schema
**File**: `src/lib/db/schema.ts`
**Changes Required**:
```typescript
// Project status enumeration
export const projectStatusEnum = pgEnum('project_status', [
  'ACTIVE',
  'INACTIVE'
]);

// Project geographic scope enumeration
export const projectGeographicScopeEnum = pgEnum('project_geographic_scope', [
  'NATIONAL',
  'REGIONAL'
]);

// Projects table - Core project management
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 50 }).notNull().unique(),
  contactPersonDetails: text('contact_person_details'),
  status: projectStatusEnum('status').notNull().default('ACTIVE'),
  geographicScope: projectGeographicScopeEnum('geographic_scope').notNull().default('NATIONAL'),
  regionId: uuid('region_id').references(() => teams.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').notNull().default('org-default'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }) // Soft delete support
}, (t) => ({
  abbreviationIdx: index('idx_project_abbreviation').on(t.abbreviation),
  statusIdx: index('idx_project_status').on(t.status),
  organizationIdx: index('idx_project_organization').on(t.organizationId),
  createdByIdx: index('idx_project_created_by').on(t.createdBy)
}));

// Individual user project assignments
export const projectAssignments = pgTable('project_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').notNull().references(() => users.id),
  roleInProject: varchar('role_in_project', { length: 100 }), // e.g., 'Project Lead', 'Field Coordinator'
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  assignedUntil: timestamp('assigned_until', { withTimezone: true }) // Temporary assignments
}, (t) => ({
  projectUserIdx: index('idx_project_assignment_unique').on(t.projectId, t.userId).unique(),
  projectIdx: index('idx_project_assignment_project').on(t.projectId),
  userIdx: index('idx_project_assignment_user').on(t.userId),
  activeIdx: index('idx_project_assignment_active').on(t.isActive)
}));

// Team-based project assignments (all team members get project access)
export const projectTeamAssignments = pgTable('project_team_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').notNull().references(() => users.id),
  assignedRole: varchar('assigned_role', { length: 100 }), // e.g., 'Implementation Team', 'Support Team'
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  assignedUntil: timestamp('assigned_until', { withTimezone: true })
}, (t) => ({
  projectTeamIdx: index('idx_project_team_assignment_unique').on(t.projectId, t.teamId).unique(),
  projectIdx: index('idx_project_team_assignment_project').on(t.projectId),
  teamIdx: index('idx_project_team_assignment_team').on(t.teamId),
  activeIdx: index('idx_project_team_assignment_active').on(t.isActive)
}));
```

#### 1.2 Enhanced RBAC Integration
```typescript
// Add PROJECTS to existing resource type enum
export const resourceTypeEnum = pgEnum('resource_type', [
  'TEAMS', 'USERS', 'DEVICES', 'SUPERVISOR_PINS', 'TELEMETRY',
  'POLICY', 'AUTH', 'SYSTEM_SETTINGS', 'SUPPORT_TICKETS',
  'AUDIT_LOGS', 'ORGANIZATION', 'PROJECTS' // NEW: Project resource type
]);

// Project-specific permissions in permissions table
// Existing permissions table automatically supports PROJECTS resource type
// Sample project permissions that will be created:
// - PROJECTS_CREATE (for NATIONAL_SUPPORT_ADMIN)
// - PROJECTS_READ (for all roles based on assignment)
// - PROJECTS_UPDATE (for NATIONAL_SUPPORT_ADMIN, REGIONAL_MANAGER)
// - PROJECTS_DELETE (for NATIONAL_SUPPORT_ADMIN only)
// - PROJECTS_LIST (various scopes based on role)
// - PROJECTS_MANAGE (for NATIONAL_SUPPORT_ADMIN)
```

### Phase 2: Enhanced RBAC Permission Matrix

#### 2.1 Project Permission Matrix
| Role | Create | Read | Update | Delete | List | Manage | Scope & Context |
|------|--------|------|--------|--------|------|--------|----------------|
| **NATIONAL_SUPPORT_ADMIN** | ✅ | ✅ (All) | ✅ (All) | ✅ (All) | ✅ (All) | ✅ | Organization-level access to all projects nationally |
| **REGIONAL_MANAGER** | ❌ | ✅ (Regional) | ✅ (Regional) | ❌ | ✅ (Regional) | ❌ | Projects assigned to their region or teams they manage |
| **FIELD_SUPERVISOR** | ❌ | ✅ (Assigned) | ✅ (Limited) | ❌ | ✅ (Assigned) | ❌ | Projects assigned to them or their teams |
| **TEAM_MEMBER** | ❌ | ✅ (Assigned) | ❌ | ❌ | ✅ (Assigned) | ❌ | Projects assigned to them individually or via team |
| **DEVICE_MANAGER** | ❌ | ✅ (Assigned) | ✅ (Device Config) | ❌ | ✅ (Assigned) | ❌ | Projects where they manage devices |
| **SYSTEM_ADMIN** | ❌ | ✅ (All) | ✅ (Config) | ❌ | ✅ (All) | ✅ (Config) | System-level project configuration management |
| **SUPPORT_AGENT** | ❌ | ✅ (Assigned) | ✅ (Support) | ❌ | ✅ (Assigned) | ❌ | Projects they support for troubleshooting |
| **AUDITOR** | ❌ | ✅ (All) | ❌ | ❌ | ✅ (All) | ❌ | Read-only access to all projects for audit |
| **POLICY_ADMIN** | ❌ | ✅ (All) | ✅ (Policy) | ❌ | ✅ (All) | ❌ | Project policy configuration access |

#### 2.2 Project Access Control Logic
```typescript
interface ProjectPermissionContext {
  userId: string;
  projectId: string;
  userRole: UserRole;
  userAssignments: string[]; // Direct project assignments
  teamAssignments: string[]; // Team-based project assignments
  managedRegions: string[]; // For REGIONAL_MANAGER
  organizationId: string;
}

class ProjectPermissionService {
  static async checkProjectAccess(
    context: ProjectPermissionContext,
    action: PermissionAction
  ): Promise<ProjectAccessResult> {
    // 1. NATIONAL_SUPPORT_ADMIN - Full national access
    if (context.userRole === 'NATIONAL_SUPPORT_ADMIN') {
      return {
        allowed: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LIST', 'MANAGE'].includes(action),
        scope: 'ORGANIZATION',
        reason: 'NATIONAL_SUPPORT_ADMIN full project access'
      };
    }

    // 2. REGIONAL_MANAGER - Regional project access
    if (context.userRole === 'REGIONAL_MANAGER') {
      const isRegionalProject = await this.checkRegionalProjectAccess(
        context.projectId,
        context.managedRegions
      );
      return {
        allowed: isRegionalProject && ['READ', 'UPDATE', 'LIST'].includes(action),
        scope: 'REGION',
        reason: isRegionalProject ? 'Regional project access' : 'Outside managed region'
      };
    }

    // 3. Direct Assignment Check
    if (context.userAssignments.includes(context.projectId)) {
      const roleBasedPermissions = this.getRoleBasedPermissions(context.userRole);
      return {
        allowed: roleBasedPermissions.includes(action),
        scope: 'ASSIGNED',
        reason: 'Direct project assignment'
      };
    }

    // 4. Team Assignment Check
    if (context.teamAssignments.includes(context.projectId)) {
      const roleBasedPermissions = this.getRoleBasedPermissions(context.userRole);
      return {
        allowed: roleBasedPermissions.includes(action),
        scope: 'TEAM_ASSIGNED',
        reason: 'Team project assignment'
      };
    }

    // 5. Default denial
    return {
      allowed: false,
      scope: 'NONE',
      reason: 'No project assignment found'
    };
  }
}
```

### Phase 3: Service Layer Architecture

#### 3.1 ProjectService Implementation
**File**: `src/services/project-service.ts`
**Complete Implementation**:
```typescript
export class ProjectService {
  // Project CRUD Operations
  static async createProject(data: CreateProjectRequest): Promise<ProjectCreateResult> {
    // Validate NATIONAL_SUPPORT_ADMIN permissions
    // Create project with geographic scope
    // Set up initial project metadata
    // Log project creation for audit
  }

  static async getProject(projectId: string, requestContext: RequestContext): Promise<ProjectGetResult> {
    // Check project read permissions
    // Load project with assignment details
    // Include team and member information
    // Filter based on user's access level
  }

  static async listProjects(filters: ProjectListFilters, requestContext: RequestContext): Promise<ProjectListResult> {
    // Apply role-based filtering
    // NATIONAL_SUPPORT_ADMIN: All projects
    // REGIONAL_MANAGER: Regional projects only
    // Other roles: Assigned projects only
    // Support pagination and search
  }

  static async updateProject(projectId: string, updates: UpdateProjectRequest, requestContext: RequestContext): Promise<ProjectUpdateResult> {
    // Validate update permissions
    // NATIONAL_SUPPORT_ADMIN: Full update access
    // REGIONAL_MANAGER: Regional project updates only
    // Audit all project changes
  }

  static async deleteProject(projectId: string, requestContext: RequestContext): Promise<ProjectDeleteResult> {
    // NATIONAL_SUPPORT_ADMIN only
    // Soft delete implementation
    // Clean up project assignments
    // Archive project data for audit
  }

  // Assignment Management
  static async assignUserToProject(projectId: string, userId: string, assignmentData: UserAssignmentRequest, requestContext: RequestContext): Promise<AssignmentResult> {
    // Validate assignment permissions
    // REGIONAL_MANAGER can assign within managed projects
    // Create assignment with role and duration
    // Update user's project permissions cache
  }

  static async assignTeamToProject(projectId: string, teamId: string, assignmentData: TeamAssignmentRequest, requestContext: RequestContext): Promise<TeamAssignmentResult> {
    // Validate team assignment permissions
    // All team members get project access
    // Handle team member changes automatically
    // Update permission cache for all team members
  }

  static async removeUserFromProject(projectId: string, userId: string, requestContext: RequestContext): Promise<RemovalResult> {
    // Validate removal permissions
    // Clean up user's project permissions
    // Update permission cache
    // Log removal for audit
  }

  static async removeTeamFromProject(projectId: string, teamId: string, requestContext: RequestContext): Promise<TeamRemovalResult> {
    // Validate team removal permissions
    // Remove project access from all team members
    // Bulk permission cache updates
    // Comprehensive audit logging
  }

  // Query Operations
  static async getProjectMembers(projectId: string, requestContext: RequestContext): Promise<ProjectMembersResult> {
    // Get all individual assignments
    // Get all team-based assignments
    // Consolidate member information
    // Filter by access permissions
  }

  static async getProjectTeams(projectId: string, requestContext: RequestContext): Promise<ProjectTeamsResult> {
    // List all assigned teams
    // Include team member counts
    // Show assignment roles and dates
  }

  static async getUserProjects(userId: string, requestContext: RequestContext): Promise<UserProjectsResult> {
    // Get direct project assignments
    // Get team-based project assignments
    // Consolidate with permission levels
    // Support pagination and filtering
  }

  // Permission and Access Control
  static async getUserProjectPermissions(userId: string, projectId: string): Promise<ProjectPermissionsResult> {
    // Check direct assignments
    // Check team assignments
    // Apply role-based permissions
    // Return effective permission set
  }

  static async refreshProjectPermissionCache(projectId: string, affectedUserIds?: string[]): Promise<CacheRefreshResult> {
    // Clear project permission cache
    // Rebuild permission entries
    // Support bulk cache updates
    // Monitor cache performance
  }
}

// Type definitions for project service
export interface CreateProjectRequest {
  title: string;
  abbreviation: string;
  contactPersonDetails: string;
  geographicScope: 'NATIONAL' | 'REGIONAL';
  regionId?: string; // Required for REGIONAL projects
  organizationId?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  contactPersonDetails?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  // Note: abbreviation and geographicScope cannot be changed after creation
}

export interface UserAssignmentRequest {
  roleInProject?: string;
  assignedUntil?: Date; // For temporary assignments
  notes?: string;
}

export interface TeamAssignmentRequest {
  assignedRole?: string;
  assignedUntil?: Date;
  notes?: string;
}

export interface ProjectListFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  geographicScope?: 'NATIONAL' | 'REGIONAL';
  regionId?: string;
  assignedToMe?: boolean; // Filter for projects assigned to current user
  assignedToMyTeam?: boolean; // Filter for projects assigned to user's team
  search?: string; // Search in title and abbreviation
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

#### 3.2 AuthorizationService Integration
**File**: `src/services/authorization-service.ts`
**Enhancements Required**:
```typescript
// Enhanced permission checking with project support
export class AuthorizationService {
  static async checkPermission(
    userId: string,
    resource: ResourceType,
    action: PermissionAction,
    context?: {
      resourceId?: string;
      teamId?: string;
      projectId?: string; // NEW: Project context
      organizationId?: string;
      sessionId?: string;
    }
  ): Promise<PermissionResult> {

    // Existing logic for other resources...

    // NEW: Project resource handling
    if (resource === 'PROJECTS') {
      return await ProjectPermissionService.checkProjectAccess({
        userId,
        projectId: context?.resourceId,
        userRole: await this.getPrimaryRole(userId),
        userAssignments: await this.getUserProjectAssignments(userId),
        teamAssignments: await this.getUserTeamProjectAssignments(userId),
        managedRegions: await this.getManagedRegions(userId),
        organizationId: context?.organizationId || 'org-default'
      }, action);
    }

    // For other resources, check if project context applies
    if (context?.projectId) {
      const projectAccess = await this.checkProjectResourceAccess(
        userId,
        context.projectId,
        resource,
        action
      );
      if (!projectAccess.allowed) {
        return projectAccess;
      }
    }

    // Continue with existing permission logic...
  }

  // NEW: Get user's effective project permissions
  static async getUserEffectiveProjectPermissions(
    userId: string,
    projectId: string
  ): Promise<EffectivePermissions> {
    const userRoles = await this.getUserRoles(userId);
    const directAssignments = await this.getUserProjectAssignments(userId);
    const teamAssignments = await this.getUserTeamProjectAssignments(userId);

    return {
      userId,
      projectId,
      roles: userRoles,
      directAssignments,
      teamAssignments,
      effectivePermissions: await this.computeProjectPermissions(userRoles, directAssignments, teamAssignments),
      lastComputed: new Date()
    };
  }

  // NEW: Refresh project permission cache when assignments change
  static async invalidateProjectPermissionCache(
    projectId: string,
    affectedUserIds?: string[]
  ): Promise<void> {
    // Clear cache entries for affected users
    // Trigger permission recomputation
    // Update distributed cache if using Redis
  }
}
```

### Phase 4: API Implementation

#### 4.1 Project Management API Endpoints
**File**: `src/routes/api/projects.ts`
**New Route File**:
```typescript
import { Router } from 'express';
import { ProjectService } from '../../services/project-service';
import { requirePermission } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { projectSchemas } from '../../validators/project-schemas';

const router = Router();

// Project CRUD Endpoints

// POST /api/v1/projects - Create project (NATIONAL_SUPPORT_ADMIN only)
router.post('/',
  requirePermission('PROJECTS', 'CREATE'),
  validateRequest(projectSchemas.createProject),
  async (req, res, next) => {
    try {
      const result = await ProjectService.createProject({
        ...req.body,
        createdBy: req.user?.id
      });

      res.status(201).json({
        ok: true,
        project: result.project,
        message: 'Project created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects - List projects (role-based filtering)
router.get('/',
  requirePermission('PROJECTS', 'LIST'),
  async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status as 'ACTIVE' | 'INACTIVE',
        geographicScope: req.query.geographicScope as 'NATIONAL' | 'REGIONAL',
        regionId: req.query.regionId as string,
        assignedToMe: req.query.assignedToMe === 'true',
        assignedToMyTeam: req.query.assignedToMyTeam === 'true',
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
        sortBy: req.query.sortBy as 'createdAt' | 'title' | 'status',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await ProjectService.listProjects(filters, {
        userId: req.user?.id,
        userRole: req.user?.roles?.[0],
        organizationId: req.user?.organizationId
      });

      res.json({
        ok: true,
        projects: result.projects,
        pagination: result.pagination,
        filters: result.appliedFilters
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/:id - Get project details
router.get('/:id',
  requirePermission('PROJECTS', 'READ'),
  async (req, res, next) => {
    try {
      const result = await ProjectService.getProject(req.params.id, {
        userId: req.user?.id,
        userRole: req.user?.roles?.[0],
        organizationId: req.user?.organizationId
      });

      if (!result.project) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found or access denied'
          }
        });
      }

      res.json({
        ok: true,
        project: result.project,
        assignments: result.assignments,
        accessLevel: result.accessLevel
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/projects/:id - Update project
router.put('/:id',
  requirePermission('PROJECTS', 'UPDATE'),
  validateRequest(projectSchemas.updateProject),
  async (req, res, next) => {
    try {
      const result = await ProjectService.updateProject(
        req.params.id,
        req.body,
        {
          userId: req.user?.id,
          userRole: req.user?.roles?.[0],
          organizationId: req.user?.organizationId
        }
      );

      res.json({
        ok: true,
        project: result.project,
        message: 'Project updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:id - Delete project (soft delete, NATIONAL_SUPPORT_ADMIN only)
router.delete('/:id',
  requirePermission('PROJECTS', 'DELETE'),
  async (req, res, next) => {
    try {
      const result = await ProjectService.deleteProject(req.params.id, {
        userId: req.user?.id,
        organizationId: req.user?.organizationId
      });

      res.json({
        ok: true,
        message: 'Project deleted successfully',
        archivedData: result.archivedData
      });
    } catch (error) {
      next(error);
    }
  }
);

// Project Assignment Endpoints

// POST /api/v1/projects/:id/users - Assign user to project
router.post('/:id/users',
  requirePermission('PROJECTS', 'UPDATE'), // Use UPDATE permission for assignments
  validateRequest(projectSchemas.assignUser),
  async (req, res, next) => {
    try {
      const result = await ProjectService.assignUserToProject(
        req.params.id,
        req.body.userId,
        {
          roleInProject: req.body.roleInProject,
          assignedUntil: req.body.assignedUntil ? new Date(req.body.assignedUntil) : undefined
        },
        {
          userId: req.user?.id,
          userRole: req.user?.roles?.[0],
          organizationId: req.user?.organizationId
        }
      );

      res.status(201).json({
        ok: true,
        assignment: result.assignment,
        message: 'User assigned to project successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:id/users/:userId - Remove user from project
router.delete('/:id/users/:userId',
  requirePermission('PROJECTS', 'UPDATE'),
  async (req, res, next) => {
    try {
      const result = await ProjectService.removeUserFromProject(
        req.params.id,
        req.params.userId,
        {
          userId: req.user?.id,
          userRole: req.user?.roles?.[0],
          organizationId: req.user?.organizationId
        }
      );

      res.json({
        ok: true,
        message: 'User removed from project successfully',
        clearedPermissions: result.clearedPermissions
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/:id/users - List project members
router.get('/:id/users',
  requirePermission('PROJECTS', 'READ'),
  async (req, res, next) => {
    try {
      const result = await ProjectService.getProjectMembers(req.params.id, {
        userId: req.user?.id,
        userRole: req.user?.roles?.[0],
        organizationId: req.user?.organizationId
      });

      res.json({
        ok: true,
        members: result.members,
        statistics: result.statistics
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/projects/:id/teams - Assign team to project
router.post('/:id/teams',
  requirePermission('PROJECTS', 'UPDATE'),
  validateRequest(projectSchemas.assignTeam),
  async (req, res, next) => {
    try {
      const result = await ProjectService.assignTeamToProject(
        req.params.id,
        req.body.teamId,
        {
          assignedRole: req.body.assignedRole,
          assignedUntil: req.body.assignedUntil ? new Date(req.body.assignedUntil) : undefined
        },
        {
          userId: req.user?.id,
          userRole: req.user?.roles?.[0],
          organizationId: req.user?.organizationId
        }
      );

      res.status(201).json({
        ok: true,
        assignment: result.assignment,
        affectedMembers: result.affectedMembers,
        message: 'Team assigned to project successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:id/teams/:teamId - Remove team from project
router.delete('/:id/teams/:teamId',
  requirePermission('PROJECTS', 'UPDATE'),
  async (req, res, next) => {
    try {
      const result = await ProjectService.removeTeamFromProject(
        req.params.id,
        req.params.teamId,
        {
          userId: req.user?.id,
          userRole: req.user?.roles?.[0],
          organizationId: req.user?.organizationId
        }
      );

      res.json({
        ok: true,
        message: 'Team removed from project successfully',
        affectedMembers: result.affectedMembers,
        clearedPermissions: result.clearedPermissions
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/:id/teams - List project teams
router.get('/:id/teams',
  requirePermission('PROJECTS', 'READ'),
  async (req, res, next) => {
    try {
      const result = await ProjectService.getProjectTeams(req.params.id, {
        userId: req.user?.id,
        userRole: req.user?.roles?.[0],
        organizationId: req.user?.organizationId
      });

      res.json({
        ok: true,
        teams: result.teams,
        statistics: result.statistics
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

#### 4.2 API Integration
**File**: `src/routes/api.ts`
**Changes Required**:
```typescript
import { Router } from 'express';
import projectRoutes from './projects';

// Add project routes to existing API router
router.use('/projects', projectRoutes);

// Enhanced existing routes to support project context
// Example: Filter devices by project
router.get('/devices', requirePermission('DEVICES', 'LIST'), async (req, res, next) => {
  const { projectId, ...otherFilters } = req.query;

  // If projectId provided, check project access
  if (projectId) {
    const hasProjectAccess = await authorizationService.checkPermission(
      req.user?.id,
      'PROJECTS',
      'READ',
      { resourceId: projectId as string }
    );

    if (!hasProjectAccess.allowed) {
      return res.status(403).json({
        ok: false,
        error: { code: 'PROJECT_ACCESS_DENIED' }
      });
    }
  }

  // Continue with existing device logic with project filter...
});
```

### Phase 5: Validation Schema

#### 5.1 Project Request Validation
**File**: `src/validators/project-schemas.ts`
**New File**:
```typescript
import { z } from 'zod';

export const projectSchemas = {
  createProject: z.object({
    title: z.string()
      .min(3, 'Project title must be at least 3 characters')
      .max(255, 'Project title must not exceed 255 characters'),
    abbreviation: z.string()
      .min(2, 'Abbreviation must be at least 2 characters')
      .max(10, 'Abbreviation must not exceed 10 characters')
      .regex(/^[A-Z0-9_-]+$/, 'Abbreviation must contain only uppercase letters, numbers, underscores, and hyphens'),
    contactPersonDetails: z.string()
      .max(2000, 'Contact person details must not exceed 2000 characters')
      .optional(),
    geographicScope: z.enum(['NATIONAL', 'REGIONAL']),
    regionId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional()
  }).refine(data => {
    // If REGIONAL scope, regionId is required
    if (data.geographicScope === 'REGIONAL' && !data.regionId) {
      return false;
    }
    return true;
  }, {
    message: 'Region ID is required for regional projects',
    path: ['regionId']
  }),

  updateProject: z.object({
    title: z.string()
      .min(3, 'Project title must be at least 3 characters')
      .max(255, 'Project title must not exceed 255 characters')
      .optional(),
    contactPersonDetails: z.string()
      .max(2000, 'Contact person details must not exceed 2000 characters')
      .optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional()
  }),

  assignUser: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    roleInProject: z.string()
      .max(100, 'Role in project must not exceed 100 characters')
      .optional(),
    assignedUntil: z.string()
      .datetime('Invalid datetime format for assignment end date')
      .optional()
  }),

  assignTeam: z.object({
    teamId: z.string().uuid('Invalid team ID format'),
    assignedRole: z.string()
      .max(100, 'Assigned role must not exceed 100 characters')
      .optional(),
    assignedUntil: z.string()
      .datetime('Invalid datetime format for assignment end date')
      .optional()
  }),

  listProjects: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    geographicScope: z.enum(['NATIONAL', 'REGIONAL']).optional(),
    regionId: z.string().uuid().optional(),
    assignedToMe: z.enum(['true', 'false']).optional(),
    assignedToMyTeam: z.enum(['true', 'false']).optional(),
    search: z.string().max(100, 'Search term must not exceed 100 characters').optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.enum(['createdAt', 'title', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
};

export type CreateProjectRequest = z.infer<typeof projectSchemas.createProject>;
export type UpdateProjectRequest = z.infer<typeof projectSchemas.updateProject>;
export type AssignUserRequest = z.infer<typeof projectSchemas.assignUser>;
export type AssignTeamRequest = z.infer<typeof projectSchemas.assignTeam>;
export type ListProjectsRequest = z.infer<typeof projectSchemas.listProjects>;
```

### Phase 6: Database Migration Strategy

#### 6.1 Migration Implementation
**File**: `drizzle/0004_add_project_tables.sql`
**New Migration**:
```sql
-- Create project status enum
CREATE TYPE "project_status" AS ENUM('ACTIVE', 'INACTIVE');

-- Create project geographic scope enum
CREATE TYPE "project_geographic_scope" AS ENUM('NATIONAL', 'REGIONAL');

-- Create projects table
CREATE TABLE "projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "abbreviation" VARCHAR(50) NOT NULL UNIQUE,
  "contact_person_details" TEXT,
  "status" "project_status" NOT NULL DEFAULT 'ACTIVE',
  "geographic_scope" "project_geographic_scope" NOT NULL DEFAULT 'NATIONAL',
  "region_id" UUID REFERENCES "teams"("id") ON DELETE SET NULL,
  "organization_id" UUID NOT NULL DEFAULT 'org-default',
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMP WITH TIME ZONE
);

-- Create project_assignments table
CREATE TABLE "project_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assigned_by" UUID NOT NULL REFERENCES "users"("id"),
  "role_in_project" VARCHAR(100),
  "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "assigned_until" TIMESTAMP WITH TIME ZONE,
  UNIQUE("project_id", "user_id")
);

-- Create project_team_assignments table
CREATE TABLE "project_team_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "team_id" UUID NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "assigned_by" UUID NOT NULL REFERENCES "users"("id"),
  "assigned_role" VARCHAR(100),
  "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "assigned_until" TIMESTAMP WITH TIME ZONE,
  UNIQUE("project_id", "team_id")
);

-- Add PROJECTS to existing resource_type enum
ALTER TYPE "resource_type" ADD VALUE 'PROJECTS';

-- Create indexes for performance
CREATE INDEX "idx_project_abbreviation" ON "projects"("abbreviation");
CREATE INDEX "idx_project_status" ON "projects"("status");
CREATE INDEX "idx_project_organization" ON "projects"("organization_id");
CREATE INDEX "idx_project_created_by" ON "projects"("created_by");
CREATE INDEX "idx_project_assignment_unique" ON "project_assignments"("project_id", "user_id");
CREATE INDEX "idx_project_assignment_project" ON "project_assignments"("project_id");
CREATE INDEX "idx_project_assignment_user" ON "project_assignments"("user_id");
CREATE INDEX "idx_project_assignment_active" ON "project_assignments"("is_active");
CREATE INDEX "idx_project_team_assignment_unique" ON "project_team_assignments"("project_id", "team_id");
CREATE INDEX "idx_project_team_assignment_project" ON "project_team_assignments"("project_id");
CREATE INDEX "idx_project_team_assignment_team" ON "project_team_assignments"("team_id");
CREATE INDEX "idx_project_team_assignment_active" ON "project_team_assignments"("is_active");

-- Insert PROJECTS permissions
INSERT INTO "permissions" ("id", "resource", "action", "scope", "description", "created_at") VALUES
  (gen_random_uuid(), 'PROJECTS', 'CREATE', 'ORGANIZATION', 'Create new projects at organization level', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'READ', 'ORGANIZATION', 'Read all projects at organization level', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'READ', 'REGION', 'Read projects within assigned region', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'READ', 'ASSIGNED', 'Read projects assigned to user or team', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'UPDATE', 'ORGANIZATION', 'Update any project in organization', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'UPDATE', 'REGION', 'Update projects within assigned region', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'DELETE', 'ORGANIZATION', 'Delete projects in organization', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'LIST', 'ORGANIZATION', 'List all projects in organization', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'LIST', 'REGION', 'List projects within assigned region', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'LIST', 'ASSIGNED', 'List projects assigned to user or team', NOW()),
  (gen_random_uuid(), 'PROJECTS', 'MANAGE', 'ORGANIZATION', 'Full project management access', NOW());

-- Assign project permissions to NATIONAL_SUPPORT_ADMIN
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'NATIONAL_SUPPORT_ADMIN'
  AND p.resource = 'PROJECTS';

-- Assign basic project permissions to other roles
-- REGIONAL_MANAGER - Regional access
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'REGIONAL_MANAGER'
  AND p.resource = 'PROJECTS'
  AND p.scope IN ('REGION', 'ASSIGNED')
  AND p.action IN ('READ', 'UPDATE', 'LIST');

-- FIELD_SUPERVISOR, TEAM_MEMBER, DEVICE_MANAGER - Assigned access only
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name IN ('FIELD_SUPERVISOR', 'TEAM_MEMBER', 'DEVICE_MANAGER')
  AND p.resource = 'PROJECTS'
  AND p.scope = 'ASSIGNED'
  AND p.action IN ('READ', 'LIST');

-- SYSTEM_ADMIN - Management access
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name = 'SYSTEM_ADMIN'
  AND p.resource = 'PROJECTS'
  AND p.action = 'MANAGE';

-- SUPPORT_AGENT, AUDITOR, POLICY_ADMIN - Read access
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r, "permissions" p
WHERE r.name IN ('SUPPORT_AGENT', 'AUDITOR', 'POLICY_ADMIN')
  AND p.resource = 'PROJECTS'
  AND p.action IN ('READ', 'LIST');
```

#### 6.2 Project Seeding Script
**File**: `scripts/seed-projects.ts`
**New File**:
```typescript
#!/usr/bin/env tsx

/**
 * Project Seeding Script
 *
 * Creates sample projects for testing and development
 * Supports both national and regional projects
 */

import { db } from '../src/lib/db';
import { projects, projectAssignments, projectTeamAssignments } from '../src/lib/db/schema';
import { logger } from '../src/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Sample project data
const SAMPLE_PROJECTS = [
  {
    title: 'National Health Survey 2025',
    abbreviation: 'NHS2025',
    contactPersonDetails: 'Dr. Rajesh Kumar - National Survey Coordinator\nPhone: +91-11-2345-6789\nEmail: rajesh.kumar@healthsurvey.in',
    geographicScope: 'NATIONAL' as const,
    status: 'ACTIVE' as const
  },
  {
    title: 'Delhi Urban Development Study',
    abbreviation: 'DUDS2025',
    contactPersonDetails: 'Ms. Priya Sharma - Regional Project Lead\nPhone: +91-11-9876-5432\nEmail: priya.sharma@duds.in',
    geographicScope: 'REGIONAL' as const,
    status: 'ACTIVE' as const
  },
  {
    title: 'Rural Education Assessment',
    abbreviation: 'REA2025',
    contactPersonDetails: 'Prof. Amit Singh - Education Research Head\nPhone: +91-22-4567-8901\nEmail: amit.singh@rea.in',
    geographicScope: 'NATIONAL' as const,
    status: 'ACTIVE' as const
  }
];

async function seedProjects() {
  try {
    console.log('🌱 Starting project seeding...');

    // Get users for assignments
    const nationalSupportAdmin = await getTestUser('NATIONAL_SUPPORT_ADMIN');
    const regionalManager = await getTestUser('REGIONAL_MANAGER');
    const fieldSupervisor = await getTestUser('FIELD_SUPERVISOR');
    const deviceManager = await getTestUser('DEVICE_MANAGER');

    if (!nationalSupportAdmin) {
      throw new Error('NATIONAL_SUPPORT_ADMIN user not found. Run db:seed-fixed first.');
    }

    // Create projects
    const createdProjects = [];
    for (const projectData of SAMPLE_PROJECTS) {
      const projectId = uuidv4();

      await db.insert(projects).values({
        id: projectId,
        title: projectData.title,
        abbreviation: projectData.abbreviation,
        contactPersonDetails: projectData.contactPersonDetails,
        status: projectData.status,
        geographicScope: projectData.geographicScope,
        createdBy: nationalSupportAdmin.id
      }).onConflictDoNothing();

      createdProjects.push({ ...projectData, id: projectId });
      console.log(`  ✓ Created project: ${projectData.title} (${projectData.abbreviation})`);
    }

    // Create sample assignments
    await createSampleAssignments(createdProjects, {
      nationalSupportAdmin,
      regionalManager,
      fieldSupervisor,
      deviceManager
    });

    console.log('\n✅ Project seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - Projects created: ${createdProjects.length}`);
    console.log(`  - Sample assignments created`);

    return {
      success: true,
      projectsCreated: createdProjects.length,
      projects: createdProjects
    };

  } catch (error) {
    console.error('❌ Project seeding failed:', error);
    logger.error('Project seeding failed', { error });
    throw error;
  }
}

async function createSampleAssignments(projects: any[], users: any) {
  for (const project of projects) {
    // Assign regional manager to regional projects
    if (project.geographicScope === 'REGIONAL' && users.regionalManager) {
      await db.insert(projectAssignments).values({
        projectId: project.id,
        userId: users.regionalManager.id,
        assignedBy: users.nationalSupportAdmin.id,
        roleInProject: 'Regional Project Lead'
      }).onConflictDoNothing();
    }

    // Assign field supervisor to national projects
    if (project.geographicScope === 'NATIONAL' && users.fieldSupervisor) {
      await db.insert(projectAssignments).values({
        projectId: project.id,
        userId: users.fieldSupervisor.id,
        assignedBy: users.nationalSupportAdmin.id,
        roleInProject: 'Field Coordinator'
      }).onConflictDoNothing();
    }

    // Assign device manager to all projects
    if (users.deviceManager) {
      await db.insert(projectAssignments).values({
        projectId: project.id,
        userId: users.deviceManager.id,
        assignedBy: users.nationalSupportAdmin.id,
        roleInProject: 'Device Management Lead'
      }).onConflictDoNothing();
    }
  }
}

async function getTestUser(roleName: string) {
  // This would query your existing test users
  // Implementation depends on your user query structure
  return null; // Placeholder
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedProjects()
        .then(() => {
          console.log('\n🎉 Project seeding completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Project seeding failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage:');
      console.log('  tsx scripts/seed-projects.ts seed   - Seed sample projects');
      process.exit(1);
  }
}

export { seedProjects };
```

## 🧪 Testing Strategy

### Unit Tests (30 scenarios)
| Test Category | Test Cases | Focus |
|---------------|------------|-------|
| **ProjectService CRUD** | 12 | Project create, read, update, delete operations |
| **Project Assignment Logic** | 8 | User and team assignment management |
| **Project Permission Service** | 10 | Project-based access control and boundaries |

### Integration Tests (40 scenarios)
| Test Category | Test Cases | Focus |
|---------------|------------|-------|
| **Project API Endpoints** | 15 | All project CRUD and assignment endpoints |
| **RBAC Integration** | 12 | Project access control by role |
| **Geographic Boundaries** | 8 | National vs regional project access |
| **Assignment Workflows** | 5 | Complete assignment scenarios |

### Security Tests (20 scenarios)
| Test Category | Test Cases | Focus |
|---------------|------------|-------|
| **Project Access Bypass** | 7 | Attempt unauthorized project access |
| **Assignment Privilege Escalation** | 6 | Try unauthorized project assignments |
| **Geographic Boundary Violations** | 7 | Cross-region project access attempts |

## 📅 Implementation Timeline

| Phase | Duration | Dependencies | Success Criteria |
|-------|----------|--------------|------------------|
| **Phase 1: Database Schema** | 1 week | Drizzle migration strategy | Project tables deployed |
| **Phase 2: Service Layer** | 1 week | Phase 1 complete | ProjectService functional |
| **Phase 3: Authorization** | 1 week | Phase 2 complete | Project permissions working |
| **Phase 4: API Implementation** | 1 week | Phase 3 complete | All project endpoints functional |
| **Phase 5: Validation & Migration** | 1 week | Phase 4 complete | Migration scripts tested |
| **Phase 6: Testing** | 1 week | Phase 5 complete | 90%+ test coverage |
| **Total** | **6 weeks** | | Production-ready PROJECT system |

## 🧩 Implementation Strategy (Atomic Tasks)

### Database & Schema
1. **Create project migrations** with proper indexes and constraints
2. **Update RBAC permissions** to include PROJECTS resource type
3. **Create project seeding scripts** for testing and development

### Service Layer
1. **Implement ProjectService** with full CRUD and assignment capabilities
2. **Integrate project permissions** into existing AuthorizationService
3. **Create project assignment validation** and boundary checking

### API Layer
1. **Create project management routes** following existing patterns
2. **Add project context** to existing device/user telemetry endpoints
3. **Implement project-based filtering** in existing list endpoints

### Testing & Validation
1. **Create comprehensive test suite** for all project functionality
2. **Test RBAC integration** with all 9 roles
3. **Performance test** project permission resolution and caching

### Documentation & Rollout
1. **Update API documentation** with project endpoints
2. **Create project management guide** for administrators
3. **Prepare deployment checklist** with migration steps

## 🚨 Risk Assessment & Mitigation

### High-Risk Areas
1. **Permission Complexity**
   - Risk: Project permissions conflict with existing RBAC
   - Mitigation: Careful permission matrix design, comprehensive testing

2. **Performance Impact**
   - Risk: Project permission checks slow down API responses
   - Mitigation: Efficient caching, optimized database queries

3. **Data Migration**
   - Risk: Schema migration affects existing functionality
   - Mitigation: Non-breaking changes, backward compatibility

### Security Considerations
1. **Project Boundary Enforcement**
   - Prevent cross-project data leakage
   - Validate all project access attempts

2. **Assignment Security**
   - Control who can assign users/teams to projects
   - Audit all assignment changes

3. **Permission Inheritance**
   - Ensure project assignments don't override role permissions
   - Maintain clear permission hierarchy

## 📈 Success Metrics

### Functionality Metrics
- **Project CRUD Operations**: 100% success rate
- **Assignment Workflows**: Complete individual and team assignment support
- **Permission Resolution**: <100ms for project access checks

### Security Metrics
- **Access Control Violations**: Zero successful bypass attempts
- **Permission Escalation**: Zero successful privilege escalation attempts
- **Audit Trail**: 100% project operations logged

### Performance Metrics
- **API Response Times**: <200ms for project endpoints
- **Permission Cache Hit Rate**: >90% for repeated checks
- **Database Query Performance**: <50ms for project list queries

## 🎯 Next Steps

1. **Immediate**: Begin database schema design and migration planning
2. **Week 1**: Implement Phase 1 - Project database schema
3. **Parallel**: Develop ProjectService and permission integration
4. **Follow-up**: Create admin interface for project management
5. **Long-term**: Consider project-based analytics and reporting

---

**Author**: Claude Code Analysis
**Review Required**: Security Team Lead, Backend Team Lead
**Security Review**: Information Security Team
**Testing Required**: QA Security Team