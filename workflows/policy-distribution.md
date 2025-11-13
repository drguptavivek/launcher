# Policy Creation & Distribution Flow

## Overview
This workflow covers the complete policy management process in SurveyLauncher, including policy creation, JWS cryptographic signing, device-specific configuration, time window enforcement, and secure distribution to Android devices.

## Workflow Diagram

```mermaid
flowchart TD
    subgraph "Policy Configuration" [Policy Management]
        AdminPolicy[Admin: Configure Policy<br/>• Time Windows<br/>• GPS Settings<br/>• Grace Periods]
        PolicyAPI[GET /api/v1/policy/:deviceId<br/>Policy Generation]
    end

    subgraph "Policy Service" [Policy Processing]
        PolicyGen[Generate Policy JSON<br/>• Device-specific rules<br/>• Team configurations<br/>• Time constraints]
        JWS_Sign[JWS Signing<br/>Ed25519 Private Key<br/>Cryptographic Signature]
        PolicyValidation[Policy Validation<br/>• Time anchor check<br/>• Clock skew ±180s<br/>• Expiry validation]
    end

    subgraph "Device Integration" [Android Policy Integration]
        PolicyFetch[Device: Fetch Policy<br/>HTTPS + Device JWT]
        PolicyVerify[Verify JWS Signature<br/>Ed25519 Public Key]
        PolicyEnforce[Enforce Policy<br/>• Time window checks<br/>• GPS requirements<br/>• Supervisor overrides]
    end

    subgraph "Database" [Policy Storage]
        PolicyTable[(policyIssues table)<br/>deviceId, version<br/>jwsKid, issuedAt, expiresAt]
        DeviceTable[(devices table)<br/>Policy tracking]
    end

    %% Policy Flow
    AdminPolicy --> PolicyAPI
    PolicyAPI --> PolicyGen
    PolicyGen --> JWS_Sign
    JWS_Sign --> PolicyValidation
    PolicyValidation --> |Store issue| PolicyTable
    PolicyValidation --> |Update device| DeviceTable

    %% Device Flow
    PolicyFetch --> PolicyAPI
    PolicyAPI --> |Return signed policy| PolicyFetch
    PolicyFetch --> PolicyVerify
    PolicyVerify --> PolicyEnforce

    %% External Services
    TimeService[NTP Time Service] --> PolicyValidation
    CertAuth[Certificate Authority] --> JWS_Sign

    style AdminPolicy fill:#e8f5e8
    style PolicyAPI fill:#f3e5f5
    style PolicyGen fill:#f3e5f5
    style PolicyFetch fill:#e3f2fd
    style PolicyVerify fill:#e3f2fd
    style PolicyTable fill:#fff8e1
```

## Policy Structure

### Complete Policy JSON
```json
{
  "version": 3,
  "deviceId": "device-uuid",
  "teamId": "team-uuid",
  "tz": "Asia/Kolkata",
  "time_anchor": {
    "server_now_utc": "2025-01-01T10:00:00Z",
    "max_clock_skew_sec": 180,
    "max_policy_age_sec": 86400
  },
  "session": {
    "allowed_windows": [
      {
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "start": "08:00",
        "end": "19:30"
      },
      {
        "days": ["Sat"],
        "start": "09:00",
        "end": "15:00"
      }
    ],
    "grace_minutes": 10,
    "supervisor_override_minutes": 120
  },
  "pin": {
    "mode": "server_verify",
    "min_length": 6,
    "retry_limit": 5,
    "cooldown_seconds": 300
  },
  "gps": {
    "active_fix_interval_minutes": 3,
    "min_displacement_m": 50,
    "accuracy_threshold_m": 20,
    "max_age_minutes": 5
  },
  "telemetry": {
    "heartbeat_minutes": 10,
    "batch_max": 50,
    "retry_attempts": 3,
    "upload_interval_minutes": 15
  },
  "ui": {
    "blocked_message": "Access outside working hours. Please contact supervisor."
  },
  "meta": {
    "issued_at": "2025-01-01T10:00:00Z",
    "expires_at": "2025-01-02T10:00:00Z"
  }
}
```

