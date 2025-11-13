# SurveyLauncher Backend - Comprehensive Test Cases Documentation

Last updated: November 13, 2025

This document outlines all test cases needed for comprehensive coverage of the SurveyLauncher backend system, prioritized by importance and functionality.

## Table of Contents

1. [Priority 1: Critical Missing Functionality](#priority-1-critical-missing-functionality)
   - [Supervisor Override Workflow](#supervisor-override-workflow)
   - [User Logout and Session Termination](#user-logout-and-session-termination)

2. [Priority 2: Security and Edge Cases](#priority-2-security-and-edge-cases)
   - [Rate Limiting and PIN Lockout](#rate-limiting-and-pin-lockout)
   - [Session Management Edge Cases](#session-management-edge-cases)

3. [Priority 3: Advanced Functionality](#priority-3-advanced-functionality)
   - [Policy Cryptographic Verification](#policy-cryptographic-verification)
   - [Telemetry Edge Cases](#telemetry-edge-cases)

4. [Priority 4: Error Scenarios](#priority-4-error-scenarios)
   - [Database and Network Failures](#database-and-network-failures)
   - [Data Consistency Tests](#data-consistency-tests)

---

## Priority 1: Critical Missing Functionality

### Supervisor Override Workflow

**Purpose**: Test supervisor PIN-based override functionality for emergency access and time window extensions.

**Endpoints**: `POST /api/v1/supervisor/override/login`, `POST /api/v1/supervisor/override/revoke`

#### Test Cases:

**SO-001: Valid Supervisor Override Login**
- **Given**: Active device, valid team, active supervisor PIN
- **When**: POST to `/supervisor/override/login` with valid credentials
- **Then**: Should return 200 with override token and expiry time
- **Assertions**:
  - Response contains `override_until` (2 hours from now)
  - Response contains valid JWT `token`
  - Override token can be used for extended access

**SO-002: Invalid Supervisor PIN**
- **Given**: Active device, valid team
- **When**: POST to `/supervisor/override/login` with wrong supervisor PIN
- **Then**: Should return 401 with INVALID_SUPERVISOR_PIN error
- **Assertions**:
  - Error code: `INVALID_SUPERVISOR_PIN`
  - No override token returned
  - No database changes made

**SO-003: Missing Supervisor PIN Fields**
- **Given**: Any context
- **When**: POST to `/supervisor/override/login` missing required fields
- **Then**: Should return 400 with MISSING_FIELDS error
- **Test Variations**:
  - Missing `supervisor_pin` field
  - Missing `deviceId` field
  - Both fields missing

**SO-004: Supervisor Override Rate Limiting**
- **Given**: Active device, valid team
- **When**: Multiple rapid POST requests to `/supervisor/override/login`
- **Then**: Should return 429 with RATE_LIMITED error after threshold
- **Assertions**:
  - Error code: `RATE_LIMITED`
  - `retryAfter` header present
  - Rate limit resets after cooldown period

**SO-005: Supervisor Override for Inactive Device**
- **Given**: Inactive device, valid supervisor PIN
- **When**: POST to `/supervisor/override/login`
- **Then**: Should return 401 with DEVICE_NOT_FOUND error

**SO-006: Supervisor Override Without Active Supervisor PIN**
- **Given**: Active device, team with no active supervisor PIN
- **When**: POST to `/supervisor/override/login`
- **Then**: Should return 401 with NO_SUPERVISOR_PIN error

**SO-007: Supervisor Override Token Usage**
- **Given**: Valid supervisor override token
- **When**: Use token to access protected endpoints during override period
- **Then**: Should grant access with extended privileges
- **Assertions**:
  - Token works for policy access
  - Token extends session functionality
  - Token expires after `override_until` time

**SO-008: Supervisor Override Revocation**
- **Given**: Active supervisor override session
- **When**: POST to `/supervisor/override/revoke`
- **Then**: Should immediately terminate override access
- **Assertions**:
  - Override token becomes invalid
  - Return to normal access restrictions
  - Audit log records revocation

---

### User Logout and Session Termination

**Purpose**: Test user logout functionality and proper session cleanup.

**Endpoints**: `POST /api/v1/auth/logout`

#### Test Cases:

**UL-001: Valid User Logout**
- **Given**: Active user session with valid JWT token
- **When**: POST to `/auth/logout` with session token
- **Then**: Should return 200 and terminate session
- **Assertions**:
  - Session marked as ended in database
  - JWT token added to revocation list
  - Audit log records logout event
  - Response contains logout confirmation

**UL-002: Logout with Invalid Session**
- **Given**: Invalid or expired JWT token
- **When**: POST to `/auth/logout`
- **Then**: Should return 401 with INVALID_TOKEN error

**UL-003: Logout Without Token**
- **Given**: No authorization header
- **When**: POST to `/auth/logout`
- **Then**: Should return 401 with MISSING_TOKEN error

**UL-004: Session Cleanup Verification**
- **Given**: User logs out successfully
- **When**: Try to use the same JWT token after logout
- **Then**: Should return 401 - token is now revoked
- **Assertions**:
  - Token appears in jwt_revocations table
  - Cannot access protected endpoints
  - Session status updated to 'ended'

**UL-005: Multiple Concurrent Sessions**
- **Given**: User has multiple active sessions (different devices)
- **When**: Logout from one session
- **Then**: Should only terminate the specific session
- **Assertions**:
  - Other sessions remain active
  - Only target session revoked
  - Correct session_id terminated

---

## Priority 2: Security and Edge Cases

### Rate Limiting and PIN Lockout

**Purpose**: Test security controls to prevent abuse and protect accounts.

#### Test Cases:

**RL-001: Login Rate Limiting**
- **Given**: Valid device and user
- **When**: Multiple rapid login attempts (more than configured limit)
- **Then**: Should return 429 with RATE_LIMITED error
- **Assertions**:
  - Error code: `RATE_LIMITED`
  - `retryAfter` header present
  - Rate limit resets after configured window

**RL-002: Device-based Rate Limiting**
- **Given**: Single device ID
- **When**: Login attempts from multiple user codes exceeding limit
- **Then**: Should rate limit by device ID
- **Assertions**: Rate limiting applied per device identifier

**RL-003: IP-based Rate Limiting**
- **Given**: Single IP address
- **When**: Login attempts from multiple devices exceeding limit
- **Then**: Should rate limit by IP address
- **Assertions**: Rate limiting applied per IP address

**RL-004: PIN Lockout After Failed Attempts**
- **Given**: Valid user account
- **When**: Multiple failed PIN attempts (exceeding configured limit)
- **Then**: Should return 423 with ACCOUNT_LOCKED error
- **Assertions**:
  - Error code: `ACCOUNT_LOCKED`
  - `retryAfter` indicates lockout duration
  - Account unlocks after cooldown period

**RL-005: PIN Lockout Recovery**
- **Given**: Locked user account after failed attempts
- **When**: Wait for lockout period and try valid login
- **Then**: Should allow login after lockout expires
- **Assertions**:
  - Lockout duration matches configuration
  - Successful login resets failed attempt counter
  - Account returns to normal state

**RL-006: Failed Attempt Counter Reset**
- **Given**: User with some failed attempts
- **When**: Successful login attempt
- **Then**: Should reset failed attempt counter to zero
- **Assertions**:
  - Counter reset in database
  - Subsequent failed attempts start fresh count
  - Audit log records successful login

**RL-007: Supervisor PIN Rate Limiting**
- **Given**: Valid supervisor PIN
- **When**: Multiple rapid supervisor override attempts
- **Then**: Should apply separate rate limiting for supervisor PINs
- **Assertions**:
  - Different rate limits than user PINs
  - Independent counters for supervisor vs user attempts

---

### Session Management Edge Cases

**Purpose**: Test complex session scenarios and edge cases.

#### Test Cases:

**SM-001: Session Expiration Handling**
- **Given**: Active session that has expired
- **When**: Try to access protected endpoint with expired session
- **Then**: Should return 401 with SESSION_EXPIRED error
- **Assertions**:
  - Session marked as 'expired' in database
  - Token treated as invalid
  - Proper cleanup performed

**SM-002: Session Override Functionality**
- **Given**: Active user session
- **When**: Supervisor override applied to session
- **Then**: Session should have override_until timestamp
- **Assertions**:
  - `override_until` field set correctly
  - Extended access permissions during override
  - Override expires at correct time

**SM-003: Concurrent Session Management**
- **Given**: User with multiple active sessions
- **When**: Perform actions in different sessions
- **Then**: Each session should work independently
- **Assertions**:
  - Sessions don't interfere with each other
  - Rate limiting applied per session
  - Proper isolation maintained

**SM-004: Session Cleanup Performance**
- **Given**: Large number of expired sessions
- **When**: Cleanup processes run
- **Then**: Should efficiently clean up expired sessions
- **Assertions**:
  - Expired sessions removed from database
  - Performance remains acceptable
  - No active sessions affected

---

## Priority 3: Advanced Functionality

### Policy Cryptographic Verification

**Purpose**: Test policy signing, verification, and cryptographic security.

#### Test Cases:

**PV-001: Policy Signature Verification**
- **Given**: Valid policy with Ed25519 signature
- **When**: Verify policy signature
- **Then**: Should successfully validate cryptographic signature
- **Assertions**:
  - Signature verification passes
  - Policy content integrity maintained
  - Tampering detected and rejected

**PV-002: Invalid Policy Signature Rejection**
- **Given**: Policy with corrupted or invalid signature
- **When**: Verify policy signature
- **Then**: Should reject policy with signature error
- **Assertions**:
  - Invalid signature detected
  - Policy rejected with appropriate error
  - Security log records signature failure

**PV-003: Policy Expiration Handling**
- **Given**: Expired policy (timestamp in past)
- **When**: Request policy for device
- **Then**: Should generate fresh policy with new expiration
- **Assertions**:
  - New policy has current timestamps
  - Expired policy not served
  - Cache invalidation works correctly

**PV-004: Policy Cache Invalidation**
- **Given**: Cached policy for device
- **When**: Policy changes or expires
- **Then**: Should invalidate cache and serve fresh policy
- **Assertions**:
  - Cache miss triggers fresh generation
  - Stale policy not served
  - Performance impact acceptable

---

### Telemetry Edge Cases

**Purpose**: Test telemetry processing under various conditions.

#### Test Cases:

**TE-001: Maximum Batch Size Handling**
- **Given**: Telemetry batch at maximum configured size
- **When**: Submit batch to `/telemetry` endpoint
- **Then**: Should process batch successfully
- **Assertions**:
  - All events accepted and stored
  - Performance within acceptable limits
  - No memory leaks or crashes

**TE-002: Oversized Batch Rejection**
- **Given**: Telemetry batch exceeding maximum size
- **When**: Submit batch to `/telemetry` endpoint
- **Then**: Should reject with appropriate error
- **Assertions**:
  - Batch rejected with error message
  - No partial data stored
  - Clear error response provided

**TE-003: Invalid Event Type Filtering**
- **Given**: Batch containing invalid/unknown event types
- **When**: Submit batch to `/telemetry` endpoint
- **Then**: Should filter out invalid events and accept valid ones
- **Assertions**:
  - Valid events stored
  - Invalid events dropped with logging
  - Response indicates accepted/filtered counts

**TE-004: Malformed JSON Handling**
- **Given**: Malformed JSON in telemetry request
- **When**: Submit to `/telemetry` endpoint
- **Then**: Should reject with parsing error
- **Assertions**:
  - Graceful error handling
  - No partial data stored
  - Security implications considered

---

## Priority 4: Error Scenarios

### Database and Network Failures

**Purpose**: Test system behavior under failure conditions.

#### Test Cases:

**DF-001: Database Connection Failure**
- **Given**: Database unavailable or connection lost
- **When**: Any API request requiring database access
- **Then**: Should return 503 with appropriate error
- **Assertions**:
  - Service Unavailable response
  - No data corruption
  - Connection retry logic works

**DF-002: Database Transaction Rollback**
- **Given**: Multi-step operation that fails partway through
- **When**: Database error occurs during transaction
- **Then**: Should roll back all changes
- **Assertions**:
  - Database remains consistent
  - No partial data written
  - Error properly logged

---

### Data Consistency Tests

**Purpose**: Test data integrity and consistency scenarios.

#### Test Cases:

**DC-001: Concurrent Login Attempts**
- **Given**: Same user credentials from multiple sources
- **When**: Simultaneous login attempts
- **Then**: Should handle gracefully without data corruption
- **Assertions**:
  - Database constraints maintained
  - No duplicate sessions created
  - Proper isolation between attempts

**DC-002: UUID Format Validation**
- **Given**: Various UUID formats in requests
- **When**: Submit requests with malformed UUIDs
- **Then**: Should reject invalid UUID formats
- **Assertions**:
  - Invalid UUIDs rejected with 400 error
  - Valid UUIDs accepted normally
  - Clear error messages provided

---

## Implementation Priority

**Phase 1 (Immediate):**
- SO-001 to SO-008: Complete Supervisor Override workflow
- UL-001 to UL-005: User Logout and session termination

**Phase 2 (Next):**
- RL-001 to RL-007: Rate limiting and PIN lockout
- SM-001 to SM-004: Session management edge cases

**Phase 3 (Future):**
- PV-001 to PV-004: Policy cryptographic verification
- TE-001 to TE-004: Telemetry edge cases

**Phase 4 (Final):**
- DF-001 to DF-002: Database failure scenarios
- DC-001 to DC-002: Data consistency tests

This comprehensive test suite will ensure robust coverage of all critical functionality, security controls, and edge cases in the SurveyLauncher backend system.