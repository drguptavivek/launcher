import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { env } from './lib/config';
import { logger } from './lib/logger';

// Create Express app
const app = express();

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: env.CORS_ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(env.LOG_FORMAT === 'json' ? 'combined' : 'dev', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// API routes
app.use('/api/v1', async (req, res, next) => {
  try {
    // If mock mode is enabled, use mock routes
    if (env.MOCK_API) {
      const { mockRouter } = await import('./routes/mock');
      mockRouter(req, res, next);
    } else {
      // Use real API routes
      const { apiRouter } = await import('./routes/api');
      apiRouter(req, res, next);
    }
  } catch (error) {
    next(error);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      request_id: req.headers['x-request-id'],
    },
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = req.headers['x-request-id'];

  // Log the error
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method,
  });

  // Send error response
  res.status(error.status || 500).json({
    ok: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Internal server error',
      request_id: requestId,
    },
  });
});

export { app };