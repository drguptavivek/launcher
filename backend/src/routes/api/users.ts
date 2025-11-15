import { Router } from 'express';
import { UserService } from '../../services/user-service';
import { logger } from '../../lib/logger';
import {
  authenticateToken,
  requirePermission,
  AuthenticatedRequest,
  Resource,
  Action
} from '../../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/v1/users - List users
router.get('/', requirePermission(Resource.USERS, Action.LIST), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 50, search, teamId, role, is_active } = req.query;

    const result = await UserService.listUsers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      teamId: teamId as string,
      role: role as string,
      isActive: is_active ? is_active === 'true' : undefined,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      users: result.users,
      pagination: result.pagination,
    });

  } catch (error: any) {
    logger.error('list_users_endpoint_error', {
      error: error.message,
      stack: error.stack,
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
});

// POST /api/v1/users - Create user
router.post('/', requirePermission(Resource.USERS, Action.CREATE), async (req: AuthenticatedRequest, res) => {
  try {
    const { teamId, code, displayName, email, role, pin } = req.body;

    if (!teamId || !code || !displayName || !pin) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'teamId, code, displayName, and pin are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.createUser({
      teamId,
      code,
      displayName,
      email,
      role,
      pin,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('user_created', {
      userId: result.user?.id,
      code: result.user?.code,
      teamId,
      createdBy: (req as any).user?.id,
    });

    return res.status(201).json({
      ok: true,
      user: result.user,
    });

  } catch (error: any) {
    logger.error('create_user_endpoint_error', {
      error: error.message,
      stack: error.stack,
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
});

// GET /api/v1/users/:id - Get user by ID
router.get('/:id', requirePermission(Resource.USERS, Action.READ), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'User ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.getUser(id);

    if (!result.success) {
      return res.status(404).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      user: result.user,
    });

  } catch (error: any) {
    logger.error('get_user_endpoint_error', {
      error: error.message,
      stack: error.stack,
      userId: req.params.id,
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
});

// PUT /api/v1/users/:id - Update user
router.put('/:id', requirePermission(Resource.USERS, Action.UPDATE), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { displayName, email, role, isActive, pin } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'User ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.updateUser(id, {
      displayName,
      email,
      role,
      isActive,
      pin,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('user_updated', {
      userId: id,
      updatedBy: (req as any).user?.id,
    });

    return res.json({
      ok: true,
      user: result.user,
    });

  } catch (error: any) {
    logger.error('update_user_endpoint_error', {
      error: error.message,
      stack: error.stack,
      userId: req.params.id,
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
});

// DELETE /api/v1/users/:id - Delete user (soft delete)
router.delete('/:id', requirePermission(Resource.USERS, Action.DELETE), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'User ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await UserService.deleteUser(id);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('user_deleted', {
      userId: id,
      deletedBy: (req as any).user?.id,
    });

    return res.json({
      ok: true,
      message: 'User deleted successfully',
    });

  } catch (error: any) {
    logger.error('delete_user_endpoint_error', {
      error: error.message,
      stack: error.stack,
      userId: req.params.id,
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
});

export default router;