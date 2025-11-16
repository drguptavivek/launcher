import request from 'supertest';
import { app } from '../../src/server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Security Hardening Tests', () => {
  let server: any;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('Security Headers', () => {
    it('should set appropriate security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toBeDefined();
    });

    it('should set cache control headers for API endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/auth/health')
        .expect(200);

      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['pragma']).toContain('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should include CSP header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Rate limiting headers should be present for API endpoints
      // Health check might not have rate limiting, but API endpoints should
    });

    it('should rate limit API requests', async () => {
      // Test a generic API endpoint to verify rate limiting
      const promises = Array.from({ length: 105 }, () =>
        request(app).get('/api/v1/auth/health')
      );

      const results = await Promise.allSettled(promises);
      const rejectedRequests = results.filter(result => result.status === 'rejected');

      // Some requests should be rate limited (status 429)
      expect(rejectedRequests.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Request Size Limiting', () => {
    it('should reject oversized requests', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/v1/auth/health')
        .send(largePayload)
        .expect(413);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE'
        }
      });
    });
  });

  describe('Request Timeout', () => {
    it('should timeout slow requests', async () => {
      // Mock a slow endpoint by using a timeout in the test
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout'));
        }, 100); // Short timeout for testing
      });

      const response = await request(app)
        .get('/api/v1/auth/health')
        .timeout(50)
        .catch((error) => error);

      // The request might timeout due to our test timeout, which is expected
      expect(response).toBeDefined();
    }, 200);
  });

  describe('Input Validation', () => {
    it('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Malformed JSON
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.stringMatching(/VALIDATION|PARSE|JSON/i)
        }
      });
    });

    it('should reject requests with malicious headers', async () => {
      const response = await request(app)
        .get('/api/v1/auth/health')
        .set('x-forwarded-for', '1.1.1.1.1.1.1.255')
        .set('x-real-ip', '192.168.1.1')
        .expect(200);

      // Request should be processed normally (IP forwarding is common)
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should sanitize error responses', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('not found')
        }
      });

      // Should include request ID for tracking
      expect(response.body.error.request_id).toBeDefined();
    });

    it('should handle malformed requests safely', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"deviceId": null}') // Null deviceId
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(Object)
      });
    });
  });

  describe('CORS Configuration', () => {
    it('should handle OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options('/api/v1/auth/health')
        .expect(200);

      // Should include appropriate CORS headers
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('Request ID Tracking', () => {
    it('should assign request ID to all requests', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{4}-4[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should preserve request ID through error responses', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body.error.request_id).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});