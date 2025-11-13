import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateJTI,
  nowUTC,
  isWithinClockSkew,
  getExpiryTimestamp,
  PolicySigner,
  PolicyVerifier,
  JWTUtils,
  generateSecureRandom,
  sha256
} from '../../src/lib/crypto';

describe('Crypto Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'test123';
      const result = await hashPassword(password);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.salt.length).toBeGreaterThan(0);
    });

    it('should verify a correct password', async () => {
      const password = 'test123';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword(password, hashed.hash, hashed.salt);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'test123';
      const wrongPassword = 'wrong456';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hashed.hash, hashed.salt);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'test123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.salt).not.toBe(hash2.salt);
    });
  });

  describe('JTI Generation', () => {
    it('should generate a unique JTI', () => {
      const jti1 = generateJTI();
      const jti2 = generateJTI();

      expect(typeof jti1).toBe('string');
      expect(typeof jti2).toBe('string');
      expect(jti1).not.toBe(jti2);
      expect(jti1.length).toBeGreaterThan(0);
    });
  });

  describe('Time Utilities', () => {
    it('should return current UTC time', () => {
      const now = nowUTC();
      expect(now).toBeInstanceOf(Date);

      // Should be within 1 second of current time
      const diff = Math.abs(now.getTime() - Date.now());
      expect(diff).toBeLessThan(1000);
    });

    it('should check clock skew correctly', () => {
      const now = nowUTC();
      const withinSkew = new Date(now.getTime() + 60000); // 1 minute ahead
      const outsideSkew = new Date(now.getTime() + 300000); // 5 minutes ahead

      expect(isWithinClockSkew(withinSkew, 180)).toBe(false); // 3 minutes allowed
      expect(isWithinClockSkew(outsideSkew, 180)).toBe(false);
      expect(isWithinClockSkew(withinSkew, 120)).toBe(true); // 2 minutes allowed
    });

    it('should calculate expiry timestamp correctly', () => {
      const ttlMinutes = 60;
      const expiry = getExpiryTimestamp(ttlMinutes);

      expect(expiry).toBeInstanceOf(Date);

      const now = nowUTC();
      const expectedExpiry = new Date(now.getTime() + ttlMinutes * 60 * 1000);

      // Should be within 1 second
      const diff = Math.abs(expiry.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('Policy Signing', () => {
    let signer: PolicySigner;
    let verifier: PolicyVerifier;

    beforeEach(() => {
      const testPrivateKey = '4KY3pJ2+f4iL9qFGmMZT1WdgQnNKlQXBQpPx46N+Q3k=';
      signer = new PolicySigner(testPrivateKey);
      verifier = new PolicyVerifier(signer.getPublicKey());
    });

    it('should create a valid JWS', () => {
      const payload = { test: 'data', version: 1 };
      const jws = signer.createJWS(payload);

      expect(typeof jws).toBe('string');
      expect(jws).toContain('.'); // Should have header.payload.signature format
    });

    it('should verify a JWS signature', () => {
      const payload = { test: 'data', version: 1 };
      const jws = signer.createJWS(payload);

      const result = verifier.verifyJWS(jws);
      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(payload);
    });

    it('should reject an invalid JWS', () => {
      const invalidJws = 'invalid.jws.signature';
      const result = verifier.verifyJWS(invalidJws);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject a tampered JWS', () => {
      const payload = { test: 'data', version: 1 };
      const jws = signer.createJWS(payload);

      // Tamper with the JWS
      const tamperedJws = jws.replace('data', 'tampered');

      const result = verifier.verifyJWS(tamperedJws);
      expect(result.valid).toBe(false);
    });
  });

  describe('JWT Utils', () => {
    const mockPayload = {
      userId: 'user-123',
      deviceId: 'device-456',
      sessionId: 'session-789',
      teamId: 'team-000',
    };

    it('should create and verify access token', () => {
      const token = JWTUtils.createAccessToken(mockPayload);

      expect(token.token).toBeDefined();
      expect(token.expiresAt).toBeInstanceOf(Date);

      const result = JWTUtils.verifyAccessToken(token.token);
      expect(result.valid).toBe(true);
      expect(result.payload.sub).toBe(mockPayload.userId);
      expect(result.payload['x-device-id']).toBe(mockPayload.deviceId);
      expect(result.payload['x-session-id']).toBe(mockPayload.sessionId);
      expect(result.payload['x-team-id']).toBe(mockPayload.teamId);
      expect(result.payload.type).toBe('access');
    });

    it('should create and verify refresh token', () => {
      const refreshPayload = {
        userId: mockPayload.userId,
        deviceId: mockPayload.deviceId,
        sessionId: mockPayload.sessionId,
      };

      const token = JWTUtils.createRefreshToken(refreshPayload);

      expect(token.token).toBeDefined();
      expect(token.expiresAt).toBeInstanceOf(Date);

      const result = JWTUtils.verifyRefreshToken(token.token);
      expect(result.valid).toBe(true);
      expect(result.payload.sub).toBe(mockPayload.userId);
      expect(result.payload.type).toBe('refresh');
    });

    it('should reject invalid access token', () => {
      const result = JWTUtils.verifyAccessToken('invalid.token');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid refresh token', () => {
      const result = JWTUtils.verifyRefreshToken('invalid.token');
      expect(result.valid).toBe(false);
    });

    it('should extract token from header correctly', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const header = `Bearer ${token}`;

      expect(JWTUtils.extractTokenFromHeader(header)).toBe(token);
      expect(JWTUtils.extractTokenFromHeader('invalid')).toBe(null);
      expect(JWTUtils.extractTokenFromHeader('Bearer')).toBe(null);
      expect(JWTUtils.extractTokenFromHeader('bearer token')).toBe(null);
    });
  });

  describe('Utility Functions', () => {
    it('should generate secure random string', () => {
      const random1 = generateSecureRandom(16);
      const random2 = generateSecureRandom(16);

      expect(typeof random1).toBe('string');
      expect(typeof random2).toBe('string');
      expect(random1).not.toBe(random2);
      expect(random1.length).toBe(16);
    });

    it('should generate SHA-256 hash', () => {
      const data = 'test data';
      const hash1 = sha256(data);
      const hash2 = sha256(data);

      expect(typeof hash1).toBe('string');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex characters
    });
  });
});