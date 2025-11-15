import { eq, and, or, ilike, desc, asc, isNull, not } from 'drizzle-orm';
import { db } from '../lib/db/index.js';
import {
  projects,
  projectAssignments,
  projectTeamAssignments,
  users,
  teams,
  type Project,
  type NewProject,
  type ProjectAssignment,
  type NewProjectAssignment,
  type ProjectTeamAssignment,
  type NewProjectTeamAssignment,
  type User,
  type Team
} from '../lib/db/schema.js';

export interface ProjectCreateInput {
  title: string;
  abbreviation: string;
  contactPersonDetails?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  geographicScope: 'NATIONAL' | 'REGIONAL';
  regionId?: string | null;
  organizationId?: string;
  createdBy: string;
}

export interface ProjectUpdateInput {
  title?: string;
  abbreviation?: string;
  contactPersonDetails?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  geographicScope?: 'NATIONAL' | 'REGIONAL';
  regionId?: string | null;
  organizationId?: string;
}

export interface ProjectListOptions {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  geographicScope?: 'NATIONAL' | 'REGIONAL' | 'ALL';
  organizationId?: string;
  regionId?: string;
  search?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'abbreviation';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface ProjectWithDetails extends Project {
  createdByUser?: {
    id: string;
    displayName: string;
    email?: string | null;
  };
  region?: {
    id: string;
    name: string;
  } | null;
  memberCount?: number;
  teamCount?: number;
}

export interface ProjectAssignmentWithDetails extends ProjectAssignment {
  user?: User | null;
  project?: {
    id: string;
    title: string;
    abbreviation: string;
  } | null;
}

export interface ProjectTeamAssignmentWithDetails extends ProjectTeamAssignment {
  team?: Team | null;
  project?: {
    id: string;
    title: string;
    abbreviation: string;
  } | null;
}

export class ProjectService {
  /**
   * Create a new project
   */
  async createProject(input: ProjectCreateInput): Promise<ProjectWithDetails> {
    const projectData: NewProject = {
      title: input.title.trim(),
      abbreviation: input.abbreviation.toUpperCase().trim(),
      contactPersonDetails: input.contactPersonDetails?.trim() || null,
      status: input.status,
      geographicScope: input.geographicScope,
      regionId: input.regionId || null,
      organizationId: input.organizationId || '550e8400-e29b-41d4-a716-446655440000',
      createdBy: input.createdBy
    };

    const [project] = await db.insert(projects)
      .values(projectData)
      .returning();

    return this.getProjectWithDetails(project.id);
  }

  /**
   * Get project by ID with details
   */
  async getProject(id: string): Promise<ProjectWithDetails | null> {
    return this.getProjectWithDetails(id);
  }

  /**
   * Get project with additional details (creator, region, member counts)
   */
  private async getProjectWithDetails(id: string): Promise<ProjectWithDetails | null> {
    try {
      // Get basic project info (exclude soft-deleted projects)
      const [project] = await db.select()
        .from(projects)
        .where(and(
          eq(projects.id, id),
          isNull(projects.deletedAt)
        ));

      if (!project) {
        return null;
      }

    // Get creator details
    const [creator] = await db.select({
      id: users.id,
      displayName: users.displayName,
      email: users.email
    })
      .from(users)
      .where(eq(users.id, project.createdBy))
      .limit(1);

    // Get region details if applicable
    let region = null;
    if (project.regionId) {
      const [regionData] = await db.select({
        id: teams.id,
        name: teams.name
      })
        .from(teams)
        .where(eq(teams.id, project.regionId))
        .limit(1);
      region = regionData;
    }

    // Get member and team counts
    const [memberCount] = await db.select({ count: projectAssignments.id })
      .from(projectAssignments)
      .where(and(
        eq(projectAssignments.projectId, id),
        eq(projectAssignments.isActive, true)
      ));

    const [teamCount] = await db.select({ count: projectTeamAssignments.id })
      .from(projectTeamAssignments)
      .where(and(
        eq(projectTeamAssignments.projectId, id),
        eq(projectTeamAssignments.isActive, true)
      ));

    return {
      ...project,
      createdByUser: creator,
      region,
      memberCount: Number(memberCount?.count) || 0,
      teamCount: Number(teamCount?.count) || 0
    };
    } catch (error) {
      // Handle invalid UUID or other database errors
      return null;
    }
  }

  /**
   * List projects with filtering and pagination
   */
  async listProjects(options: ProjectListOptions = {}): Promise<{
    projects: ProjectWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      status = 'ALL',
      geographicScope = 'ALL',
      organizationId,
      regionId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false
    } = options;

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (!includeDeleted) {
      conditions.push(isNull(projects.deletedAt));
    }

