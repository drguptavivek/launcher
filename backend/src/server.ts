import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { env } from './lib/config';
import { logger } from './lib/logger';
import { swaggerSpec, swaggerUiOptions } from './lib/swagger';
import swaggerUi from 'swagger-ui-express';

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

// Swagger UI documentation
app.use('/api-docs', (req, res, next) => {
  // Enable CORS for Swagger UI
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// OpenAPI JSON specification endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.header('Access-Control-Allow-Origin', '*');
  res.send(swaggerSpec);
});

// API routes - use modular structure
app.use('/api/v1', async (req, res, next) => {
  try {
    // Use modular API routes
    const { apiRouter } = await import('./routes/api/index');
    apiRouter(req, res, next);
  } catch (error) {
    logger.error('API router error', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

// Web Admin API routes
app.use('/api/web-admin', async (req, res, next) => {
  try {
    // Use web admin API routes
    const { webAdminApiRouter } = await import('./routes/web-admin-api');
    webAdminApiRouter(req, res, next);
  } catch (error) {
    logger.error('Web Admin API router error', { error: error.message });
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