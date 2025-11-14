import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { env } from './lib/config';
import { logger } from './lib/logger';
import { apiRouter } from './routes/api';

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
app.use(cors({
  origin: typeof env.CORS_ALLOWED_ORIGINS === 'string' ? env.CORS_ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'],
  credentials: true,
}));
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// API Routes
app.use('/api/v1', apiRouter);

// Error handling middleware
app.use((err: Error, req, res, next) => {
  logger.error('Express error handler', {
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id'],
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      request_id: req.headers['x-request-id'],
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      request_id: req.headers['x-request-id'],
    },
  });
});

export default app;