    if (status !== 'ALL') {
      conditions.push(eq(projects.status, status));
    }

    if (geographicScope !== 'ALL') {
      conditions.push(eq(projects.geographicScope, geographicScope));
    }

    if (organizationId) {
      conditions.push(eq(projects.organizationId, organizationId));
    }

    if (regionId) {
      conditions.push(eq(projects.regionId, regionId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(projects.title, `%${search}%`),
          ilike(projects.abbreviation, `%${search}%`),
          ilike(projects.contactPersonDetails, `%${search}%`)
        )
      );
    }

    // Build order by clause
    let orderBy;
    const sortColumn = projects[sortBy as keyof typeof projects];
    if (sortColumn) {
      orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
    } else {
      orderBy = desc(projects.createdAt);
    }

    // Get total count
    const [countResult] = await db.select({ count: projects.id })
      .from(projects)
      .where(and(...conditions));

    const total = Number(countResult?.count) || 0;
    const totalPages = Math.ceil(total / limit);

    // Get projects with creator and region details
    const projectList = await db.select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Enhance with details for each project
    const projectsWithDetails: ProjectWithDetails[] = [];
    for (const project of projectList) {
      const enhancedProject = await this.getProjectWithDetails(project.id);
      if (enhancedProject) {
        projectsWithDetails.push(enhancedProject);
      }
    }

