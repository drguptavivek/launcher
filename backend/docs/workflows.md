# SurveyLauncher Backend - Workflows Documentation

Last updated: November 13, 2025

This document describes all the core workflows and processes implemented in the SurveyLauncher backend system.

## Table of Contents

1. [Authentication Workflows](#authentication-workflows)
   - [User Login](#user-login)
   - [Token Refresh](#token-refresh)
   - [User Logout](#user-logout)
   - [JWT Token Verification](#jwt-token-verification)

2. [Policy Management Workflows](#policy-management-workflows)
   - [Policy Issuance](#policy-issuance)
   - [Policy Validation](#policy-validation)
   - [Policy Signing](#policy-signing)

3. [Telemetry Workflows](#telemetry-workflows)
   - [Telemetry Ingestion](#telemetry-ingestion)
   - [Telemetry Validation](#telemetry-validation)
   - [Telemetry Storage](#telemetry-storage)

4. [Session Management Workflows](#session-management-workflows)
   - [Session Creation](#session-creation)
   - [Session Validation](#session-validation)
   - [Session Termination](#session-termination)

5. [Security Workflows](#security-workflows)
   - [PIN Verification](#pin-verification)
   - [Rate Limiting](#rate-limiting)
   - [Token Revocation](#token-revocation)

6. [Database Workflows](#database-workflows)
   - [Database Migrations](#database-migrations)
   - [Entity Relationships](#entity-relationships)
   - [Data Consistency](#data-consistency)

---

## Authentication Workflows

### User Login

**Purpose**: Authenticate users with device credentials and establish active sessions.

**Process Steps**:
1. **Input Validation**: Validate required fields (deviceId, userCode, pin)
2. **Device Verification**: Check device exists and is active in database
3. **User Lookup**: Find user by code and verify team association
4. **PIN Verification**: Hash input PIN and compare with stored hash using Argon2id
5. **Rate Limiting**: Check login attempts against rate limits
6. **Session Creation**: Create database session with expiration and metadata
7. **JWT Generation**: Create access and refresh tokens with proper claims
8. **Audit Logging**: Record successful/failed login attempts
9. **Response**: Return session info and tokens to client

**Key Components**:
- `AuthService.login()`
- `AuthService.verifyPin()`
- `JWTService.createToken()`
- Database: `devices`, `users`, `user_pins`, `sessions` tables

**Security Features**:
- PIN hashing with Argon2id
- Rate limiting per device/IP
- Token-based authentication
- Comprehensive audit logging

### Token Refresh

**Purpose**: Generate new access tokens using valid refresh tokens.

**Process Steps**:
1. **Token Extraction**: Extract refresh token from request body
2. **Token Validation**: Verify refresh token signature and expiration
3. **Revocation Check**: Ensure token hasn't been revoked
4. **Token Generation**: Create new access token with updated claims
5. **Response**: Return new access token with expiration

**Key Components**:
- `AuthService.refreshToken()`
- `JWTService.refreshToken()`
- Database: `jwt_revocations` table

### User Logout

**Purpose**: Terminate user sessions and invalidate tokens.

**Process Steps**:
1. **Session Validation**: Verify session exists and is active
2. **Token Revocation**: Add JWT token to revocation list
3. **Session Termination**: Mark session as ended in database
4. **Audit Logging**: Record logout event
5. **Response**: Return success confirmation

**Key Components**:
- `AuthService.logout()`
- `JWTService.revokeToken()`
- Database: `sessions`, `jwt_revocations` tables

### JWT Token Verification

**Purpose**: Validate JWT tokens for protected endpoints.

**Process Steps**:
1. **Token Extraction**: Extract Bearer token from Authorization header
2. **Signature Verification**: Validate JWT signature using proper key
3. **Claims Validation**: Verify token claims (expiration, issuer, audience)
4. **Revocation Check**: Ensure token hasn't been revoked
5. **User Validation**: Fetch and validate user information
6. **Session Population**: Set user and session data in request object
7. **Proceed**: Allow request to continue to protected resource

**Key Components**:
- `JWTService.verifyToken()`
- `AuthService.getUser()`
- Authentication middleware
- Database: `users`, `sessions`, `jwt_revocations` tables

---

## Policy Management Workflows

### Policy Issuance

**Purpose**: Generate cryptographically signed policies for devices.

**Process Steps**:
1. **Device Validation**: Verify device exists and is active
2. **Team Lookup**: Retrieve team information and settings
3. **Policy Creation**: Build policy payload with device and team data
4. **Cryptographic Signing**: Sign policy using Ed25519 private key
5. **Database Recording**: Store policy issuance record
6. **Device Update**: Update device last seen timestamp
7. **Response**: Return signed JWS policy to device

**Key Components**:
- `PolicyService.issuePolicy()`
- `PolicySigner.createJWS()`
- Database: `devices`, `teams`, `policy_issues` tables

**Security Features**:
- Ed25519 digital signatures for tamper protection
- Policy versioning and expiration
- Comprehensive audit trail of policy issuance

### Policy Validation

**Purpose**: Verify policy authenticity and integrity on devices.

**Process Steps**:
1. **JWS Parsing**: Extract signature and payload from JWS
2. **Signature Verification**: Verify Ed25519 signature
3. **Claims Validation**: Validate policy structure and required fields
4. **Expiration Check**: Ensure policy hasn't expired
5. **Clock Skew Protection**: Validate timestamp with allowed skew
6. **Accept Policy**: Device accepts valid policy for enforcement

**Key Components**:
- `PolicyVerifier.verifyJWS()`
- Ed25519 public key verification
- Time validation utilities

### Policy Signing

**Purpose**: Create secure digital signatures for policy documents.

**Process Steps**:
1. **Key Generation**: Generate Ed25519 key pair (private/public)
2. **Policy Serialization**: Convert policy object to JSON string
3. **Message Digestion**: Create digest of policy content
4. **Signature Creation**: Sign digest using Ed25519 private key
5. **JWS Construction**: Build JWS with header, payload, and signature
6. **Key Management**: Store and manage signing keys securely

**Key Components**:
- `PolicySigner.sign()`
- Ed25519 cryptographic operations
- JWS (JSON Web Signature) standard

---

## Telemetry Workflows

### Telemetry Ingestion

**Purpose**: Receive and process telemetry data from devices.

**Process Steps**:
1. **Request Validation**: Validate request structure and required fields
2. **Device Verification**: Verify device exists in database
3. **Batch Processing**: Process telemetry events in batches
4. **Event Validation**: Validate individual event structure and types
5. **Storage**: Store valid events in database with timestamps
6. **Audit Logging**: Record telemetry ingestion statistics
7. **Response**: Return processing results to device

**Key Components**:
- `TelemetryService.processBatch()`
- Database: `devices`, `telemetry_events` tables
- Event type validation and processing

### Telemetry Validation

**Purpose**: Ensure telemetry data meets required standards.

**Process Steps**:
1. **Schema Validation**: Validate event structure against expected schema
2. **Type Validation**: Ensure event type is allowed and recognized
3. **Data Validation**: Validate specific fields based on event type
4. **Timestamp Validation**: Ensure timestamps are in valid format and range
5. **Size Limits**: Enforce maximum batch sizes and event limits
6. **Filtering**: Filter out invalid or malformed events

**Key Components**:
- Event schema validation
- Type-specific validation rules
- Size and rate limit enforcement

### Telemetry Storage

**Purpose**: Persist telemetry data with proper indexing and relationships.

**Process Steps**:
1. **Event Parsing**: Parse validated telemetry events
2. **Database Insertion**: Insert events into telemetry_events table
3. **Session Linking**: Associate events with active sessions when possible
4. **Device Association**: Link events to originating devices
5. **Timestamp Indexing**: Store with proper timestamp indexing for queries
6. **Data Integrity**: Ensure referential integrity with devices and sessions

**Key Components**:
- Database: `telemetry_events` table
- Foreign key relationships with `devices`, `sessions`
- Timestamp and event type indexing

---

## Session Management Workflows

### Session Creation

**Purpose**: Establish active user sessions after successful authentication.

**Process Steps**:
1. **Session ID Generation**: Generate unique session identifier
2. **Expiration Calculation**: Calculate session expiration time
3. **Database Record Creation**: Insert session record with all required fields
4. **Token Association**: Link JWT tokens with session for validation
5. **Audit Logging**: Record session creation event
6. **Response**: Return session information to client

**Key Components**:
- `AuthService.createSession()`
- Database: `sessions` table
- JWT token generation with session claims

### Session Validation

**Purpose**: Validate active sessions during request processing.

**Process Steps**:
1. **Token Extraction**: Extract session claims from JWT token
2. **Session Lookup**: Find session in database using session ID
3. **Status Check**: Verify session is active and not expired
4. **User Validation**: Ensure session belongs to authenticated user
5. **Team Validation**: Validate team-based access controls
6. **Permission Check**: Verify user has required permissions
7. **Session Update**: Update last activity timestamp

**Key Components**:
- Authentication middleware
- Database: `sessions` table
- Permission and access control validation

### Session Termination

**Purpose**: Clean up and terminate sessions when users log out or expire.

**Process Steps**:
1. **Session Lookup**: Find active session by ID
2. **Status Update**: Mark session as ended or expired
3. **Token Revocation**: Add associated JWT tokens to revocation list
4. **Audit Logging**: Record session termination event
5. **Cleanup**: Remove session data from active memory
6. **Response**: Confirm session termination

**Key Components**:
- `AuthService.endSession()`
- Database: `sessions`, `jwt_revocations` tables
- Automatic session cleanup processes

---

## Security Workflows

### PIN Verification

**Purpose**: Securely verify user PINs for authentication.

**Process Steps**:
1. **User Lookup**: Find user and retrieve PIN hash
2. **Input Sanitization**: Sanitize and validate PIN input
3. **Hash Generation**: Generate hash of input PIN with stored salt
4. **Comparison**: Securely compare hashes using timing-safe comparison
5. **Attempt Tracking**: Record successful/failed attempts
6. **Lockout Protection**: Enforce retry limits and cooldown periods
7. **Result**: Return verification result with appropriate security measures

**Key Components**:
- `AuthService.verifyPin()`
- Argon2id password hashing
- Rate limiting and lockout mechanisms
- Database: `user_pins`, `pin_attempts` tables

**Security Features**:
- Timing-safe comparison to prevent timing attacks
- Rate limiting with exponential backoff
- Comprehensive attempt logging
- Secure salt storage and management

### Rate Limiting

**Purpose**: Protect endpoints from abuse and ensure fair usage.

**Process Steps**:
1. **Request Identification**: Identify request by device ID and IP address
2. **Rate Check**: Query recent request counts for identifier
3. **Limit Evaluation**: Compare against configured limits
4. **Cooldown Application**: Apply cooldown period if limits exceeded
5. **Response**: Allow request or return rate limit error
6. **Cleanup**: Clean up expired rate limit records
7. **Logging**: Record rate limit violations for monitoring

**Key Components**:
- `RateLimiter.checkLoginLimit()`
- Database: Rate limit tracking (in-memory or database)
- Configurable rate limit rules

### Token Revocation

**Purpose**: Immediately invalidate JWT tokens for security.

**Process Steps**:
1. **Token Identification**: Extract JWT ID (JTI) from token
2. **Revocation Check**: Query revocation database for token ID
3. **Revocation Addition**: Add token ID to revocation list
4. **Expiration Management**: Set expiration time for revocation entry
5. **Audit Logging**: Record revocation reason and metadata
6. **Cleanup**: Remove expired revocation entries periodically

**Key Components**:
- `JWTService.revokeToken()`
- Database: `jwt_revocations` table
- Token revocation lookup during verification

---

## Database Workflows

### Database Migrations

**Purpose**: Manage database schema changes and ensure consistency.

**Process Steps**:
1. **Migration Generation**: Create migration files from schema changes
2. **Version Tracking**: Track applied migrations in database
3. **Migration Execution**: Apply pending migrations in order
4. **Validation**: Verify migration success and data integrity
5. **Rollback Support**: Maintain ability to rollback if needed
6. **Documentation**: Document all schema changes

**Key Components**:
- Drizzle ORM migrations
- Database: `migrations` tracking table
- Schema definition files

### Entity Relationships

**Purpose**: Maintain proper data relationships and integrity.

**Process Steps**:
1. **Schema Definition**: Define tables with proper foreign key relationships
2. **Referential Integrity**: Enforce relationships at database level
3. **Cascade Operations**: Define cascade delete/update behavior
4. **Indexing Strategy**: Create optimal indexes for query performance
5. **Validation Rules**: Implement data validation at database level

**Key Relationships**:
- `teams` → `users` (one-to-many)
- `teams` → `devices` (one-to-many)
- `users` → `sessions` (one-to-many)
- `devices` → `sessions` (one-to-many)
- `users` → `user_pins` (one-to-one)
- `devices` → `telemetry_events` (one-to-many)
- `devices` → `policy_issues` (one-to-many)

### Data Consistency

**Purpose**: Ensure data remains consistent across all operations.

**Process Steps**:
1. **Transaction Management**: Use transactions for multi-table operations
2. **Constraint Enforcement**: Database constraints prevent invalid data
3. **Validation Checks**: Application-level validation before database writes
4. **Audit Trails**: Maintain logs of all data changes
5. **Consistency Checks**: Periodic validation of data integrity
6. **Error Handling**: Graceful handling of consistency violations

**Key Components**:
- Database transactions
- Foreign key constraints
- Application-level validation
- Comprehensive error handling

---

## Security Architecture

### Authentication Layers

1. **Device Authentication**: Device ID and active status validation
2. **User Authentication**: PIN-based user verification
3. **Session Authentication**: JWT token-based session management
4. **Permission Authorization**: Role and team-based access control

### Cryptographic Security

1. **PIN Hashing**: Argon2id with per-user salts
2. **Digital Signatures**: Ed25519 for policy signing
3. **JWT Tokens**: Secure token generation with proper claims
4. **Random Generation**: Cryptographically secure random values

### Data Protection

1. **Input Validation**: Comprehensive input sanitization
2. **SQL Injection Prevention**: Parameterized queries throughout
3. **Rate Limiting**: Protection against brute force attacks
4. **Audit Logging**: Comprehensive security event tracking

---

## Performance Considerations

### Database Optimization

1. **Proper Indexing**: Optimized indexes for common query patterns
2. **Connection Pooling**: Efficient database connection management
3. **Query Optimization**: Optimized queries with proper filtering
4. **Batch Operations**: Efficient batch processing for telemetry

### Caching Strategy

1. **Policy Caching**: Short-term caching of policy documents
2. **Session Caching**: In-memory session data for performance
3. **Rate Limit Caching**: Efficient rate limit tracking
4. **Database Query Caching**: Cache frequently accessed data

### Monitoring and Observability

1. **Structured Logging**: Comprehensive logging with correlation IDs
2. **Performance Metrics**: Database query timing and endpoint performance
3. **Error Tracking**: Detailed error reporting and alerting
4. **Health Checks**: System health monitoring endpoints

---

## API Endpoints Summary

### Authentication Endpoints
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/whoami` - Current user information

### Policy Endpoints
- `GET /api/v1/policy/:deviceId` - Device policy retrieval

### Telemetry Endpoints
- `POST /api/v1/telemetry` - Telemetry data submission

### Supervisor Endpoints
- `POST /api/v1/supervisor/override/login` - Supervisor override
- `POST /api/v1/supervisor/override/revoke` - Override revocation

---

## Error Handling

### Standard Error Response Format
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "request_id": "correlation-id"
  }
}
```

### Common Error Codes
- `MISSING_FIELDS` - Required input fields missing
- `INVALID_CREDENTIALS` - Invalid username or PIN
- `DEVICE_NOT_FOUND` - Device ID not found or inactive
- `USER_NOT_FOUND` - User not found or inactive
- `RATE_LIMITED` - Too many requests, please try later
- `INVALID_TOKEN` - Invalid or expired JWT token
- `SESSION_EXPIRED` - Session has expired
- `POLICY_ERROR` - Policy generation or validation failed

---

## Development Guidelines

### Code Organization
- **Services**: Business logic implementation
- **Middleware**: Request processing and validation
- **Routes**: API endpoint definitions
- **Database**: Schema and migration management
- **Utils**: Helper functions and utilities

### Security Best Practices
- Always use parameterized queries
- Validate all input data
- Implement proper error handling
- Use secure cryptographic functions
- Log security-relevant events
- Follow principle of least privilege

### Testing Strategy
- Unit tests for core business logic
- Integration tests for API endpoints
- Security testing for authentication flows
- Performance testing for scalability
- Database migration testing

---

## Monitoring and Maintenance

### Health Monitoring
- Database connection health
- API endpoint responsiveness
- Authentication system status
- Telemetry processing rates

### Log Analysis
- Error rate monitoring
- Performance bottleneck identification
- Security event tracking
- User activity patterns

### Maintenance Tasks
- Regular database backups
- JWT key rotation procedures
- Security audit reviews
- Performance optimization reviews