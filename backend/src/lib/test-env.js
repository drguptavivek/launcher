/**
 * Test environment utilities for authorization testing
 */

let originalEnv = {};

export function setTestEnv() {
  // Store original environment variables
  originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

  console.log('🧪 Test environment set up');
}

export function clearTestEnv() {
  // Restore original environment variables
  if (originalEnv.NODE_ENV) {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
  } else {
    delete process.env.NODE_ENV;
  }

  if (originalEnv.LOG_LEVEL) {
    process.env.LOG_LEVEL = originalEnv.LOG_LEVEL;
  } else {
    delete process.env.LOG_LEVEL;
  }

  console.log('🧹 Test environment cleaned up');
}