import { Router } from 'express';
import { DeviceService } from '../../services/device-service';
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

// GET /api/v1/devices - List devices
router.get('/', requirePermission(Resource.DEVICES, Action.LIST), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 50, search, teamId, is_active } = req.query;

    const result = await DeviceService.listDevices({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      teamId: teamId as string,
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
      devices: result.devices,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total || 0
      },
    });

  } catch (error: any) {
    logger.error('list_devices_endpoint_error', {
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

// POST /api/v1/devices - Create device
router.post('/', requirePermission(Resource.DEVICES, Action.CREATE), async (req: AuthenticatedRequest, res) => {
  try {
    const { teamId, name, androidId, appVersion } = req.body;

    if (!teamId || !name) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'teamId and name are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.createDevice({
      teamId,
      name,
      androidId,
      appVersion,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('device_created', {
      deviceId: result.device?.id,
      name: result.device?.name,
      teamId,
      createdBy: (req as any).user?.id,
    });

    return res.status(201).json({
      ok: true,
      device: result.device,
    });

  } catch (error: any) {
    logger.error('create_device_endpoint_error', {
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

// GET /api/v1/devices/:id - Get device by ID
router.get('/:id', requirePermission(Resource.DEVICES, Action.READ), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Device ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.getDevice(id);

    if (!result.success) {
      return res.status(404).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      device: result.device,
    });

  } catch (error: any) {
    logger.error('get_device_endpoint_error', {
      error: error.message,
      stack: error.stack,
      deviceId: req.params.id,
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

// PUT /api/v1/devices/:id - Update device
router.put('/:id', requirePermission(Resource.DEVICES, Action.UPDATE), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, androidId, appVersion, isActive } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Device ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.updateDevice(id, {
      name,
      androidId,
      appVersion,
      isActive,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('device_updated', {
      deviceId: id,
      updatedBy: (req as any).user?.id,
    });

    return res.json({
      ok: true,
      device: result.device,
    });

  } catch (error: any) {
    logger.error('update_device_endpoint_error', {
      error: error.message,
      stack: error.stack,
      deviceId: req.params.id,
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

// DELETE /api/v1/devices/:id - Delete device (soft delete)
router.delete('/:id', requirePermission(Resource.DEVICES, Action.DELETE), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Device ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await DeviceService.deleteDevice(id);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('device_deleted', {
      deviceId: id,
      deletedBy: (req as any).user?.id,
    });

    return res.json({
      ok: true,
      message: 'Device deleted successfully',
    });

  } catch (error: any) {
    logger.error('delete_device_endpoint_error', {
      error: error.message,
      stack: error.stack,
      deviceId: req.params.id,
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