import nacl from 'tweetnacl';
import { createHash, randomBytes, scrypt } from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config';

// Password hashing configuration (using scrypt as fallback for Argon2id)
export const hashConfig = {
  saltLength: env.ARGON2_SALT_LENGTH,
  keyLength: env.ARGON2_HASH_LENGTH,
  iterations: env.ARGON2_ITERATIONS,
};

/**
 * Hash a password using scrypt (fallback for Argon2id)
 * Note: In production, use a proper Argon2id implementation
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(hashConfig.saltLength);

    scrypt(password, salt, hashConfig.keyLength, (err, derivedKey) => {
      if (err) {
        reject(new Error('Failed to hash password'));
        return;
      }

      resolve({
        hash: derivedKey.toString('base64'),
        salt: salt.toString('base64'),
      });
    });
  });
}

/**
 * Verify a password against its hash using scrypt
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const saltBuffer = Buffer.from(salt, 'base64');
    const hashBuffer = Buffer.from(hash, 'base64');

    scrypt(password, saltBuffer, hashConfig.keyLength, (err, derivedKey) => {
      if (err) {
        resolve(false);
        return;
      }

      resolve(derivedKey.equals(hashBuffer));
    });
  });
}

/**
 * Generate a secure random JWT ID
 */
export function generateJTI(): string {
  return uuidv4();
}

/**
 * Get current UTC timestamp
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Check if a timestamp is within acceptable clock skew
 */
export function isWithinClockSkew(timestamp: Date, maxSkewSeconds: number = env.MAX_CLOCK_SKEW_SEC): boolean {
  const now = nowUTC();
  const diff = Math.abs(now.getTime() - timestamp.getTime());
  return diff <= maxSkewSeconds * 1000;
}

/**
 * Get timestamp with TTL applied
 */
export function getExpiryTimestamp(ttlMinutes: number): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + ttlMinutes);
  return expiry;
}

/**
 * Ed25519 signer class for policy signing
 */
export class PolicySigner {
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;

  constructor(privateKeyBase64: string) {
    this.privateKey = Buffer.from(privateKeyBase64, 'base64');

    // Extract public key from private key using tweetnacl
    const keyPair = nacl.sign.keyPair.fromSeed(this.privateKey.slice(0, 32));
    this.publicKey = keyPair.publicKey;
  }

  /**
   * Sign a policy payload
   */
  sign(payload: string): string {
    const message = Buffer.from(payload);
    const signature = nacl.sign.detached(message, this.privateKey);
    return Buffer.from(signature).toString('base64');
  }

  /**
   * Get the public key for verification
   */
  getPublicKey(): string {
    return Buffer.from(this.publicKey).toString('base64');
  }

  /**
   * Create a JWS (JSON Web Signature) for the policy
   */
  createJWS(payload: any): string {
    const header = {
      alg: 'EdDSA',
      typ: 'JWT',
      kid: 'policy-signing-key',
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = nacl.sign.detached(Buffer.from(signingInput), this.privateKey);
    const encodedSignature = Buffer.from(signature).toString('base64url');

    return `${signingInput}.${encodedSignature}`;
  }
}

/**
 * Ed25519 verifier class for policy verification
 */
export class PolicyVerifier {
  private publicKey: Uint8Array;

  constructor(publicKeyBase64: string) {
    this.publicKey = Buffer.from(publicKeyBase64, 'base64');
  }

  /**
   * Verify a JWS signature
   */
  verifyJWS(jws: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const parts = jws.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid JWS format' };
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;

      // Decode header and validate it
      const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString());
      if (header.alg !== 'EdDSA' || header.typ !== 'JWT') {
        return { valid: false, error: 'Invalid JWS header' };
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());

      // Verify signature
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      const signature = Buffer.from(encodedSignature, 'base64url');

      const isValid = nacl.sign.detached.verify(
        Buffer.from(signingInput),
        signature,
        this.publicKey
      );

