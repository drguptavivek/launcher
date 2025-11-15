import { Router } from 'express';
import { TelemetryService } from '../../services/telemetry-service';
import { logger } from '../../lib/logger';

const router = Router();

// POST /api/v1/telemetry - Submit telemetry data
router.post('/', async (req, res) => {
  try {
    const { events, deviceId, sessionId } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'events array is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown';
    // User agent available for future analytics: const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await TelemetryService.ingestBatch({
      events,
      deviceId,
      sessionId,
    }, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('telemetry_processed', {
      deviceId,
      sessionId,
      accepted: result.accepted,
      dropped: result.dropped,
    });

    return res.json({
      ok: true,
      accepted: result.accepted,
      dropped: result.dropped,
    });

  } catch (error: any) {
    logger.error('telemetry_endpoint_error', {
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