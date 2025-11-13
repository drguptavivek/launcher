import { Router } from 'express';
import apiRoutes from './api';

const router = Router();

// Use API routes
router.use('/', apiRoutes);

export default router;