      return { valid: isValid, payload: isValid ? payload : undefined };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

/**
 * JWT utilities
 */
export class JWTUtils {
  /**
   * Create an access token
   */
  static createAccessToken(payload: {
    userId: string;
    deviceId: string;
    sessionId: string;
    teamId: string;
  }): { token: string; expiresAt: Date } {
    const jti = generateJTI();
    const now = Math.floor(Date.now() / 1000);

    // Parse TTL to get seconds
    const ttlMatch = env.JWT_ACCESS_TTL.match(/^(\d+)([smhd])$/);
    if (!ttlMatch) {
      throw new Error('Invalid JWT access TTL format');
    }

    const [, amount, unit] = ttlMatch;
    let ttlSeconds = parseInt(amount);

    switch (unit) {
      case 's': break;
      case 'm': ttlSeconds *= 60; break;
      case 'h': ttlSeconds *= 3600; break;
      case 'd': ttlSeconds *= 86400; break;
    }

    const expiresAt = new Date((now + ttlSeconds) * 1000);

    const token = jwt.sign(
      {
        sub: payload.userId,
        aud: 'surveylauncher-client',
        iss: 'surveylauncher-backend',
        iat: now,
        exp: now + ttlSeconds,
        jti,
        'x-device-id': payload.deviceId,
        'x-session-id': payload.sessionId,
        'x-team-id': payload.teamId,
        type: 'access',
      },
      env.JWT_ACCESS_SECRET,
      { algorithm: 'HS256' }
    );

    return { token, expiresAt };
  }

  /**
   * Create a refresh token
   */
  static createRefreshToken(payload: {
    userId: string;
    deviceId: string;
    sessionId: string;
  }): { token: string; expiresAt: Date } {
    const jti = generateJTI();
    const now = Math.floor(Date.now() / 1000);

    // Parse TTL to get seconds
    const ttlMatch = env.JWT_REFRESH_TTL.match(/^(\d+)([smhd])$/);
    if (!ttlMatch) {
      throw new Error('Invalid JWT refresh TTL format');
    }

    const [, amount, unit] = ttlMatch;
    let ttlSeconds = parseInt(amount);

    switch (unit) {
      case 's': break;
      case 'm': ttlSeconds *= 60; break;
      case 'h': ttlSeconds *= 3600; break;
      case 'd': ttlSeconds *= 86400; break;
    }

    const expiresAt = new Date((now + ttlSeconds) * 1000);

    const token = jwt.sign(
      {
        sub: payload.userId,
        aud: 'surveylauncher-client',
        iss: 'surveylauncher-backend',
        iat: now,
        exp: now + ttlSeconds,
        jti,
        'x-device-id': payload.deviceId,
        'x-session-id': payload.sessionId,
        type: 'refresh',
      },
      env.JWT_REFRESH_SECRET,
      { algorithm: 'HS256' }
    );

    return { token, expiresAt };
  }

  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): {
    valid: boolean;
    payload?: any;
    error?: string;
    jti?: string;
  } {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        audience: 'surveylauncher-client',
        issuer: 'surveylauncher-backend',
        algorithms: ['HS256'],
      }) as any;

      if (decoded.type !== 'access') {
        return { valid: false, error: 'Invalid token type' };
      }

      return {
        valid: true,
        payload: decoded,
        jti: decoded.jti,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): {
    valid: boolean;
    payload?: any;
    error?: string;
    jti?: string;
  } {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
        audience: 'surveylauncher-client',
        issuer: 'surveylauncher-backend',
        algorithms: ['HS256'],
      }) as any;

      if (decoded.type !== 'refresh') {
        return { valid: false, error: 'Invalid token type' };
      }

      return {
        valid: true,
        payload: decoded,
        jti: decoded.jti,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

/**
 * Generate a secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  return randomBytes(length).toString('base64').replace(/[+/=]/g, '').substring(0, length);
}

/**
 * Create a SHA-256 hash (for non-password purposes)
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// Initialize policy signer with the configured key
let policySigner: PolicySigner;

try {
  policySigner = new PolicySigner(env.POLICY_SIGN_PRIVATE_BASE64);
} catch (error) {
  console.error('Failed to initialize policy signer:', error);
  console.error('Please check POLICY_SIGN_PRIVATE_BASE64 in your environment configuration');
  process.exit(1);
}

export { policySigner };

/**
 * Get the policy public key (for clients to verify signatures)
 */
export function getPolicyPublicKey(): string {
  return policySigner.getPublicKey();
}