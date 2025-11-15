import { Router } from 'express';
import { PolicyService } from '../../services/policy-service';
import { logger } from '../../lib/logger';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

// Apply authentication middleware
router.use(authenticateToken);

// GET /api/v1/policy/:deviceId - Get device policy
router.get('/:deviceId', async (req: AuthenticatedRequest, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Device ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    logger.info('policy_request', {
      deviceId,
      userAgent,
      ipAddress,
      timestamp: new Date(),
    });

    const result = await PolicyService.issuePolicy(deviceId, ipAddress);

    if (!result.success) {
      return res.status(404).json({
        ok: false,
        error: result.error,
      });
    }

    // Set appropriate headers for JWS content
    res.setHeader('Content-Type', 'application/jose');
    res.setHeader('Cache-Control', 'no-cache');

    logger.info('policy_issued', {
      deviceId,
      version: result.payload?.version,
      userId: (req as any).user?.id,
    });

    return res.send(result.jws);

  } catch (error: any) {
    logger.error('get_policy_endpoint_error', {
      error: error.message,
      stack: error.stack,
      deviceId: req.params.deviceId,
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