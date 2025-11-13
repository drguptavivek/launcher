# 🚀 Quick Key Rotation Guide

## 📋 Available Commands

### Key Generation
```bash
# Generate all keys (JWT + Policy)
npm run keys:generate

# Generate only JWT secrets
npm run keys:jwt

# Generate only Ed25519 policy key
npm run keys:policy
```

### Key Rotation
```bash
# Interactive rotation (all keys)
npm run keys:rotate

# Rotate JWT keys only
npm run keys:rotate:jwt

# Rotate policy key only
npm run keys:rotate:policy

# Dry run (see what will change)
npm run keys:rotate:dry
```

## 🔐 Current Development Keys

**JWT Secrets:**
- Access Secret: `dev-access-secret-key-change-in-production-32-chars`
- Refresh Secret: `dev-refresh-secret-key-change-in-production-32-chars`

**Ed25519 Policy Key:**
- Private: `4KY3pJ2+f4iL9qFGmMZT1WdgQnNKlQXBQpPx46N+Q3k=`
- Public: `De12jFcg/oY8x0s+3gGl0NJ3O3eSEp9d/nmATSven/0=`

## 🔄 Rotation Process

### 1. Test Rotation (Dry Run)
```bash
npm run keys:rotate:dry
```
This shows what changes will be made without applying them.

### 2. Perform Rotation
```bash
npm run keys:rotate
```
This will:
- ✅ Backup current .env file
- ✅ Generate new keys
- ✅ Update .env with dual keys (old + new)
- ✅ Generate rotation report

### 3. Deploy & Monitor
- Deploy the updated .env file
- Monitor application for 24-48 hours
- Ensure all authentication flows work

### 4. Clean Up Old Keys
After successful validation, remove these from .env:
- `JWT_ACCESS_SECRET_OLD`
- `JWT_REFRESH_SECRET_OLD`
- `POLICY_SIGN_PRIVATE_BASE64_OLD`
- `POLICY_SIGN_PUBLIC_BASE64_OLD`

## 🚨 Emergency Rotation

If keys are compromised, use emergency rotation:
```bash
# Generate fresh keys immediately
npm run keys:generate

# Update environment manually
# Force re-authentication of all users
# Notify Android clients of key changes
```

## 📊 What Gets Rotated

### JWT Keys
- **Access Token Secret**: Used to sign/verify access tokens
- **Refresh Token Secret**: Used to sign/verify refresh tokens
- **Rotation Impact**: Existing tokens remain valid until expiry

### Ed25519 Policy Key
- **Private Key**: Signs policy JWS for devices
- **Public Key**: Verifies policy signatures on clients
- **Rotation Impact**: Policies signed with old key remain valid

## 🔍 Verification

After rotation, test these endpoints:

```bash
# Test login with new JWT keys
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "dev-mock-001", "userCode": "u001", "pin": "123456"}'

# Test policy with new Ed25519 key
curl -X GET "http://localhost:3000/api/v1/policy/dev-mock-001"

# Test telemetry
curl -X POST "http://localhost:3000/api/v1/telemetry" \
  -H "Content-Type: application/json" \
  -d '{"events": [{"type": "heartbeat", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'", "data": {}}], "device_id": "dev-mock-001"}'
```

## 📁 Important Files

- `.env` - Environment configuration with keys
- `.key-backups/` - Automatic backup directory
- `docs/key-rotation.md` - Comprehensive rotation guide
- `scripts/` - Key management utilities

## 🎯 Best Practices

1. **Never commit keys** to version control
2. **Use different keys** for each environment
3. **Rotate keys regularly** (JWT: 90 days, Policy: 12 months)
4. **Backup keys securely** before rotation
5. **Monitor thoroughly** after rotation
6. **Test in staging** before production

---

**Need help?** Check the comprehensive guide in `docs/key-rotation.md` or run `npm run keys:rotate:dry` to see changes.