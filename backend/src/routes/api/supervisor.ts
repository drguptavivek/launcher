import { Router } from 'express';
import { logger } from '../../lib/logger';
import { AuthService } from '../../services/auth-service';
import { db } from '../../lib/db';
import { devices } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// POST /api/v1/supervisor/override/login - Request supervisor override
router.post('/override/login', async (req, res) => {
  try {
    const { supervisor_pin, deviceId } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown';

    if (!supervisor_pin || !deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'supervisor_pin and deviceId are required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    // First get the device to find its team
    const device = await db.select()
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1);

    if (device.length === 0) {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: 'Device not found',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    // Team ID available for logging/auditing: const teamId = device[0].teamId;
    const result = await AuthService.supervisorOverride(
      { supervisorPin: supervisor_pin, deviceId },
      ipAddress
    );

    if (!result.success) {
      logger.warn('supervisor_override_failed', {
        deviceId,
        reason: result.error?.code,
        ipAddress: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown',
      });

      return res.status(401).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('supervisor_override_granted', {
      deviceId,
      overrideUntil: result.overrideUntil,
      ipAddress: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown',
    });

    return res.json({
      ok: true,
      override_until: result.overrideUntil,
      token: result.token,
    });

  } catch (error: any) {
    logger.error('supervisor_override_endpoint_error', {
      error: error.message,
      stack: error.stack,
      deviceId: req.body?.deviceId,
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