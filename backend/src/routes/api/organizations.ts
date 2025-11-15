import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { organizations, NewOrganization } from '../../lib/db/schema';
import { eq, and, ilike, isNull } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import { authenticateWebAdmin, requirePermission, AuthenticatedRequest, Resource, Action } from '../../middleware/auth';

// Validation middleware function
const validateRequest = (schema: z.ZodObject<any, any>, target: 'body' | 'query' = 'body') => {
  return (req: any, res: Response, next: any) => {
    try {
      const data = target === 'query' ? req.query : req.body;
      const validatedData = schema.parse(data);

      if (target === 'query') {
        req.query = validatedData;
      } else {
        req.body = validatedData;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors
          }
        });
      }

      return res.status(500).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed'
        }
      });
    }
  };
};

const router = Router();

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  displayName: z.string().min(1).max(250),
  description: z.string().optional(),
  code: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  settings: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateOrganizationSchema = createOrganizationSchema.partial();

const listOrganizationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
});

// GET /api/v1/organizations - List organizations
router.get('/',
  authenticateWebAdmin,
  requirePermission(Resource.ORGANIZATION, Action.READ),
  validateRequest(listOrganizationsSchema, 'query'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, search, isActive } = req.query as any;
      const offset = (page - 1) * limit;

      // Build query conditions
      const conditions = [];

      if (search) {
        conditions.push(
          ilike(organizations.name, `%${search}%`)
        );
      }

      if (isActive !== undefined) {
        conditions.push(eq(organizations.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const totalCountResult = await db
        .select({ count: organizations.id })
        .from(organizations)
        .where(whereClause);

      const totalCount = totalCountResult.length;

      // Get organizations
      const organizationList = await db
        .select()
        .from(organizations)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(organizations.name);

      logger.info('Organizations listed', {
        requestedBy: req.user?.id,
        count: organizationList.length,
        totalCount,
        page,
        limit
      });

      res.json({
        ok: true,
        data: {
          organizations: organizationList,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: page * limit < totalCount,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      logger.error('Failed to list organizations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: req.user?.id
      });

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list organizations'
        }
      });
    }
  }
);

// GET /api/v1/organizations/:id - Get organization by ID
router.get('/:id',
  authenticateWebAdmin,
  requirePermission(Resource.ORGANIZATION, Action.READ),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const organization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      if (organization.length === 0) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found'
          }
        });
      }

      logger.info('Organization retrieved', {
        organizationId: id,
        requestedBy: req.user?.id
      });

      res.json({
        ok: true,
        data: {
          organization: organization[0]
        }
      });
    } catch (error) {
      logger.error('Failed to get organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.params.id,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get organization'
        }
      });
    }
  }
);

// POST /api/v1/organizations - Create organization
router.post('/',
  authenticateWebAdmin,
  requirePermission(Resource.ORGANIZATION, Action.CREATE),
  validateRequest(createOrganizationSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationData: NewOrganization = req.body;

      // Check if organization code already exists
      const existingOrganization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.code, organizationData.code))
        .limit(1);

      if (existingOrganization.length > 0) {
        return res.status(409).json({
          ok: false,
          error: {
            code: 'ORGANIZATION_CODE_EXISTS',
            message: 'Organization with this code already exists'
          }
        });
      }

      // If setting as default, unset any existing default
      if (organizationData.isDefault) {
        await db
          .update(organizations)
          .set({ isDefault: false })
          .where(eq(organizations.isDefault, true));
      }

      const result = await db
        .insert(organizations)
        .values(organizationData)
        .returning();

      const newOrganization = result[0];

      logger.info('Organization created', {
        organizationId: newOrganization.id,
        organizationCode: newOrganization.code,
        createdBy: req.user?.id
      });

      res.status(201).json({
        ok: true,
        data: {
          organization: newOrganization
        }
      });
    } catch (error) {
      logger.error('Failed to create organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        createdBy: req.user?.id
      });

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create organization'
        }
      });
    }
  }
);

// PUT /api/v1/organizations/:id - Update organization
router.put('/:id',
  authenticateWebAdmin,
  requirePermission(Resource.ORGANIZATION, Action.UPDATE),
  validateRequest(updateOrganizationSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if organization exists
      const existingOrganization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      if (existingOrganization.length === 0) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found'
          }
        });
      }

      // If updating code, check if it conflicts with existing
      if (updateData.code && updateData.code !== existingOrganization[0].code) {
        const codeConflict = await db
          .select()
          .from(organizations)
          .where(and(
            eq(organizations.code, updateData.code),
            eq(organizations.id, id)
          ))
          .limit(1);

        if (codeConflict.length > 0) {
          return res.status(409).json({
            ok: false,
            error: {
              code: 'ORGANIZATION_CODE_EXISTS',
              message: 'Organization with this code already exists'
            }
          });
        }
      }

      // If setting as default, unset any existing default
      if (updateData.isDefault) {
        await db
          .update(organizations)
          .set({ isDefault: false })
          .where(eq(organizations.isDefault, true));
      }

      updateData.updatedAt = new Date();

      const result = await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, id))
        .returning();

      const updatedOrganization = result[0];

      logger.info('Organization updated', {
        organizationId: id,
        updatedBy: req.user?.id,
        changes: Object.keys(updateData)
      });

      res.json({
        ok: true,
        data: {
          organization: updatedOrganization
        }
      });
    } catch (error) {
      logger.error('Failed to update organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.params.id,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update organization'
        }
      });
    }
  }
);

// DELETE /api/v1/organizations/:id - Delete organization (soft delete)
router.delete('/:id',
  authenticateWebAdmin,
  requirePermission(Resource.ORGANIZATION, Action.DELETE),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Check if organization exists
      const existingOrganization = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      if (existingOrganization.length === 0) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found'
          }
        });
      }

      // Don't allow deletion of default organization
      if (existingOrganization[0].isDefault) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'CANNOT_DELETE_DEFAULT_ORGANIZATION',
            message: 'Cannot delete the default organization'
          }
        });
      }

      // Soft delete by setting isActive to false
      const result = await db
        .update(organizations)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, id))
        .returning();

      const deletedOrganization = result[0];

      logger.info('Organization deleted', {
        organizationId: id,
        deletedBy: req.user?.id
      });

      res.json({
        ok: true,
        data: {
          organization: deletedOrganization
        }
      });
    } catch (error) {
      logger.error('Failed to delete organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: req.params.id,
        deletedBy: req.user?.id
      });

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete organization'
        }
      });
    }
  }
);

export default router;