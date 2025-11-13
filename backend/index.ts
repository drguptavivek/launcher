import { app } from './src/server';
import { logger } from './src/lib/logger';
import { env } from './src/lib/config';

const PORT = env.PORT;
const HOST = env.HOST;

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`Server started`, {
    port: PORT,
    host: HOST,
    environment: env.NODE_ENV,
    mockApi: env.MOCK_API,
    timestamp: new Date().toISOString(),
  });

  if (env.MOCK_API) {
    logger.info('🚀 Mock API mode enabled');
    logger.info('Available endpoints:');
    logger.info('  POST /api/v1/auth/login - Mock authentication');
    logger.info('  GET  /api/v1/auth/whoami - Mock user info');
    logger.info('  GET  /api/v1/policy/:deviceId - Mock policy fetch');
    logger.info('  POST /api/v1/telemetry - Mock telemetry ingestion');
    logger.info('  POST /api/v1/supervisor/override/login - Mock supervisor override');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});