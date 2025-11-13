# Key Rotation Guide

This guide covers how to safely rotate cryptographic keys in the SurveyLauncher backend system.

## 🔐 Key Types

The backend uses multiple types of cryptographic keys:

1. **JWT Secrets** (Access & Refresh tokens)
2. **Ed25519 Policy Signing Key** (JWS policy signatures)
3. **Password Hashing Salt** (scrypt parameters)

## 🔄 JWT Key Rotation

### When to Rotate JWT Keys
- Compromised JWT secrets
- Regular security rotation (recommended every 90 days)
- Security audit requirements
- Team member departure

### Rotation Steps

#### 1. Generate New Secrets

```bash
# Generate 32-character secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 2. Update Environment

```bash
# Add new secrets to .env
JWT_ACCESS_SECRET_NEW=<new-32-character-secret>
JWT_REFRESH_SECRET_NEW=<new-32-character-secret>

# Keep old secrets for grace period
JWT_ACCESS_SECRET=<old-secret>
JWT_REFRESH_SECRET=<old-secret>
```

#### 3. Implement Graceful Rotation

Update `src/lib/config.ts` to support rotation:

```typescript
// Add to your config schema
jwtAccessSecretOld: z.string().optional(),
jwtAccessSecretNew: z.string().optional(),
jwtRefreshSecretOld: z.string().optional(),
jwtRefreshSecretNew: z.string().optional(),
```

#### 4. Update JWT Service

Modify `src/lib/crypto.ts` to support dual secrets:

```typescript
export class JWTUtils {
  private static getAccessSecret() {
    return env.jwtAccessSecretNew || env.JWT_ACCESS_SECRET;
  }

  private static getRefreshSecret() {
    return env.jwtRefreshSecretNew || env.JWT_REFRESH_SECRET;
  }

  // For verification, try both old and new secrets
  static verifyAccessToken(token: string) {
    const secrets = [env.jwtAccessSecretNew, env.JWT_ACCESS_SECRET].filter(Boolean);

    for (const secret of secrets) {
      try {
        const decoded = jwt.verify(token, secret, {
          audience: 'surveylauncher-client',
          issuer: 'surveylauncher-backend',
          algorithms: ['HS256'],
        }) as any;

        if (decoded.type !== 'access') continue;

        return {
          valid: true,
          payload: decoded,
          jti: decoded.jti,
        };
      } catch (error) {
        // Try next secret
        continue;
      }
    }

    return { valid: false, error: 'Invalid token' };
  }
}
```

#### 5. Gradual Migration

1. Deploy with both old and new secrets
2. Monitor for successful token verification
3. After 24-48 hours, remove old secrets
4. Update environment variables

## 🔑 Ed25519 Policy Key Rotation

### When to Rotate Policy Key
- Compromised private key
- Regular rotation (recommended annually)
- Security policy changes
- Key compromise detection

### Rotation Steps

#### 1. Generate New Ed25519 Key

```bash
# Generate new Ed25519 key pair
node -e "
const nacl = require('tweetnacl');
const keyPair = nacl.sign.keyPair();
console.log('Private Key (Base64):', Buffer.from(keyPair.secretKey).toString('base64'));
console.log('Public Key (Base64):', Buffer.from(keyPair.publicKey).toString('base64'));
"
```

#### 2. Update Environment

```bash
# Add new key
POLICY_SIGN_PRIVATE_BASE64_NEW=<new-ed25519-private-key>
POLICY_SIGN_PUBLIC_BASE64_NEW=<new-ed25519-public-key>

# Keep old key for verification
POLICY_SIGN_PRIVATE_BASE64=<old-private-key>
POLICY_SIGN_PUBLIC_BASE64=<old-public-key>
```

#### 3. Implement Dual Key Support

Update `src/lib/crypto.ts`:

```typescript
export class PolicyVerifier {
  constructor(publicKeysBase64: string[]) {
    this.publicKeys = publicKeysBase64.map(key =>
      Buffer.from(key, 'base64')
    );
  }

  verifyJWS(jws: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const parts = jws.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid JWS format' };
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString());
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());

      // Verify signature with any available public key
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      const signature = Buffer.from(encodedSignature, 'base64url');

      for (const publicKey of this.publicKeys) {
        const isValid = nacl.sign.detached.verify(
          Buffer.from(signingInput),
          signature,
          publicKey
        );

        if (isValid) {
          return { valid: true, payload };
        }
      }

      return { valid: false, error: 'Invalid signature' };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Initialize with both old and new keys
