import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../../src/routes/api';
import { db } from '../../src/lib/db';
import { organizations, webAdminUsers } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../src/lib/crypto';
import { JWTService } from '../../src/services/jwt-service';

describe('Organizations API Integration Tests', () => {
  let app: express.Application;
  let adminUserId: string;
  let authToken: string;
  let organizationId: string;

  beforeEach(async () => {
    // Generate unique email for each test to avoid conflicts
    const uniqueEmail = `test-admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    // Create test admin user
    adminUserId = uuidv4();
    const passwordHash = await hashPassword('testAdminPassword123');

    await db.insert(webAdminUsers).values({
      id: adminUserId,
      email: uniqueEmail,
      password: passwordHash.hash, // Direct password hash (no separate salt field)
      firstName: 'Test',
      lastName: 'Admin',
      role: 'SYSTEM_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create auth token for admin user
    const tokenResult = await JWTService.createWebAdminToken({
      userId: adminUserId,
      deviceId: 'test-device',
      sessionId: 'test-session'
    });
    authToken = tokenResult.token;

    // Create test organization
    organizationId = uuidv4();
    await db.insert(organizations).values({
      id: organizationId,
      name: 'Test Organization',
      displayName: 'Test Organization Display',
      code: 'test-org-123',
      isActive: true,
      isDefault: false,
      settings: { theme: 'dark', timezone: 'UTC' },
      metadata: { source: 'test' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.id, adminUserId));
  });

  describe('GET /api/v1/organizations', () => {
    it('should list organizations for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.organizations).toBeInstanceOf(Array);
      expect(response.body.data.organizations.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.totalCount).toBeGreaterThan(0);
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .expect(401);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_WEB_ADMIN_TOKEN');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/v1/organizations?search=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.organizations).toBeInstanceOf(Array);
      // Should find our test organization
      expect(response.body.data.organizations.some((org: any) => org.name.includes('test'))).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/organizations?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.hasNext).toBe(false);
      expect(response.body.data.pagination.hasPrev).toBe(false);
    });
  });

  describe('GET /api/v1/organizations/:id', () => {
    it('should get specific organization by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.organization.id).toBe(organizationId);
      expect(response.body.data.organization.name).toBe('Test Organization');
      expect(response.body.data.organization.displayName).toBe('Test Organization Display');
      expect(response.body.data.organization.code).toBe('test-org-123');
      expect(response.body.data.organization.isActive).toBe(true);
    });

    it('should return 404 for non-existent organization', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .get(`/api/v1/organizations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('ORGANIZATION_NOT_FOUND');
    });
  });

  describe('POST /api/v1/organizations', () => {
    it('should create new organization', async () => {
      const newOrgData = {
        name: 'New Test Organization',
        displayName: 'New Test Org Display',
        description: 'A test organization for testing',
        code: 'new-test-org',
        isActive: true,
        settings: { theme: 'light' }
      };

      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOrgData)
        .expect(201);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.organization.name).toBe(newOrgData.name);
      expect(response.body.data.organization.displayName).toBe(newOrgData.displayName);
      expect(response.body.data.organization.code).toBe(newOrgData.code);
      expect(response.body.data.organization.isActive).toBe(newOrgData.isActive);

      // Clean up
      await db.delete(organizations).where(eq(organizations.id, response.body.data.organization.id));
    });

    it('should reject duplicate organization codes', async () => {
      const duplicateOrgData = {
        name: 'Duplicate Org',
        displayName: 'Duplicate Org Display',
        code: 'test-org-123', // Same code as existing org
        isActive: true
      };

      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateOrgData)
        .expect(409);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('ORGANIZATION_CODE_EXISTS');
    });

    it('should validate required fields', async () => {
      const invalidOrgData = {
        // Missing required fields
        displayName: 'Invalid Org'
      };

      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOrgData)
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/organizations/:id', () => {
    it('should update existing organization', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        displayName: 'Updated Display Name',
        settings: { theme: 'dark', language: 'en' }
      };

      const response = await request(app)
        .put(`/api/v1/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.organization.name).toBe(updateData.name);
      expect(response.body.data.organization.displayName).toBe(updateData.displayName);
      expect(response.body.data.organization.settings).toEqual(updateData.settings);
    });

    it('should return 404 when updating non-existent organization', async () => {
      const fakeId = uuidv4();
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/organizations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('ORGANIZATION_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/organizations/:id', () => {
    it('should soft delete organization', async () => {
      // Create a temporary organization for deletion test
      const tempOrgId = uuidv4();
      await db.insert(organizations).values({
        id: tempOrgId,
        name: 'Temp Organization',
        displayName: 'Temp Org',
        code: 'temp-org-delete',
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .delete(`/api/v1/organizations/${tempOrgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.data.organization.isActive).toBe(false);

      // Verify it's soft deleted (inactive but still exists)
      const deletedOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, tempOrgId))
        .limit(1);

      expect(deletedOrg.length).toBe(1);
      expect(deletedOrg[0].isActive).toBe(false);

      // Clean up
      await db.delete(organizations).where(eq(organizations.id, tempOrgId));
    });

    it('should return 404 when deleting non-existent organization', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .delete(`/api/v1/organizations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('ORGANIZATION_NOT_FOUND');
    });
  });
});