## Detailed Process Steps

### 1. Policy Configuration
1. **Admin Access**: Admin logs into policy management interface
2. **Team Selection**: Choose team for policy configuration
3. **Policy Settings**:
   - **Time Windows**: Define allowed access days and times
   - **GPS Configuration**: Set tracking intervals and accuracy requirements
   - **Security Settings**: Configure PIN policies and retry limits
   - **Telemetry Settings**: Define data collection parameters

### 2. Policy Generation
1. **Base Template Creation**:
   ```typescript
   const policyTemplate = {
     version: latestVersion,
     deviceId: device.id,
     teamId: team.id,
     tz: team.timezone,
     // ... default settings
   };
   ```

2. **Device-Specific Customization**:
   - Apply device-specific overrides
   - Include device capability constraints
   - Set device-appropriate GPS requirements

3. **Team Policy Inheritance**:
   - Merge team-level policies
   - Apply organizational constraints
   - Include compliance requirements

### 3. JWS Cryptographic Signing
1. **Key Management**:
   ```typescript
   // Ed25519 key pair for policy signing
   const privateKey = await loadPrivateKey('policy-signing-key');
   const publicKey = await loadPublicKey('policy-signing-public');
   const keyId = 'policy-key-2025-01';
   ```

2. **Signature Process**:
   ```typescript
   import * as jose from 'jose';

   const policyJws = await new jose.CompactSign(
     new TextEncoder().encode(JSON.stringify(policy))
   )
   .setProtectedHeader({
     alg: 'EdDSA',
     kid: keyId,
     typ: 'JWS'
   })
   .sign(privateKey);
   ```

3. **Verification Preparation**:
   ```typescript
   // Public key distribution to devices
   const publicKeyJwk = await jose.exportJWK(publicKey);
   ```

### 4. Policy Distribution
1. **Device Request**:
   ```http
   GET /api/v1/policy/device-uuid
   Authorization: Bearer device-jwt-token
   ```

2. **Policy Retrieval**:
   ```typescript
   async function getPolicy(deviceId: string) {
     // Check cache first
     const cached = await policyCache.get(deviceId);
     if (cached && !isExpired(cached)) {
       return cached;
     }

     // Generate new policy
     const policy = await generatePolicy(deviceId);
     const signedPolicy = await signPolicy(policy);

     // Cache and store
     await policyCache.set(deviceId, signedPolicy);
     await storePolicyIssue(deviceId, signedPolicy);

     return signedPolicy;
   }
   ```

3. **Response Format**:
   ```http
   HTTP/1.1 200 OK
   Content-Type: application/jose
   Cache-Control: max-age=3600
   X-Policy-Version: 3
   X-Policy-Expires: 2025-01-02T10:00:00Z

   eyJhbGciOiJFZERTQSIsImtpZCI6InBvbGljeS1rZXktMjAyNS0wMSIsInR5cCI6IkpXVCJ9...
   ```

### 5. Device-Side Verification
1. **Signature Verification**:
   ```typescript
   // Android device verification
   async function verifyPolicy(signedPolicy: string, publicKey: CryptoKey) {
     const { payload, protectedHeader } = await jose.compactVerify(
       signedPolicy,
       publicKey
     );

     const policy = JSON.parse(new TextDecoder().decode(payload));
     return { policy, keyId: protectedHeader.kid };
   }
   ```

2. **Time Validation**:
   ```typescript
   // Clock skew protection
   const now = new Date();
   const serverTime = new Date(policy.time_anchor.server_now_utc);
   const skew = Math.abs(now.getTime() - serverTime.getTime());

   if (skew > policy.time_anchor.max_clock_skew_sec * 1000) {
     throw new Error('Clock skew too large');
   }
   ```

3. **Policy Application**:
   - Time window enforcement
   - GPS service configuration
   - PIN policy implementation
   - Telemetry settings activation