export const policyVerifier = new PolicyVerifier([
  env.POLICY_SIGN_PUBLIC_BASE64,
  env.POLICY_SIGN_PUBLIC_BASE64_NEW,
].filter(Boolean));
```

#### 4. Client Key Distribution

Android clients need both public keys during rotation:

```json
{
  "policy_public_keys": [
    "old-public-key-base64",
    "new-public-key-base64"
  ],
  "rotation_timestamp": "2025-11-13T01:00:00.000Z"
}
```

#### 5. Gradual Migration

1. Deploy backend with dual key support
2. Update Android clients with new public key
3. Allow 1-2 weeks for client updates
4. Start signing new policies with new key only
5. After all clients updated, remove old key

## 🧪 Testing Key Rotation

### JWT Rotation Test

```typescript
// Test key rotation in your test suite
describe('JWT Key Rotation', () => {
  it('should verify tokens with old secret', async () => {
    // Create token with old secret
    const oldToken = JWTUtils.createAccessToken(mockPayload);

    // Verify with dual-secret setup
    const result = JWTUtils.verifyAccessToken(oldToken.token);
    expect(result.valid).toBe(true);
  });

  it('should verify tokens with new secret', async () => {
    // Create token with new secret
    const newToken = JWTUtils.createAccessTokenWithNewSecret(mockPayload);

    // Verify with dual-secret setup
    const result = JWTUtils.verifyAccessToken(newToken.token);
    expect(result.valid).toBe(true);
  });
});
```

### Policy Key Rotation Test

```typescript
describe('Policy Key Rotation', () => {
  it('should verify policies signed with old key', () => {
    const oldPolicy = oldSigner.createJWS(policyPayload);
    const result = policyVerifier.verifyJWS(oldPolicy);
    expect(result.valid).toBe(true);
  });

  it('should verify policies signed with new key', () => {
    const newPolicy = newSigner.createJWS(policyPayload);
    const result = policyVerifier.verifyJWS(newPolicy);
    expect(result.valid).toBe(true);
  });
});
```

## 📋 Rotation Checklist

### Before Rotation
- [ ] Generate new cryptographic keys
- [ ] Test new keys in development environment
- [ ] Create backup of existing keys
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window if needed

### During Rotation
- [ ] Add new keys to environment
- [ ] Deploy backend with dual-key support
- [ ] Monitor application logs
- [ ] Test all critical endpoints
- [ ] Verify client compatibility

### After Rotation
- [ ] Monitor for errors for 24-48 hours
- [ ] Remove old keys from environment
- [ ] Update documentation
- [ ] Communicate key changes to stakeholders
- [ ] Securely destroy old keys

## 🚨 Emergency Rotation

If keys are compromised:

1. **Immediate Action**
   ```bash
   # Generate emergency new keys
   npm run generate-emergency-keys
   ```

2. **Rapid Deployment**
   - Deploy with new keys immediately
   - Force all sessions to re-authenticate
   - Revoke all existing tokens

3. **Client Communication**
   - Notify all Android clients immediately
   - Provide new public keys
   - Force app updates if necessary

## 🔧 Key Generation Scripts

### JWT Key Generator

```typescript
// scripts/generate-jwt-keys.js
const crypto = require('crypto');

function generateJWTSecret() {
  return crypto.randomBytes(32).toString('base64');
}

console.log('JWT_ACCESS_SECRET:', generateJWTSecret());
console.log('JWT_REFRESH_SECRET:', generateJWTSecret());
```

### Ed25519 Key Generator

```typescript
// scripts/generate-policy-key.js
const nacl = require('tweetnacl');

function generatePolicyKey() {
  const keyPair = nacl.sign.keyPair();
  return {
    privateKey: Buffer.from(keyPair.secretKey).toString('base64'),
    publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
  };
}

const keys = generatePolicyKey();
console.log('POLICY_SIGN_PRIVATE_BASE64:', keys.privateKey);
console.log('POLICY_SIGN_PUBLIC_BASE64:', keys.publicKey);
```

### Add to package.json

```json
{
  "scripts": {
    "keys:generate": "node scripts/generate-jwt-keys.js",
    "keys:policy": "node scripts/generate-policy-key.js"
  }
}
```

## 📊 Monitoring Key Rotation

### Metrics to Monitor

1. **JWT Verification Success Rate**
   ```typescript
   // Add to your auth middleware
   const jwtVerificationSuccess = monitor.counter('jwt_verification_success_total');
   const jwtVerificationFailure = monitor.counter('jwt_verification_failure_total');
   ```

2. **Policy Verification Success Rate**
   ```typescript
   const policyVerificationSuccess = monitor.counter('policy_verification_success_total');
   const policyVerificationFailure = monitor.counter('policy_verification_failure_total');
   ```

3. **Key Rotation Events**
   ```typescript
   logger.info('Key rotation initiated', {
     keyType: 'jwt_access',
     rotationId: generateRotationId(),
     timestamp: new Date().toISOString(),
   });
   ```

## 🔒 Key Security Best Practices

1. **Storage**
   - Store keys in secure vaults (AWS KMS, Azure Key Vault)
   - Never commit keys to version control
   - Use environment-specific keys

2. **Access Control**
   - Limit access to production keys
   - Use separate keys for development/staging/production
   - Implement key approval workflows

3. **Rotation Schedule**
   - JWT keys: Every 90 days
   - Policy signing keys: Every 12 months
   - Emergency rotation: Immediately on compromise

4. **Backup & Recovery**
   - Secure encrypted backups of keys
   - Document key rotation procedures
   - Test disaster recovery procedures

This key rotation guide ensures minimal downtime and maintains security during cryptographic key updates.