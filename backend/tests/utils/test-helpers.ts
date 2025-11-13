/**
 * Test Helper Functions
 * Common utilities for API testing
 */

import { createServer } from 'http';
import app from '../src/app';
import { Request, Response } from 'supertest';
import { generateTestTokens } from './test-setup';

/**
 * Test helper for making authenticated requests
 */
export class TestApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-request-id': `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Make POST request
   */
  async post(endpoint: string, data?: any): Promise<{
    status: number;
    body: any;
    headers: Record<string, string>;
  }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return {
      status: response.status,
      body: await response.json(),
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  /**
   * Make GET request
   */
  async get(endpoint: string): Promise<{
    status: number;
    body: any;
    headers: Record<string, string>;
  }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return {
      status: response.status,
      body: await response.json(),
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  /**
   * Make PUT request
   */
  async put(endpoint: string, data?: any): Promise<{
    status: number;
    body: any;
    headers: Record<string, string>;
  }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return {
      status: response.status,
      body: await response.json(),
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  /**
   * Make DELETE request
   */
  async delete(endpoint: string): Promise<{
    status: number;
    body: any;
    headers: Record<string, string>;
  }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return {
      status: response.status,
      body: await response.json(),
      headers: Object.fromEntries(response.headers.entries()),
    };
  }
}

/**
 * Assertion helpers for API responses
 */
export class ApiAssertions {
  /**
   * Assert successful response
   */
  static assertSuccess(response: { status: number; body: any }) {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Expected success status (2xx), got ${response.status}: ${JSON.stringify(response.body)}`);
    }

    if (response.body && response.body.ok === false) {
      throw new Error(`Expected successful response, got error: ${JSON.stringify(response.body.error)}`);
    }
  }

  /**
   * Assert error response
   */
  static assertError(response: { status: number; body: any }, expectedCode?: string) {
    if (response.status < 400 || response.status >= 600) {
      throw new Error(`Expected error status (4xx/5xx), got ${response.status}`);
    }

    if (expectedCode && response.body?.error?.code !== expectedCode) {
      throw new Error(`Expected error code '${expectedCode}', got '${response.body?.error?.code}'`);
    }
  }

  /**
   * Assert unauthorized response
   */
  static assertUnauthorized(response: { status: number; body: any }) {
    if (response.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
    }
  }

  /**
   * Assert forbidden response
   */
  static assertForbidden(response: { status: number; body: any }) {
    if (response.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${response.status}`);
    }
  }

  /**
   * Assert not found response
   */
  static assertNotFound(response: { status: number; body: any }) {
    if (response.status !== 404) {
      throw new Error(`Expected 404 Not Found, got ${response.status}`);
    }
  }

  /**
   * Assert pagination structure
   */
  static assertPagination(response: { status: number; body: any }) {
    this.assertSuccess(response);

    if (!Array.isArray(response.body.items)) {
      throw new Error('Expected response to have items array');
    }

    if (typeof response.body.pagination !== 'object') {
      throw new Error('Expected response to have pagination object');
    }

    const requiredPaginationFields = ['page', 'limit', 'total', 'totalPages'];
    for (const field of requiredPaginationFields) {
      if (!(field in response.body.pagination)) {
        throw new Error(`Expected pagination to have ${field} field`);
      }
    }
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate random team data
   */
  static generateTeamData(overrides: Partial<any> = {}) {
    return {
      name: `Test Team ${Date.now()}`,
      timezone: 'Asia/Kolkata',
      stateId: 'MH01',
      ...overrides,
    };
  }

  /**
   * Generate random user data
   */
  static generateUserData(teamId: string, overrides: Partial<any> = {}) {
    return {
      teamId,
      code: `U${Date.now().toString().slice(-6)}`,
      displayName: `Test User ${Date.now()}`,
      email: `user${Date.now()}@example.com`,
      role: 'TEAM_MEMBER',
      pin: '123456',
      ...overrides,
    };
  }

  /**
   * Generate random device data
   */
  static generateDeviceData(teamId: string, overrides: Partial<any> = {}) {
    return {
      teamId,
      name: `Test Device ${Date.now()}`,
      androidId: `android-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      appVersion: '1.0.0',
      ...overrides,
    };
  }

  /**
   * Generate random supervisor PIN data
   */
  static generateSupervisorPinData(teamId: string, overrides: Partial<any> = {}) {
    return {
      teamId,
      name: `Test Supervisor ${Date.now()}`,
      pin: '789012',
      ...overrides,
    };
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceUtils {
  /**
   * Measure response time
   */
  static async measureResponseTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = Date.now();
    const result = await fn();
    const timeMs = Date.now() - start;

    return { result, timeMs };
  }

  /**
   * Assert response time within threshold
   */
  static assertResponseTime(timeMs: number, maxTimeMs: number) {
    if (timeMs > maxTimeMs) {
      throw new Error(`Response time ${timeMs}ms exceeds threshold ${maxTimeMs}ms`);
    }
  }
}

/**
 * Environment setup for tests
 */
export function setupTestEnvironment() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce noise during tests

  // Mock console methods in tests
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return () => {
    // Restore console after tests
    global.console = originalConsole;
  };
}

export default {
  TestApiClient,
  ApiAssertions,
  TestDataGenerator,
  PerformanceUtils,
  setupTestEnvironment,
};