    return {
      projects: projectsWithDetails,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Update project
   */
  async updateProject(id: string, input: ProjectUpdateInput): Promise<ProjectWithDetails | null> {
    const updateData: Partial<Project> = {
      updatedAt: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title.trim();
    }
    if (input.abbreviation !== undefined) {
      updateData.abbreviation = input.abbreviation.toUpperCase().trim();
    }
    if (input.contactPersonDetails !== undefined) {
      updateData.contactPersonDetails = input.contactPersonDetails?.trim() || null;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.geographicScope !== undefined) {
      updateData.geographicScope = input.geographicScope;
    }
    if (input.regionId !== undefined) {
      updateData.regionId = input.regionId;
    }
    if (input.organizationId !== undefined) {
      updateData.organizationId = input.organizationId;
    }

    try {
      const [updatedProject] = await db.update(projects)
        .set(updateData)
        .where(eq(projects.id, id))
        .returning();

      if (!updatedProject) {
        return null;
      }

      return this.getProjectWithDetails(id);
    } catch (error) {
      // Handle invalid UUID or other database errors
      return null;
    }
  }

  /**
   * Soft delete project
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      const [deletedProject] = await db.update(projects)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();

      return !!deletedProject;
    } catch (error) {
      // Handle invalid UUID or other database errors
      return false;
    }
  }

  /**
   * Restore soft deleted project
   */
  async restoreProject(id: string): Promise<ProjectWithDetails | null> {
    const [restoredProject] = await db.update(projects)
      .set({
        deletedAt: null,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning();

    if (!restoredProject) {
      return null;
    }

    return this.getProjectWithDetails(id);
  }

  /**
   * Permanently delete project (hard delete)
   */
  async permanentDeleteProject(id: string): Promise<boolean> {
    try {
      await db.delete(projects).where(eq(projects.id, id));
      return true;
    } catch (error) {
      console.error('Error permanently deleting project:', error);
      return false;
    }
  }

  /**
   * Check if project abbreviation is unique
   */
  async isAbbreviationUnique(abbreviation: string, excludeId?: string): Promise<boolean> {
    const conditions = [
      eq(projects.abbreviation, abbreviation.toUpperCase().trim()),
      isNull(projects.deletedAt)
    ];

    if (excludeId) {
      conditions.push(not(eq(projects.id, excludeId)));
    }

    const [existing] = await db.select({ id: projects.id })
      .from(projects)
      .where(and(...conditions))
      .limit(1);

    return !existing;
  }

  /**
   * Get projects by user ID
   */
  async getUserProjects(userId: string, options: ProjectListOptions = {}): Promise<{
    projects: ProjectWithDetails[];
    total: number;
  }> {
    const {
      status = 'ALL',
      geographicScope = 'ALL',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Build base conditions
    const projectConditions = [];

    if (status !== 'ALL') {
      projectConditions.push(eq(projects.status, status));
    }

    if (geographicScope !== 'ALL') {
      projectConditions.push(eq(projects.geographicScope, geographicScope));
    }

    if (search) {
      projectConditions.push(
        or(
          ilike(projects.title, `%${search}%`),
          ilike(projects.abbreviation, `%${search}%`)
        )
      );
    }

    projectConditions.push(isNull(projects.deletedAt));

    // Get projects through user assignments
    const userProjectIds = await db.select({ projectId: projectAssignments.projectId })
      .from(projectAssignments)
      .where(and(
        eq(projectAssignments.userId, userId),
        eq(projectAssignments.isActive, true)
      ));

    // Get projects through team assignments
    const userTeams = await db.select({ teamId: users.teamId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const teamProjectIds = [];
    if (userTeams.length > 0 && userTeams[0].teamId) {
      const teamProjects = await db.select({ projectId: projectTeamAssignments.projectId })
        .from(projectTeamAssignments)
        .where(and(
          eq(projectTeamAssignments.teamId, userTeams[0].teamId),
          eq(projectTeamAssignments.isActive, true)
        ));
      teamProjectIds.push(...teamProjects);
    }

    // Combine project IDs
    const allProjectIds = [
      ...userProjectIds.map(p => p.projectId),
      ...teamProjectIds.map(p => p.projectId)
    ];

    if (allProjectIds.length === 0) {
      return { projects: [], total: 0 };
    }

    // Get unique project IDs
    const uniqueProjectIds = Array.from(new Set(allProjectIds));

    // Build order by clause
    let orderBy;
    const sortColumn = projects[sortBy as keyof typeof projects];
    if (sortColumn) {
      orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
    } else {
      orderBy = desc(projects.createdAt);
    }

    // Get projects
    const projectList = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, uniqueProjectIds[0]), // This will need adjustment for multiple IDs
        ...projectConditions
      ))
      .orderBy(orderBy);

    // For now, we'll get projects one by one (this can be optimized)
    const projectsWithDetails: ProjectWithDetails[] = [];
    for (const projectId of uniqueProjectIds) {
      const project = await this.getProjectWithDetails(projectId);
      if (project) {
        let includeProject = true;

        if (status !== 'ALL' && (project as any).status !== status) {
          includeProject = false;
        }

        if (geographicScope !== 'ALL' && (project as any).geographicScope !== geographicScope) {
          includeProject = false;
        }

        if (search) {
          const searchLower = search.toLowerCase();
          if (!(
            ((project as any).title || '').toLowerCase().includes(searchLower) ||
            ((project as any).abbreviation || '').toLowerCase().includes(searchLower)
          )) {
            includeProject = false;
          }
        }

        if (includeProject) {
          projectsWithDetails.push(project);
        }
      }
    }

    // Sort the results
    projectsWithDetails.sort((a, b) => {
      const aValue = a[sortBy as keyof ProjectWithDetails];
      const bValue = b[sortBy as keyof ProjectWithDetails];

      if (aValue === undefined || bValue === undefined) return 0;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return {
      projects: projectsWithDetails,
      total: projectsWithDetails.length
    };
  }

  /**
   * Assign user to project
   */
  async assignUserToProject(
    projectId: string,
    userId: string,
    assignedBy: string,
    roleInProject?: string,
    assignedUntil?: Date
  ): Promise<ProjectAssignmentWithDetails> {
    const assignmentData: NewProjectAssignment = {
      projectId,
      userId,
      assignedBy,
      roleInProject: roleInProject || null,
      assignedUntil: assignedUntil || null
    };

    const [assignment] = await db.insert(projectAssignments)
      .values(assignmentData)
      .returning();

    return this.getProjectAssignmentWithDetails(assignment.id);
  }

  /**
   * Assign team to project
   */
  async assignTeamToProject(
    projectId: string,
    teamId: string,
    assignedBy: string,
    assignedRole?: string,
    assignedUntil?: Date
  ): Promise<ProjectTeamAssignmentWithDetails> {
    const assignmentData: NewProjectTeamAssignment = {
      projectId,
      teamId,
      assignedBy,
      assignedRole: assignedRole || null,
      assignedUntil: assignedUntil || null
    };

    const [assignment] = await db.insert(projectTeamAssignments)
      .values(assignmentData)
      .returning();

    return this.getProjectTeamAssignmentWithDetails(assignment.id);
  }

  /**
   * Remove user from project
   */
  async removeUserFromProject(projectId: string, userId: string): Promise<boolean> {
    const [removed] = await db.update(projectAssignments)
      .set({ isActive: false })
      .where(and(
        eq(projectAssignments.projectId, projectId),
        eq(projectAssignments.userId, userId),
        eq(projectAssignments.isActive, true)
      ))
      .returning();

    return !!removed;
  }

  /**
   * Remove team from project
   */
  async removeTeamFromProject(projectId: string, teamId: string): Promise<boolean> {
    const [removed] = await db.update(projectTeamAssignments)
      .set({ isActive: false })
      .where(and(
        eq(projectTeamAssignments.projectId, projectId),
        eq(projectTeamAssignments.teamId, teamId),
        eq(projectTeamAssignments.isActive, true)
      ))
      .returning();

    return !!removed;
  }

  /**
   * Get project members
   */
  async getProjectMembers(projectId: string): Promise<{
    users: ProjectAssignmentWithDetails[];
    teams: ProjectTeamAssignmentWithDetails[];
    totalMembers: number;
  }> {
    try {
      // Get individual user assignments
      const userAssignments = await db.select()
        .from(projectAssignments)
        .where(and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.isActive, true)
        ));

    const usersWithDetails: ProjectAssignmentWithDetails[] = [];
    for (const assignment of userAssignments) {
      const detailedAssignment = await this.getProjectAssignmentWithDetails(assignment.id);
      if (detailedAssignment) {
        usersWithDetails.push(detailedAssignment);
      }
    }

    // Get team assignments
    const teamAssignments = await db.select()
      .from(projectTeamAssignments)
      .where(and(
        eq(projectTeamAssignments.projectId, projectId),
        eq(projectTeamAssignments.isActive, true)
      ));

    const teamsWithDetails: ProjectTeamAssignmentWithDetails[] = [];
    let teamMemberCount = 0;

    for (const assignment of teamAssignments) {
      const detailedAssignment = await this.getProjectTeamAssignmentWithDetails(assignment.id);
      if (detailedAssignment) {
        teamsWithDetails.push(detailedAssignment);

        // Count team members
        if (detailedAssignment.team) {
          const [memberCount] = await db.select({ count: users.id })
            .from(users)
            .where(and(
              eq(users.teamId, detailedAssignment.team.id),
              eq(users.isActive, true)
            ));
          teamMemberCount += Number(memberCount?.count) || 0;
        }
      }
    }

    const totalMembers = usersWithDetails.length + teamMemberCount;

    return {
      users: usersWithDetails,
      teams: teamsWithDetails,
      totalMembers
    };
    } catch (error) {
      // Handle invalid UUID or other database errors
      return {
        users: [],
        teams: [],
        totalMembers: 0
      };
    }
  }

  /**
   * Get project assignment with details
   */
  private async getProjectAssignmentWithDetails(id: string): Promise<ProjectAssignmentWithDetails | null> {
    const [assignment] = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.id, id))
      .limit(1);

    if (!assignment) {
      return null;
    }

    // Get user details
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, assignment.userId))
      .limit(1);