## Security Features

### Cryptographic Security
- **Algorithm**: Ed25519 for JWS signatures
- **Key Rotation**: Automated key rotation every 90 days
- **Key Management**: Hardware security module (HSM) support
- **Signature Verification**: On-device public key validation

### Tamper Protection
- **Immutable Policies**: Signed policies cannot be modified
- **Version Control**: Policy versioning with backward compatibility
- **Expiration**: Automatic policy expiration with renewal requirements
- **Revocation**: Policy revocation capability for emergency updates

### Access Control
- **Device Authentication**: JWT required for policy requests
- **Team Isolation**: Policies scoped to team membership
- **Role-Based Access**: Admin-only policy configuration
- **Audit Trail**: Complete policy change logging

## Time Window Enforcement

### Working Hours Definition
```typescript
interface TimeWindow {
  days: DayOfWeek[];
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

// Example: Monday to Friday, 8 AM to 7:30 PM
const workingHours: TimeWindow = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  start: '08:00',
  end: '19:30'
};
```

### Time Zone Handling
- **Team Time Zones**: Each team has configured timezone
- **Device Time Validation**: Compare device time with server time
- **Daylight Saving**: Automatic DST adjustment support
- **Cross-Timezone**: UTC-based storage with local conversion

### Grace Periods
- **Login Grace**: 10 minutes after session start
- **GPS Grace**: 5 minutes for location acquisition
- **Network Grace**: 2 minutes for connectivity issues
- **Override Grace**: 120 minutes for supervisor overrides

## Error Handling

### Policy Generation Errors
1. **Device Not Found**:
   ```json
   {
     "ok": false,
     "error": {
       "code": "device_not_found",
       "message": "Device not registered in system"
     }
   }
   ```

2. **Team Configuration Missing**:
   ```json
   {
     "ok": false,
     "error": {
       "code": "team_not_configured",
       "message": "Team policy configuration incomplete"
     }
   }
   ```

### Device Verification Errors
1. **Invalid Signature**:
   ```json
   {
     "ok": false,
     "error": {
       "code": "invalid_policy_signature",
       "message": "Policy signature verification failed"
     }
   }
   ```

2. **Policy Expired**:
   ```json
   {
     "ok": false,
     "error": {
       "code": "policy_expired",
       "message": "Policy has expired, please refresh"
     }
   }
   ```

## Performance Optimization

### Caching Strategy
- **Policy Cache**: In-memory cache with 1-hour TTL
- **Redis Backend**: Distributed cache for multiple instances
- **Cache Invalidation**: Policy change triggers cache refresh
- **Cold Cache**: Database fallback with query optimization

### Response Time Targets
- **Policy Generation**: <100ms
- **JWS Signing**: <50ms
- **Database Storage**: <25ms
- **Total Response**: <200ms P95

### Scalability Considerations
- **Batch Policy Updates**: Bulk updates for team changes
- **CDN Distribution**: Static policy components via CDN
- **Connection Pooling**: Database connection optimization
- **Async Processing**: Background policy pre-generation

## Monitoring & Observability

### Key Metrics
- **Policy Generation Rate**: Policies generated per hour
- **Cache Hit Rate**: Percentage of requests served from cache
- **Signature Verification Time**: JWS verification performance
- **Policy Compliance**: Device policy adherence percentage

### Alerting
- **High Policy Generation Latency**: >500ms P95
- **Low Cache Hit Rate**: <80% hit ratio
- **Signature Failures**: Verification failure spikes
- **Clock Skew Alerts**: Device time drift detection

### Dashboard Metrics
- Active policies by team
- Policy version distribution
- Time window compliance rates
- GPS tracking effectiveness

---

**Dependencies**:
- Ed25519 cryptographic library
- NTP time synchronization service
- Policy configuration database
- Device authentication service

**Configuration**:
- JWS signing keys
- Policy templates
- Time zone mappings
- Cache configuration (Redis)