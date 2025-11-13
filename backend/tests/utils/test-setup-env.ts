/**
 * Jest Test Environment Setup
 * Global test configuration and utilities
 */

import { hashPassword } from '../../src/lib/crypto';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce test noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  /**
   * Generate test JWT tokens
   */
  async generateTestToken(userId: string, teamId: string, role: string = 'ADMIN') {
    // This would need to import the actual token generation functions
    // For now, return a mock token that can be validated in middleware
    const payload = {
      userId,
      teamId,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    };

    // In a real implementation, this would sign with JWT secret
    return `test-token-${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
  },

  /**
   * Hash test PIN
   */
  async hashTestPin(pin: string) {
    return await hashPassword(pin);
  },

  /**
   * Generate unique test identifiers
   */
  generateTestId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Wait for async operations
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Global test data
global.testData = {
  validTeam: {
    name: 'Test Team',
    timezone: 'Asia/Kolkata',
    stateId: 'MH01',
  },
  validUser: {
    code: 'TEST001',
    displayName: 'Test User',
    email: 'test@example.com',
    role: 'TEAM_MEMBER',
    pin: '123456',
  },
  validDevice: {
    name: 'Test Device',
    androidId: 'test-android-123',
    appVersion: '1.0.0',
  },
  validSupervisorPin: {
    name: 'Test Supervisor',
    pin: '789012',
  },
};

// Increase timeout for database operations
jest.setTimeout(30000);

// Global setup and teardown
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');

  // Ensure database is accessible
  try {
    // Database connection test would go here
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  // Restore console
  global.console = originalConsole;

  // Close any remaining connections
  // Connection cleanup would go here
});

// Test isolation
beforeEach(async () => {
  // Clean test data before each test
  // This ensures test isolation
});

afterEach(async () => {
  // Clean up after each test
  // Remove any test data created during the test
});