    // Get project details
    const [project] = await db.select({
      id: projects.id,
      title: projects.title,
      abbreviation: projects.abbreviation
    })
      .from(projects)
      .where(eq(projects.id, assignment.projectId))
      .limit(1);

    return {
      ...assignment,
      user,
      project
    };
  }

  /**
   * Get project team assignment with details
   */
  private async getProjectTeamAssignmentWithDetails(id: string): Promise<ProjectTeamAssignmentWithDetails | null> {
    const [assignment] = await db.select()
      .from(projectTeamAssignments)
      .where(eq(projectTeamAssignments.id, id))
      .limit(1);

    if (!assignment) {
      return null;
    }

    // Get team details
    const [team] = await db.select()
      .from(teams)
      .where(eq(teams.id, assignment.teamId))
      .limit(1);

    // Get project details
    const [project] = await db.select({
      id: projects.id,
      title: projects.title,
      abbreviation: projects.abbreviation
    })
      .from(projects)
      .where(eq(projects.id, assignment.projectId))
      .limit(1);

    return {
      ...assignment,
      team,
      project
    };
  }

  /**
   * Validate project access for a user
   */
  async canUserAccessProject(userId: string, projectId: string): Promise<{
    canAccess: boolean;
    accessType: 'direct' | 'team' | 'none';
    role?: string;
  }> {
    // Check direct assignment
    const [directAssignment] = await db.select()
      .from(projectAssignments)
      .where(and(
        eq(projectAssignments.projectId, projectId),
        eq(projectAssignments.userId, userId),
        eq(projectAssignments.isActive, true)
      ))
      .limit(1);

    if (directAssignment) {
      return {
        canAccess: true,
        accessType: 'direct',
        role: directAssignment.roleInProject || undefined
      };
    }

    // Check team assignment
    const [userTeam] = await db.select({ teamId: users.teamId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userTeam?.teamId) {
      const [teamAssignment] = await db.select()
        .from(projectTeamAssignments)
        .where(and(
          eq(projectTeamAssignments.projectId, projectId),
          eq(projectTeamAssignments.teamId, userTeam.teamId),
          eq(projectTeamAssignments.isActive, true)
        ))
        .limit(1);

      if (teamAssignment) {
        return {
          canAccess: true,
          accessType: 'team',
          role: teamAssignment.assignedRole || undefined
        };
      }
    }

    return {
      canAccess: false,
      accessType: 'none'
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService();