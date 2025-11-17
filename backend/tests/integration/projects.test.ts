import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { organizations, teams, users, projects, projectAssignments } from '../../src/lib/db/schema';
import { JWTService } from '../../src/services/jwt-service';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

describe('Projects API', () => {
  let app: express.Application;
  let authToken: string;
  let organizationId: string;
  let teamId: string;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    organizationId = uuidv4();
    teamId = uuidv4();
    userId = uuidv4();
    projectId = uuidv4();

    await db.insert(organizations).values({
      id: organizationId,
      name: 'Test Org',
      displayName: 'Test Org',
      description: 'Integration org',
      code: `ORG-${organizationId.slice(0, 6)}`,
      isActive: true,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(teams).values({
      id: teamId,
      name: 'Test Project Team',
      timezone: 'UTC',
      stateId: 'MH01',
      organizationId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(users).values({
      id: userId,
      code: 'projuser',
      teamId,
      displayName: 'Project User',
      email: 'proj@example.com',
      role: 'TEAM_MEMBER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(projects).values({
      id: projectId,
      title: 'My Assigned Project',
      abbreviation: 'MAP01',
      status: 'ACTIVE',
      geographicScope: 'NATIONAL',
      organizationId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await db.insert(projectAssignments).values({
      projectId,
      userId,
      assignedBy: userId,
      roleInProject: 'Field Lead',
      assignedAt: new Date(),
      isActive: true
    });

    const tokenResult = await JWTService.createToken({
      userId,
      deviceId: uuidv4(),
      sessionId: uuidv4(),
      type: 'access'
    });
    authToken = tokenResult.token;
  });

  afterEach(async () => {
    await db.delete(projectAssignments).where(eq(projectAssignments.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(teams).where(eq(teams.id, teamId));
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  });

  it('should return user projects when authenticated', async () => {
    const response = await request(app)
      .get('/api/v1/projects/my')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.projects)).toBe(true);
    expect(response.body.total).toBe(1);
    expect(response.body.projects[0].id).toBe(projectId);
  });

  it('should reject unauthenticated my-projects request', async () => {
    const response = await request(app)
      .get('/api/v1/projects/my')
      .expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toMatch(/MISSING_TOKEN|UNAUTHENTICATED/);
  });
});
