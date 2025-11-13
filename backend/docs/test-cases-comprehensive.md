# SurveyLauncher Backend - Complete Test Cases Specification

**Comprehensive Test Cases for All API Endpoints and Services**
Last Updated: January 14, 2025

## Table of Contents

1. [Test Case Structure](#test-case-structure)
2. [Critical Missing Tests - High Priority](#critical-missing-tests---high-priority)
3. [Enhancement Tests - Medium Priority](#enhancement-tests---medium-priority)
4. [Complete Coverage Tests - Low Priority](#complete-coverage-tests---low-priority)
5. [Test Implementation Templates](#test-implementation-templates)
6. [Success Criteria](#success-criteria)

---

## Test Case Structure

### Test Case Naming Convention

```
[Component]-[Number]: [Test Description]
Example: POLICY-001: Policy creation with valid device ID
```

### Test Case Format

```typescript
describe('[Component]', () => {
  describe('[Feature]', () => {
    it('[Number]: [Description]', async () => {
      // Given: Setup preconditions
      // When: Execute action
      // Then: Verify results
      // Assertions: Specific validation points
    });
  });
});
```

---

## Critical Missing Tests - High Priority

### 1. Policy Service Testing (`src/services/policy-service.ts`)

**Endpoints**: `GET /api/v1/policy/:deviceId`

#### Policy Creation Tests

**POLICY-001: Policy creation with valid device**
- **Given**: Valid device ID, team with active supervisor PIN
- **When**: Request policy for device
- **Then**: Should return 200 with signed JWS policy
- **Assertions**:
  - Response contains valid JWS structure
  - Policy signed with Ed25519 private key
  - Policy includes correct device and team information
  - Policy expiration is 24 hours from creation

**POLICY-002: Policy for non-existent device**
- **Given**: Invalid device ID
- **When**: Request policy for device
- **Then**: Should return 404 with DEVICE_NOT_FOUND error
- **Assertions**:
  - Error code: `DEVICE_NOT_FOUND`
  - No policy returned
  - Error message is descriptive

**POLICY-003: Policy for inactive device**
- **Given**: Valid device ID, device marked as inactive
- **When**: Request policy for device
- **Then**: Should return 401 with DEVICE_NOT_FOUND error
- **Assertions**:
  - Device inactivity is respected
  - No policy returned for inactive devices

#### Policy Cryptographic Tests

**POLICY-004: Policy signature verification**
- **Given**: Valid policy with Ed25519 signature
- **When**: Verify policy signature with public key
- **Then**: Should successfully validate cryptographic signature
- **Assertions**:
  - Signature verification passes
  - Policy content integrity maintained
  - Tampering detected and rejected

**POLICY-005: Invalid policy signature rejection**
- **Given**: Policy with corrupted or invalid signature
- **When**: Verify policy signature
- **Then**: Should reject policy with signature error
- **Assertions**:
  - Invalid signature detected
  - Policy rejected with appropriate error
  - Security log records signature failure

**POLICY-006: Policy tampering detection**
- **Given**: Valid policy with modified content
- **When**: Verify policy signature
- **Then**: Should reject tampered policy
- **Assertions**:
  - Tampered content detected
  - Signature verification fails
  - Policy not served to client

#### Policy Content Tests

**POLICY-007: Policy contains required fields**
- **Given**: Valid device and team
- **When**: Generate policy
- **Then**: Policy should include all required fields
- **Assertions**:
  - Contains: version, deviceId, teamId, timezone, time_anchor
  - Contains: session (allowed_windows, grace_minutes, supervisor_override_minutes)
  - Contains: pin (mode, min_length, retry_limit, cooldown_seconds)
  - Contains: gps (active_fix_interval_minutes, min_displacement_m)
  - Contains: telemetry (heartbeat_minutes, batch_max)

**POLICY-008: Policy time window enforcement**
- **Given**: Team with configured time windows
- **When**: Generate policy
- **Then**: Policy should reflect team's time windows
- **Assertions**:
  - Correct days of week specified
  - Correct start/end times in UTC
  - Grace periods included
  - Override durations correct

**POLICY-009: Policy expiration handling**
- **Given**: Expired policy (timestamp in past)
- **When**: Request policy for device
- **Then**: Should generate fresh policy with new expiration
- **Assertions**:
  - New policy has current timestamps
  - Expired policy not served
  - Cache invalidation works correctly

#### Policy Cache Tests

**POLICY-010: Policy caching and retrieval**
- **Given**: Device requesting policy multiple times
- **When**: First request creates policy, subsequent requests use cache
- **Then**: Should serve cached policy within cache window
- **Assertions**:
  - First request creates and stores policy
  - Subsequent requests return cached policy
  - Performance improvement measurable

**POLICY-011: Policy cache invalidation**
- **Given**: Cached policy for device
- **When**: Policy changes or expires
- **Then**: Should invalidate cache and serve fresh policy
- **Assertions**:
  - Cache miss triggers fresh generation
  - Stale policy not served
  - Performance impact acceptable

### 2. Telemetry Service Testing (`src/services/telemetry-service.ts`)

**Endpoints**: `POST /api/v1/telemetry`

#### Telemetry Batch Processing Tests

**TELEMETRY-001: Valid telemetry batch processing**
- **Given**: Valid telemetry batch with GPS, heartbeat, and custom events
- **When**: Submit batch to `/telemetry` endpoint
- **Then**: Should accept and process all events
- **Assertions**:
  - Response 200 OK with accepted count
  - All events stored in database
  - Event timestamps preserved
  - Event types validated

**TELEMETRY-002: Maximum batch size handling**
- **Given**: Telemetry batch at maximum configured size (50 events)
- **When**: Submit batch to `/telemetry` endpoint
- **Then**: Should process batch successfully
- **Assertions**:
  - All events accepted and stored
  - Performance within acceptable limits (<2 seconds)
  - No memory leaks or crashes

**TELEMETRY-003: Oversized batch rejection**
- **Given**: Telemetry batch exceeding maximum size (>50 events)
- **When**: Submit batch to `/telemetry` endpoint
- **Then**: Should reject with appropriate error
- **Assertions**:
  - Batch rejected with 400 Bad Request
  - Error code: `BATCH_TOO_LARGE`
  - No partial data stored
  - Clear error message provided

#### Telemetry Event Type Tests

**TELEMETRY-004: GPS event processing**
- **Given**: GPS telemetry event with valid coordinates
- **When**: Submit GPS event
- **Then**: Should store location data correctly
- **Assertions**:
  - Latitude, longitude, accuracy stored
  - Device ID and session ID linked
  - GPS-specific validation applied (coordinate ranges)

**TELEMETRY-005: Heartbeat event processing**
- **Given**: Heartbeat telemetry event with device status
- **When**: Submit heartbeat event
- **Then**: Should update device status
- **Assertions**:
  - Device last seen timestamp updated
  - Battery level recorded
  - Device health status tracked

**TELEMETRY-006: Custom event type filtering**
- **Given**: Batch containing unknown event types
- **When**: Submit batch to `/telemetry` endpoint
- **Then**: Should filter out unknown events and accept valid ones
- **Assertions**:
  - Valid events stored (gps, heartbeat, gate.blocked)
  - Invalid events dropped with logging
  - Response indicates accepted/filtered counts

#### Telemetry Validation Tests

**TELEMETRY-007: Malformed JSON handling**
- **Given**: Malformed JSON in telemetry request
- **When**: Submit to `/telemetry` endpoint
- **Then**: Should reject with parsing error
- **Assertions**:
  - Response 400 Bad Request
  - Error code: `INVALID_JSON`
  - No partial data stored
  - Security implications considered

**TELEMETRY-008: Invalid event structure validation**
- **Given**: Events missing required fields (timestamp, type, etc.)
- **When**: Submit malformed events
- **Then**: Should reject invalid events
- **Assertions**:
  - Events missing required fields rejected
  - Valid events in batch still processed
  - Validation errors logged appropriately

**TELEMETRY-009: Timestamp validation**
- **Given**: Events with future timestamps or invalid formats
- **When**: Submit events with invalid timestamps
- **Then**: Should reject or correct timestamps
- **Assertions**:
  - Future timestamps rejected or corrected
  - Invalid timestamp formats caught
  - Server-side timestamps applied when needed

#### Telemetry Security Tests

**TELEMETRY-010: Authentication requirement**
- **Given**: No authentication token
- **When**: Submit telemetry to `/telemetry` endpoint
- **Then**: Should require valid device authentication
- **Assertions**:
  - Response 401 Unauthorized
  - No telemetry data stored
  - Authentication enforced

**TELEMETRY-011: Device ownership validation**
- **Given**: Valid token for different device ID in telemetry
- **When**: Submit telemetry for device not owned by authenticated session
- **Then**: Should reject telemetry submission
- **Assertions**:
  - Response 403 Forbidden
  - Cross-device data submission blocked
  - Device ownership enforced

#### Telemetry Performance Tests

**TELEMETRY-012: Concurrent telemetry submission**
- **Given**: Multiple devices submitting telemetry simultaneously
- **When**: Submit concurrent telemetry batches
- **Then**: Should handle concurrent submissions efficiently
- **Assertions**:
  - All submissions processed without data loss
  - Performance remains acceptable (<5s per batch)
  - Database connection pool handles load

**TELEMETRY-013: Telemetry retention and cleanup**
- **Given**: Large volume of telemetry data (90+ days old)
- **When**: Cleanup process runs
- **Then**: Should efficiently clean up old telemetry
- **Assertions**:
  - Old telemetry removed from database
  - Recent telemetry preserved
  - Performance impact minimal

### 3. JWT Service Testing (`src/services/jwt-service.ts`)

#### JWT Creation Tests

**JWT-001: Access token creation**
- **Given**: Valid user session data
- **When**: Create access token
- **Then**: Should return valid JWT with correct claims
- **Assertions**:
  - Token contains required claims (sub, iat, exp, type)
  - Token signed with correct algorithm
  - Token expiration matches configuration
  - JTI (JWT ID) generated and tracked

**JWT-002: Refresh token creation**
- **Given**: Valid user session data
- **When**: Create refresh token
- **Then**: Should return valid refresh token
- **Assertions**:
  - Refresh token has longer expiration
  - Contains required claims
  - Linked to user session
  - JTI tracked for revocation

**JWT-003: Token payload validation**
- **Given**: Various payload data types
- **When**: Create tokens with different payloads
- **Then**: Should handle payload serialization correctly
- **Assertions**:
  - Complex objects serialized properly
  - Special characters handled
  - Array and object payloads preserved

#### JWT Verification Tests

**JWT-004: Valid token verification**
- **Given**: Valid JWT token
- **When**: Verify token
- **Then**: Should return valid payload
- **Assertions**:
  - Token signature verified
  - Token expiration checked
  - Token type validated
  - Payload returned correctly

**JWT-005: Invalid signature rejection**
- **Given**: JWT token with invalid signature
- **When**: Verify token
- **Then**: Should reject invalid signature
- **Assertions**:
  - Invalid signature detected
  - Token rejected with error
  - Security log records failure

**JWT-006: Expired token rejection**
- **Given**: Expired JWT token
- **When**: Verify token
- **Then**: Should reject expired token
- **Assertions**:
  - Expiration detected correctly
  - Token rejected with EXPIRED_TOKEN error
  - Clock skew handling works

**JWT-007: Malformed token handling**
- **Given**: Malformed JWT token (wrong format, missing parts)
- **When**: Verify token
- **Then**: Should reject malformed token
- **Assertions**:
  - Format validation catches errors
  - Token rejected gracefully
  - No security vulnerabilities exposed

#### JWT Refresh Tests

**JWT-008: Token refresh with valid refresh token**
- **Given**: Valid refresh token
- **When**: Request token refresh
- **Then**: Should issue new access token
- **Assertions**:
  - New access token generated
  - Original refresh token remains valid
  - New token has correct expiration
  - User session maintained

**JWT-009: Refresh token revocation**
- **Given**: Refresh token that has been revoked
- **When**: Attempt to use revoked token
- **Then**: Should reject refresh request
- **Assertions**:
  - Revoked token detected
  - Request rejected with REVOKED_TOKEN error
  - JTI revocation list checked

**JWT-010: Refresh token expiration**
- **Given**: Expired refresh token
- **When**: Attempt token refresh
- **Then**: Should reject refresh request
- **Assertions**:
  - Expiration detected
  - Request rejected with EXPIRED_TOKEN error
  - User must re-authenticate

#### JWT Security Tests

**JWT-011: JTI generation and uniqueness**
- **Given**: Multiple token creation requests
- **When**: Create multiple tokens
- **Then**: Each token should have unique JTI
- **Assertions**:
  - JTIs are cryptographically random
  - No duplicates in reasonable timeframe
  - JTI length appropriate (32+ chars)

**JWT-012: Token algorithm enforcement**
- **Given**: Token creation attempts
- **When**: Create tokens with different algorithms
- **Then**: Should enforce secure algorithm (HS256/RS256)
- **Assertions**:
  - Only allowed algorithms used
  - Algorithm downgrading prevented
  - Cryptographic standards enforced

**JWT-013: Token header validation**
- **Given**: Various JWT header configurations
- **When**: Create and verify tokens
- **Then**: Should validate header structure
- **Assertions**:
  - Required header fields present
  - Algorithm field validated
  - Type field correct (JWT)

---

## Enhancement Tests - Medium Priority

### 4. Rate Limiter Service Testing (`src/services/rate-limiter.ts`)

#### Login Rate Limiting Tests

**RATELIMIT-001: Login rate limiting by device**
- **Given**: Single device ID
- **When**: Multiple login attempts exceeding threshold
- **Then**: Should rate limit after threshold
- **Assertions**:
  - Rate limit applied per device
  - 429 response with retryAfter header
  - Rate limit resets after configured window

**RATELIMIT-002: Login rate limiting by IP**
- **Given**: Single IP address
- **When**: Login attempts from multiple devices
- **Then**: Should rate limit by IP address
- **Assertions**:
  - Rate limiting applied per IP
  - Multiple devices share IP limit
  - IP-based enforcement works

**RATELIMIT-003: Rate limit recovery**
- **Given**: Rate limited device/IP
- **When**: Wait for cooldown period
- **Then**: Should allow requests after cooldown
- **Assertions**:
  - Rate limit expires at correct time
  - New requests accepted after cooldown
  - Rate limit counter reset

#### PIN Lockout Tests

**RATELIMIT-004: PIN lockout after failed attempts**
- **Given**: Valid user account
- **When**: Multiple failed PIN attempts
- **Then**: Should lock account after threshold
- **Assertions**:
  - Account locked after 5 failed attempts
  - 423 response with ACCOUNT_LOCKED error
  - Lockout duration matches configuration

**RATELIMIT-005: PIN lockout recovery**
- **Given**: Locked user account
- **When**: Wait for lockout duration
- **Then**: Should allow login after unlock
- **Assertions**:
  - Account unlocked after cooldown
  - Successful login resets failed counter
  - Account returns to normal state

**RATELIMIT-006: Failed attempt counter behavior**
- **Given**: User with some failed attempts
- **When**: Successful login attempt
- **Then**: Should reset failed attempt counter
- **Assertions**:
  - Counter reset to zero on success
  - Subsequent failures start fresh count
  - Attempt history properly tracked

#### Telemetry Rate Limiting Tests

**RATELIMIT-007: Telemetry submission rate limiting**
- **Given**: Single device submitting telemetry
- **When**: Excessive telemetry submissions
- **Then**: Should apply rate limiting to telemetry endpoint
- **Assertions**:
  - Rate limit applied per device
  - Telemetry throttled after threshold
  - Rate limiting prevents abuse

**RATELIMIT-008: Different rate limits per endpoint**
- **Given**: Various API endpoints
- **When**: Make requests to different endpoints
- **Then**: Should apply appropriate rate limits per endpoint
- **Assertions**:
  - Login has stricter limits than telemetry
  - Supervisor PIN has separate limits
  - Rate limits correctly configured per endpoint

### 5. Device Service Testing (`src/services/device-service.ts`)

#### Device Lifecycle Tests

**DEVICE-001: Device registration with valid data**
- **Given**: Valid device registration data
- **When**: Register new device
- **Then**: Should create device successfully
- **Assertions**:
  - Device stored in database
  - Android ID validated and unique
  - Team association correct
  - Initial status set correctly

**DEVICE-002: Device Android ID uniqueness validation**
- **Given**: Existing device with Android ID
- **When**: Attempt to register device with same Android ID
- **Then**: Should reject duplicate Android ID
- **Assertions**:
  - 409 Conflict response
  - Error code: `ANDROID_ID_EXISTS`
  - No duplicate device created

**DEVICE-003: Device activation/deactivation**
- **Given**: Existing device
- **When**: Activate or deactivate device
- **Then**: Should update device status
- **Assertions**:
  - Device status updated in database
  - Authentication respects status changes
  - Inactive devices cannot authenticate

**DEVICE-004: Device app version validation**
- **Given**: Device registration with app version
- **When**: Register device with various app versions
- **Then**: Should validate and store app version
- **Assertions**:
  - App version stored correctly
  - Version format validation works
  - Compatibility checking applied

#### Device-Team Binding Tests

**DEVICE-005: Device team binding security**
- **Given**: Device registration request
- **When**: Attempt to bind device to unauthorized team
- **Then**: Should prevent unauthorized team binding
- **Assertions**:
  - Team membership validated
  - Cross-team device creation blocked
  - Authorization properly enforced

**DEVICE-006: Device transfer between teams**
- **Given**: Device belonging to one team
- **When**: Transfer device to different team
- **Then**: Should handle transfer securely
- **Assertions**:
  - Old team association removed
  - New team association created
  - Transfer audit logged

#### Device Health Monitoring Tests

**DEVICE-007: Device last seen tracking**
- **Given**: Device activity
- **When**: Update device last seen timestamp
- **Then**: Should track device activity
- **Assertions**:
  - Last seen timestamp updated
  - Device health status maintained
  - Inactive device detection works

**DEVICE-008: Device status monitoring**
- **Given**: Device with various states
- **When**: Monitor device health and status
- **Then**: Should accurately track device status
- **Assertions**:
  - Device status correctly reported
  - Health metrics tracked
  - Status changes logged

### 6. Enhanced User Service Testing

#### User PIN Management Tests

**USER-PIN-001: PIN rotation and security policies**
- **Given**: User with existing PIN
- **When**: Rotate user PIN
- **Then**: Should update PIN securely
- **Assertions**:
  - Old PIN invalidated
  - New PIN hashed correctly
  - PIN rotation audit logged
  - PIN complexity enforced

**USER-PIN-002: PIN strength validation**
- **Given**: Various PIN formats
- **When**: Set user PIN with different strengths
- **Then**: Should enforce PIN security policies
- **Assertions**:
  - Minimum length enforced (4+ chars)
  - PIN complexity requirements met
  - Common PINs rejected
  - PIN change frequency enforced

**USER-PIN-003: PIN reset workflows**
- **Given**: User who forgot PIN
- **When**: Initiate PIN reset process
- **Then**: Should handle PIN reset securely
- **Assertions**:
  - PIN reset authorized
  - Temporary PIN or reset token issued
  - Reset process audit logged
  - Security questions/verification applied

#### User Role and Permission Tests

**USER-ROLE-001: Role hierarchy and permissions**
- **Given**: Users with different roles
- **When**: Test role-based access control
- **Then**: Should enforce role hierarchy correctly
- **Assertions**:
  - ADMIN role has all permissions
  - SUPERVISOR role has team management permissions
  - TEAM_MEMBER role has limited permissions
  - Role escalation prevented

**USER-ROLE-002: Cross-team user management**
- **Given**: Users in different teams
- **When**: Attempt cross-team user operations
- **Then**: Should enforce team boundaries
- **Assertions**:
  - Users cannot access other teams
  - Cross-team operations blocked
  - Team isolation maintained

#### User Activity and Audit Tests

**USER-AUDIT-001: User activity logging**
- **Given**: User performing various actions
- **When**: Log user activities
- **Then**: Should maintain comprehensive audit trail
- **Assertions**:
  - Login/logout events logged
  - Permission changes logged
  - Data access logged
  - Audit trail tamper-proof

**USER-AUDIT-002: User data privacy**
- **Given**: User personal information
- **When**: Handle user data
- **Then**: Should protect user privacy
- **Assertions**:
  - Sensitive data encrypted
  - Data access controlled
  - GDPR compliance maintained
  - Data retention policies enforced

---

## Complete Coverage Tests - Low Priority

### 7. End-to-End Integration Tests

#### Android App Flow Tests

**E2E-001: Complete authentication → policy → telemetry flow**
- **Given**: Android device with app
- **When**: Complete user workflow
- **Then**: Should handle end-to-end flow
- **Assertions**:
  - Device registration successful
  - User authentication works
  - Policy retrieval and verification successful
  - Telemetry submission works
  - Session management correct

**E2E-002: Supervisor override workflow integration**
- **Given**: User in time-restricted window
- **When**: Apply supervisor override
- **Then**: Should extend access correctly
- **Assertions**:
  - Supervisor PIN authentication works
  - Override token issued correctly
  - Extended access permissions granted
  - Override expiration enforced

**E2E-003: Multi-device user session handling**
- **Given**: User with multiple devices
- **When**: User logs in on multiple devices
- **Then**: Should handle concurrent sessions
- **Assertions**:
  - Each device gets separate session
  - Sessions don't interfere with each other
  - Logout affects specific device only
  - Rate limiting applied per device

**E2E-004: Offline policy caching behavior**
- **Given**: Device with cached policy
- **When**: Device operates offline
- **Then**: Should use cached policy correctly
- **Assertions**:
  - Cached policy serves when offline
  - Policy expiration enforced offline
  - Online refresh works when available
  - Cache invalidation handled

### 8. Performance and Load Testing

#### Concurrent User Tests

**PERF-001: Concurrent user login load testing**
- **Given**: Multiple users authenticating simultaneously
- **When**: 100+ concurrent login attempts
- **Then**: Should handle load gracefully
- **Assertions**:
  - Response times <2 seconds
  - No authentication failures due to load
  - Database handles concurrent connections
  - Rate limiting still enforced

**PERF-002: Telemetry batch ingestion performance**
- **Given**: High volume telemetry submission
- **When**: 1000+ telemetry events per minute
- **Then**: Should process efficiently
- **Assertions**:
  - Processing time <5 seconds per batch
  - No data loss under load
  - Memory usage stable
  - Database performance acceptable

**PERF-003: Database connection pool stress testing**
- **Given**: High concurrent database access
- **When**: Multiple processes access database
- **Then**: Should manage connections efficiently
- **Assertions**:
  - Connection pool handles load
  - No connection leaks detected
  - Database query times stable
  - Pool size adjustments work

#### Resource Usage Tests

**PERF-004: Memory leak detection**
- **Given**: Long-running application
- **When**: Monitor memory usage over time
- **Then**: Should maintain stable memory usage
- **Assertions**:
  - No memory leaks detected
  - Garbage collection works effectively
  - Memory usage within expected bounds
  - Resource cleanup works

**PERF-005: CPU usage optimization**
- **Given**: Normal and peak load scenarios
- **When**: Monitor CPU usage
- **Then**: Should use CPU efficiently
- **Assertions**:
  - CPU usage within acceptable limits
  - No infinite loops detected
  - Background processes optimized
  - Scalability maintained

---

## Test Implementation Templates

### Unit Test Template

```typescript
// tests/unit/[service-name].test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceName } from '../../src/services/service-name';
import { db } from '../../src/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Mock external dependencies
vi.mock('../../src/services/external-service', () => ({
  ExternalService: {
    method: vi.fn().mockResolvedValue(expectedResult),
  },
}));

describe('ServiceName', () => {
  let testUserId: string;
  let testTeamId: string;

  beforeEach(async () => {
    // Generate test UUIDs
    testUserId = uuidv4();
    testTeamId = uuidv4();

    // Setup test data in real database
    await db.insert(teams).values({
      id: testTeamId,
      name: 'Test Team',
      timezone: 'UTC',
      stateId: 'MH01',
      isActive: true,
    });
  });

  afterEach(async () => {
    // Clean up test data respecting foreign key constraints
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(teams).where(eq(teams.id, testTeamId));

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle happy path', async () => {
      // Arrange
      const input = createValidInput();

      // Act
      const result = await ServiceName.methodName(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle error case', async () => {
      // Arrange
      const input = createInvalidInput();

      // Act & Assert
      await expect(
        ServiceName.methodName(input)
      ).rejects.toThrow('Expected error message');
    });
  });
});
```

### Integration Test Template

```typescript
// tests/integration/[endpoint].test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('[API Endpoint]', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup: Create test data and get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId: 'test-device-id',
        userCode: 'test-user',
        pin: '123456'
      });

    authToken = loginResponse.body.access_token;
    testUserId = loginResponse.body.session.userId;
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await request(app)
      .delete(`/api/v1/users/${testUserId}`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  describe('[Feature]', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/protected-endpoint');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return success for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/protected-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

---

## Success Criteria

### Test Coverage Targets

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| **Unit Test Success Rate** | 100% (44/44) | 100% | ✅ Achieved |
| **Overall Code Coverage** | 74.04% | 85-90% | 🎯 High Priority |
| **Security Function Coverage** | 95%+ | 100% | 🔴 Critical |
| **Integration Test Coverage** | Partial | Complete | 🟡 Medium |
| **Performance Test Coverage** | None | Baseline | 🔵 Low |

### Implementation Phases

#### **Phase 1: Critical Security (Week 1)**
- [ ] Policy Service Tests (POLICY-001 to POLICY-011)
- [ ] JWT Service Tests (JWT-001 to JWT-013)
- [ ] Telemetry Service Tests (TELEMETRY-001 to TELEMETRY-013)

#### **Phase 2: Enhanced Security (Week 2)**
- [ ] Rate Limiter Tests (RATELIMIT-001 to RATELIMIT-008)
- [ ] Device Service Tests (DEVICE-001 to DEVICE-008)
- [ ] Enhanced User Service Tests (USER-PIN-001 to USER-AUDIT-002)

#### **Phase 3: Complete Coverage (Week 3-4)**
- [ ] End-to-End Integration Tests (E2E-001 to E2E-004)
- [ ] Performance Tests (PERF-001 to PERF-005)

### Quality Gates

- ✅ **All new tests must pass**: 100% test success rate required
- ✅ **Coverage thresholds**: Minimum 85% overall coverage
- ✅ **Security validation**: All critical security functions tested
- ✅ **Performance benchmarks**: Response times under load must be acceptable
- ✅ **Code quality**: Tests must follow established patterns and conventions

---

**This comprehensive test case specification provides detailed testing requirements for all SurveyLauncher backend functionality, prioritized by business impact and security requirements.**