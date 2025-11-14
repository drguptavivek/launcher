import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../lib/db/index.js';
import { projectService } from '../../services/project-service.js';
import { projects, users, teams } from '../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

describe('ProjectService', () => {
  let testUser: any;
  let testTeam: any;
  let testProject: any;

  beforeEach(async () => {
    // Create a test team
    const [team] = await db.insert(teams).values({
      name: 'Test Team for Projects',
      stateId: 'TS',
      timezone: 'UTC'
    }).returning();
    testTeam = team;

    // Create a test user
    const [user] = await db.insert(users).values({
      code: 'TESTPROJ',
      teamId: testTeam.id,
      displayName: 'Test User for Projects',
      email: 'testproj@example.com',
      role: 'TEAM_MEMBER'
    }).returning();
    testUser = user;

    // Create a test project
    testProject = await projectService.createProject({
      title: 'Test Project',
      abbreviation: 'TP',
      contactPersonDetails: 'Test Contact Person',
      status: 'ACTIVE',
      geographicScope: 'NATIONAL',
      regionId: null,
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      createdBy: testUser.id
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testProject?.id) {
      await db.delete(projects).where(eq(projects.id, testProject.id));
    }
    if (testUser?.id) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
    if (testTeam?.id) {
      await db.delete(teams).where(eq(teams.id, testTeam.id));
    }
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        title: 'New Test Project',
        abbreviation: 'NTP',
        contactPersonDetails: 'New Contact Person',
        status: 'ACTIVE' as const,
        geographicScope: 'REGIONAL' as const,
        regionId: testTeam.id,
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        createdBy: testUser.id
      };

      const project = await projectService.createProject(projectData);

      expect(project).toBeDefined();
      expect(project.title).toBe(projectData.title);
      expect(project.abbreviation).toBe(projectData.abbreviation.toUpperCase());
      expect(project.status).toBe(projectData.status);
      expect(project.geographicScope).toBe(projectData.geographicScope);
      expect(project.createdBy).toBe(testUser.id);
      expect(project.createdByUser?.displayName).toBe(testUser.displayName);

      // Clean up
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    it('should trim title and abbreviation', async () => {
      const project = await projectService.createProject({
        title: '  Trimming Test Project  ',
        abbreviation: '  ttp  ',
        status: 'ACTIVE',
        geographicScope: 'NATIONAL',
        createdBy: testUser.id
      });

      expect(project.title).toBe('Trimming Test Project');
      expect(project.abbreviation).toBe('TTP');

      // Clean up
      await db.delete(projects).where(eq(projects.id, project.id));
    });
  });

  describe('getProject', () => {
    it('should retrieve a project by ID', async () => {
      const project = await projectService.getProject(testProject.id);

      expect(project).toBeDefined();
      expect(project?.id).toBe(testProject.id);
      expect(project?.title).toBe(testProject.title);
      expect(project?.createdByUser?.displayName).toBe(testUser.displayName);
    });

    it('should return null for non-existent project', async () => {
      const project = await projectService.getProject('non-existent-id');
      expect(project).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      const updateData = {
        title: 'Updated Test Project',
        abbreviation: 'UTP',
        status: 'INACTIVE' as const
      };

      const updatedProject = await projectService.updateProject(testProject.id, updateData);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.title).toBe(updateData.title);
      expect(updatedProject?.abbreviation).toBe(updateData.abbreviation.toUpperCase());
      expect(updatedProject?.status).toBe(updateData.status);
    });

    it('should return null when updating non-existent project', async () => {
      const result = await projectService.updateProject('non-existent-id', {
        title: 'Updated Title'
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should soft delete a project', async () => {
      const deleted = await projectService.deleteProject(testProject.id);
      expect(deleted).toBe(true);

      const project = await projectService.getProject(testProject.id);
      expect(project).toBeNull(); // getProject excludes deleted projects
    });

    it('should return false when deleting non-existent project', async () => {
      const deleted = await projectService.deleteProject('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('restoreProject', () => {
    it('should restore a soft deleted project', async () => {
      // First delete the project
      await projectService.deleteProject(testProject.id);

      // Then restore it
      const restoredProject = await projectService.restoreProject(testProject.id);

      expect(restoredProject).toBeDefined();
      expect(restoredProject?.id).toBe(testProject.id);
      expect(restoredProject?.title).toBe(testProject.title);
    });
  });

  describe('isAbbreviationUnique', () => {
    it('should return true for unique abbreviation', async () => {
      const isUnique = await projectService.isAbbreviationUnique('UNIQUE');
      expect(isUnique).toBe(true);
    });

    it('should return false for existing abbreviation', async () => {
      const isUnique = await projectService.isAbbreviationUnique('TP'); // testProject abbreviation
      expect(isUnique).toBe(false);
    });

    it('should return true when excluding the project being updated', async () => {
      const isUnique = await projectService.isAbbreviationUnique('TP', testProject.id);
      expect(isUnique).toBe(true);
    });
  });

  describe('assignUserToProject', () => {
    it('should assign user to project successfully', async () => {
      const assignment = await projectService.assignUserToProject(
        testProject.id,
        testUser.id,
        testUser.id,
        'Project Lead'
      );

      expect(assignment).toBeDefined();
      expect(assignment.projectId).toBe(testProject.id);
      expect(assignment.userId).toBe(testUser.id);
      expect(assignment.roleInProject).toBe('Project Lead');
      expect(assignment.user?.displayName).toBe(testUser.displayName);
    });
  });

  describe('canUserAccessProject', () => {
    it('should allow access for directly assigned user', async () => {
      // First assign the user to the project
      await projectService.assignUserToProject(testProject.id, testUser.id, testUser.id);

      const access = await projectService.canUserAccessProject(testUser.id, testProject.id);

      expect(access.canAccess).toBe(true);
      expect(access.accessType).toBe('direct');
    });

    it('should deny access for unassigned user', async () => {
      const access = await projectService.canUserAccessProject(testUser.id, testProject.id);

      expect(access.canAccess).toBe(false);
      expect(access.accessType).toBe('none');
    });
  });

  describe('listProjects', () => {
    it('should list projects with pagination', async () => {
      // Create additional test projects
      const project2 = await projectService.createProject({
        title: 'Test Project 2',
        abbreviation: 'TP2',
        status: 'ACTIVE',
        geographicScope: 'NATIONAL',
        createdBy: testUser.id
      });

      const project3 = await projectService.createProject({
        title: 'Test Project 3',
        abbreviation: 'TP3',
        status: 'INACTIVE',
        geographicScope: 'NATIONAL',
        createdBy: testUser.id
      });

      try {
        const result = await projectService.listProjects({
          page: 1,
          limit: 2,
          status: 'ALL'
        });

        expect(result.projects).toBeDefined();
        expect(result.total).toBeGreaterThanOrEqual(3);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(2);
        expect(result.totalPages).toBeGreaterThanOrEqual(2);
        expect(result.projects.length).toBeLessThanOrEqual(2);
      } finally {
        // Clean up
        await db.delete(projects).where(eq(projects.id, project2.id));
        await db.delete(projects).where(eq(projects.id, project3.id));
      }
    });

    it('should filter projects by status', async () => {
      const result = await projectService.listProjects({
        status: 'ACTIVE'
      });

      expect(result.projects.every(p => (p as any).status === 'ACTIVE')).toBe(true);
    });

    it('should filter projects by search term', async () => {
      const result = await projectService.listProjects({
        search: 'Test'
      });

      expect(result.projects.length).toBeGreaterThan(0);
      expect(result.projects.every(p =>
        ((p as any).title.toLowerCase().includes('test') ||
        ((p as any).abbreviation.toLowerCase().includes('test')))
      )).toBe(true);
    });
  });

  describe('getProjectMembers', () => {
    it('should return project members', async () => {
      // First assign a user to the project
      await projectService.assignUserToProject(testProject.id, testUser.id, testUser.id);

      const members = await projectService.getProjectMembers(testProject.id);

      expect(members).toBeDefined();
      expect(members.totalMembers).toBe(1);
      expect(members.users).toHaveLength(1);
      expect(members.users[0].userId).toBe(testUser.id);
      expect(members.teams).toHaveLength(0);
    });

    it('should return empty for non-existent project', async () => {
      const members = await projectService.getProjectMembers('non-existent-id');

      expect(members.totalMembers).toBe(0);
      expect(members.users).toHaveLength(0);
      expect(members.teams).toHaveLength(0);
    });
  });
});