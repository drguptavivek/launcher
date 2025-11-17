import { Router } from 'express';
import { PolicyService } from '../../services/policy-service';
import { logger } from '../../lib/logger';
import { authenticateToken, requirePermission, Resource, Action, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

// Apply authentication middleware
router.use(authenticateToken);

// GET /api/v1/policy/:deviceId - Get device policy
router.get('/:deviceId',
  requirePermission(Resource.POLICY, Action.READ), // Team members can read policies
  async (req: AuthenticatedRequest, res) => {
  try {
    const { deviceId } = req.params;
    const requestId = (req.headers['x-request-id'] as string) || 'unknown-request';
    const sessionId = req.session?.sessionId;
    const sessionDeviceId = req.session?.deviceId;
    const sessionTeamId = req.session?.teamId;
    const authUserId = req.user?.id;
    const authTeamId = req.user?.teamId;

    if (!deviceId) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Device ID is required',
          request_id: requestId,
        },
      });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    logger.info('policy_request', {
      deviceId,
      sessionDeviceId,
      requestId,
      sessionId,
      userId: authUserId,
      teamId: authTeamId || sessionTeamId,
      userAgent,
      ipAddress,
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
      policyVersion: result.payload?.version,
      sessionId,
      sessionDeviceId,
      userId: authUserId,
      teamId: authTeamId || sessionTeamId,
      requestId,
      ipAddress,
    });

    return res.send(result.jws);

  } catch (error: any) {
    logger.error('get_policy_endpoint_error', {
      error: error.message,
      stack: error.stack,
      deviceId: req.params.deviceId,
      requestId: req.headers['x-request-id'],
      sessionId: req.session?.sessionId,
      userId: req.user?.id,
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
