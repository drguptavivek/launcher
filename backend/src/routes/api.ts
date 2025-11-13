import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// Placeholder for real API routes
export function apiRouter(req: Request, res: Response, next: NextFunction) {
  logger.info('Real API route requested', {
    method: req.method,
    url: req.originalUrl,
    requestId: req.headers['x-request-id'],
  });

  // TODO: Implement real API routes
  res.status(501).json({
    ok: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Real API routes not implemented yet. Use MOCK_API=true for development.',
      request_id: req.headers['x-request-id'],
    },
  });
}