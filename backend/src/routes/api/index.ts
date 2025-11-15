import { Router } from 'express';
import authRoutes from './auth';
import teamRoutes from './teams';
import userRoutes from './users';
import deviceRoutes from './devices';
import policyRoutes from './policy';
import telemetryRoutes from './telemetry';
import supervisorRoutes from './supervisor';
import projectRoutes from './projects';
import organizationRoutes from './organizations';
import webAdminAuthRoutes from './web-admin-auth';
import { logger } from '../../lib/logger';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/policy', policyRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/supervisor', supervisorRoutes);

router.use('/projects', projectRoutes);
router.use('/organizations', organizationRoutes);

router.use('/web-admin/auth', webAdminAuthRoutes);

// Log API route requests
router.use((req, res, next) => {
  logger.info('API route requested', {
    method: req.method,
    url: req.originalUrl,
    requestId: req.headers['x-request-id'],
    userAgent: req.headers['user-agent'],
    timestamp: new Date(),
  });
  next();
});

// Export both as default and named export for compatibility
export { router as apiRouter };
export { router };
export default router;