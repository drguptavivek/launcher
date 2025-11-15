# SurveyLauncher Backend - Workflows Documentation

Last updated: November 15, 2025

This document describes all the core workflows and processes implemented in the SurveyLauncher backend system.

## Table of Contents

1. [Authentication Workflows](#authentication-workflows)
   - [Mobile App User Login](#mobile-app-user-login)
   - [Web Admin Authentication](#web-admin-authentication)
   - [Role-Based Access Control](#role-based-access-control)
   - [Token Refresh](#token-refresh)
   - [User Logout](#user-logout)
   - [JWT Token Verification](#jwt-token-verification)

2. [Project Management Workflows](#project-management-workflows)
   - [Project Creation](#project-creation)
   - [Project Access Control](#project-access-control)
   - [User Assignment to Projects](#user-assignment-to-projects)
   - [Team Assignment to Projects](#team-assignment-to-projects)
   - [Geographic Scope Enforcement](#geographic-scope-enforcement)
   - [Project Boundary Management](#project-boundary-management)
   - [Project Role-Based Access](#project-role-based-access)

3. [Policy Management Workflows](#policy-management-workflows)
   - [Policy Issuance](#policy-issuance)
   - [Policy Validation](#policy-validation)
   - [Policy Signing](#policy-signing)

4. [Telemetry Workflows](#telemetry-workflows)
   - [Telemetry Ingestion](#telemetry-ingestion)
   - [Telemetry Validation](#telemetry-validation)
   - [Telemetry Storage](#telemetry-storage)

5. [Session Management Workflows](#session-management-workflows)
   - [Session Creation](#session-creation)
   - [Session Validation](#session-validation)
   - [Session Termination](#session-termination)

6. [Security Workflows](#security-workflows)
   - [PIN Verification](#pin-verification)
   - [Rate Limiting](#rate-limiting)
   - [Token Revocation](#token-revocation)

7. [Database Workflows](#database-workflows)
   - [Database Migrations](#database-migrations)
   - [Entity Relationships](#entity-relationships)
   - [Data Consistency](#data-consistency)

---

## Authentication Workflows

### Mobile App User Login

**Purpose**: Authenticate mobile app users with device credentials and establish active sessions.

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

### Web Admin Authentication

**Purpose**: Authenticate web admin users using email/password with role-based access control.

**Process Steps**:
1. **Input Validation**: Validate required fields (email, password)
2. **User Lookup**: Find web admin user by email in web_admin_users table
3. **Account Status Check**: Verify account is active and not locked
4. **Password Verification**: Verify password using Argon2id hash comparison
5. **Role Validation**: Ensure user role is not TEAM_MEMBER (blocked from web access)
6. **Failed Attempt Tracking**: Increment login attempts and handle lockout after 5 failures
7. **Session Creation**: Create web admin session with appropriate tokens
8. **Cookie Management**: Set HTTP-only cookies for access_token, refresh_token, auth_type
9. **Audit Logging**: Record successful/failed web admin login attempts
10. **Response**: Return user information and authentication success

**Key Components**:
- `WebAdminAuthService.login()`
- `webAdminUsers` database table
- Cookie-based authentication
- Account lockout mechanisms
- Role validation logic

**Security Features**:
- Argon2id password hashing with per-user salts
- Account lockout after 5 failed attempts
- HTTP-only secure cookies
- Role-based access enforcement (TEAM_MEMBER blocked)
- Login attempt tracking and cooldown periods

**Valid Web Admin Roles**:
- SYSTEM_ADMIN, SUPPORT_AGENT, AUDITOR, DEVICE_MANAGER, POLICY_ADMIN, NATIONAL_SUPPORT_ADMIN, FIELD_SUPERVISOR, REGIONAL_MANAGER

### Role-Based Access Control

**Purpose**: Enforce role-based access control across both mobile app and web admin interfaces.

**Access Categories**:

#### 🟢 Hybrid Access Roles (App + Web)
- **TEAM_MEMBER**: Android app only access for field operations
- **FIELD_SUPERVISOR**: Both interfaces for field management and oversight
- **REGIONAL_MANAGER**: Both interfaces for regional management and field visits

#### 🔵 Web-Only Access Roles
- **SYSTEM_ADMIN**: Full web admin system configuration and management
- **SUPPORT_AGENT**: Web admin help desk and user support functions
- **AUDITOR**: Web admin compliance and audit access (read-only)
- **DEVICE_MANAGER**: Web admin device inventory and configuration
- **POLICY_ADMIN**: Web admin policy creation and distribution management
- **NATIONAL_SUPPORT_ADMIN**: Web admin cross-regional oversight and reporting

**Process Steps**:
1. **Authentication Type Detection**: Identify mobile app vs web admin authentication
2. **Role Extraction**: Extract user role from authentication token
3. **Access Validation**: Validate role against interface access rules
4. **Permission Evaluation**: Check resource-specific permissions for role
5. **Boundary Enforcement**: Apply geographic and team-based boundaries
6. **Access Decision**: Grant or deny access with detailed logging
7. **Audit Trail**: Record all access control decisions

**Key Components**:
- `WebAdminAuthService` role validation
- VALID_WEB_ADMIN_ROLES constant
- Interface-specific access rules
- Permission matrix enforcement
- Comprehensive audit logging

**Security Features**:
- **TEAM_MEMBER Role Blocking**: Automatic rejection from web admin interface
- **Least Privilege Principle**: Users get minimum required access
- **Multi-Layer Validation**: Role + permission + boundary checking
- **Real-time Enforcement**: Immediate access control updates

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

## Project Management Workflows

### Project Creation

**Purpose**: Create new projects with proper scoping and boundary definitions.

**Process Steps**:
1. **Input Validation**: Validate project data (title, abbreviation, geographic scope)
2. **Permission Check**: Verify user has PROJECTS.CREATE permission for their role and region
3. **Geographic Scope Validation**:
   - For NATIONAL scope: Allow SYSTEM_ADMIN and NATIONAL_SUPPORT_ADMIN
   - For REGIONAL scope: Require REGIONAL_MANAGER or above with team/region validation
4. **Abbreviation Uniqueness**: Ensure project abbreviation is unique across organization
5. **Project Record Creation**: Insert project with metadata and creator tracking
6. **Audit Logging**: Record project creation with user context and boundaries
7. **Response**: Return created project with scoping information

**Key Components**:
- `ProjectService.createProject()`
- `AuthorizationService.checkProjectsAccess()`
- Database: `projects`, `users`, `teams` tables
- Geographic scope enforcement based on user role and team assignment

**Boundary Enforcement**:
- **TEAM_MEMBER**: Can create only local projects within their team
- **FIELD_SUPERVISOR**: Can create projects within their supervised teams
- **REGIONAL_MANAGER**: Can create projects within their geographic region
- **SYSTEM_ADMIN/NATIONAL_SUPPORT_ADMIN**: Can create projects at any scope

### Project Access Control

**Purpose**: Enforce project boundaries and access controls at multiple levels.

**Access Control Layers**:
1. **Role-Based Permissions**: Base permissions from RBAC matrix
2. **Direct Assignment**: Explicit user-to-project assignments
3. **Team-Based Access**: Team-to-project assignments with scope levels
4. **Geographic Boundaries**: Regional restrictions based on project scope
5. **Organization Scope**: Cross-team access for privileged roles

**Process Steps**:
1. **Authentication**: Verify user identity and active session
2. **Permission Evaluation**: Check user's role permissions for PROJECTS resource
3. **Direct Assignment Check**: Verify if user has direct project assignment
4. **Team Assignment Check**: Check if user's team has project access
5. **Geographic Validation**: Validate regional access based on project scope
6. **Cross-Team Access**: Evaluate NATIONAL_SUPPORT_ADMIN and SYSTEM_ADMIN cross-team access
7. **Access Decision**: Grant or deny access with detailed reason logging

**Key Components**:
- `ProjectPermissionService.checkProjectPermission()`
- `AuthorizationService.checkProjectsAccess()`
- Database: `project_assignments`, `project_team_assignments`, `users`, `teams`, `projects` tables

### User Assignment to Projects

**Purpose**: Assign users to projects with proper boundary validation and role scoping.

**Process Steps**:
1. **Project Validation**: Verify project exists and user has assignment permissions
2. **User Validation**: Check user exists, is active, and belongs to valid team
3. **Permission Check**: Validate assigner has PROJECTS.ASSIGN permission
4. **Boundary Validation**:
   - For REGIONAL projects: User must be in same region or have cross-region role
   - For NATIONAL projects: Check cross-team access permissions
   - For user's own projects: Allow self-assignment within role boundaries
5. **Assignment Creation**: Create project assignment with role and scope metadata
6. **Conflict Resolution**: Handle existing assignments and role conflicts
7. **Audit Logging**: Record assignment details with boundary context
8. **Notification**: Optional notifications to assigned users and team leads

**Key Components**:
- `ProjectService.assignUserToProject()`
- `ProjectPermissionService.canAssignToProject()`
- Database: `project_assignments`, `projects`, `users`, `teams` tables

**Assignment Scopes**:
- **READ**: View project details and participate in project activities
- **EXECUTE**: Execute project tasks and manage project operations
- **UPDATE**: Modify project properties and configurations
- **DELETE**: Remove or archive projects (administrative)

### Team Assignment to Projects

**Purpose**: Assign entire teams to projects with role-based scope definitions.

**Process Steps**:
1. **Project Validation**: Verify project exists and assignment permissions
2. **Team Validation**: Check team exists, is active, and within geographic boundaries
3. **Geographic Compatibility**: Validate team location vs project geographic scope
4. **Permission Check**: Confirm assigner has PROJECTS.ASSIGN permission
5. **Scope Definition**: Define team's access scope within the project
6. **Assignment Creation**: Create team-project assignment with role metadata
7. **Member Impact**: Automatically extend access to all active team members
8. **Audit Logging**: Record team assignment with boundary context
9. **Conflict Management**: Handle overlapping assignments and role conflicts

**Key Components**:
- `ProjectService.assignTeamToProject()`
- `ProjectPermissionService.validateTeamProjectAssignment()`
- Database: `project_team_assignments`, `projects`, `teams`, `users` tables

**Team Assignment Scopes**:
- **READ**: Team members can view project information
- **PARTICIPATE**: Team can actively participate in project activities
- **MANAGE**: Team can manage project aspects within defined boundaries
- **ADMIN**: Full administrative access within project scope

### Geographic Scope Enforcement

**Purpose**: Enforce geographic boundaries for projects and assignments.

**Geographic Scopes**:
1. **LOCAL**: Project scoped to specific team location
2. **REGIONAL**: Project scoped to state/region level
3. **NATIONAL**: Project scoped across entire organization

**Enforcement Rules**:
1. **Project Creation**: Users can only create projects within their geographic authority
2. **User Assignment**: Assignments must respect geographic boundaries
3. **Team Assignment**: Teams must be within project's geographic scope
4. **Access Control**: Geographic boundaries enforced during access checks

**Process Steps**:
1. **Scope Detection**: Identify project geographic scope
2. **User Geography**: Determine user's geographic authority based on role and team
3. **Boundary Validation**: Check if user/team assignment respects geographic boundaries
4. **Cross-Region Access**: Evaluate privileged roles for cross-region access
5. **Access Decision**: Grant or deny based on geographic compatibility
6. **Audit Logging**: Record geographic boundary decisions

**Key Components**:
- `ProjectPermissionService.validateGeographicScope()`
- Geographic scope matrix based on user roles and team locations
- Database: `projects`, `teams`, `users`, `regions` tables

### Project Boundary Management

**Purpose**: Maintain clear separation and isolation between projects.

**Boundary Types**:
1. **Data Boundaries**: Project-specific data isolation
2. **User Boundaries**: User access limited to assigned projects
3. **Team Boundaries**: Team access scoped to specific projects
4. **Geographic Boundaries**: Regional limitations based on project scope
5. **Temporal Boundaries**: Project lifecycle and duration management

**Management Process**:
1. **Boundary Definition**: Define project boundaries during creation
2. **Access Enforcement**: Apply boundary rules during access checks
3. **Change Management**: Handle boundary modifications with proper validation
4. **Conflict Resolution**: Resolve overlapping or conflicting boundaries
5. **Audit Trail**: Maintain comprehensive boundary change history

**Key Components**:
- `ProjectService.validateProjectBoundaries()`
- `ProjectPermissionService.enforceBoundaries()`
- Database: All project-related tables with foreign key constraints

### Project Role-Based Access

**Purpose**: Implement role-based access control specifically for project operations.

**Project Permission Matrix**:

| Role | Read | List | Create | Update | Delete | Assign | Execute | Audit |
|------|------|------|--------|--------|--------|--------|---------|-------|
| TEAM_MEMBER | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| FIELD_SUPERVISOR | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| REGIONAL_MANAGER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SYSTEM_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SUPPORT_AGENT | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| AUDITOR | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| DEVICE_MANAGER | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| POLICY_ADMIN | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| NATIONAL_SUPPORT_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Permission Evaluation Process**:
1. **Base Role Permission**: Check user's role permissions from matrix
2. **Direct Assignment**: Evaluate specific user-to-project assignments
3. **Team Membership**: Consider team-based project access
4. **Geographic Constraints**: Apply regional limitations
5. **Cross-Team Privileges**: Evaluate privileged cross-team access
6. **Final Decision**: Combine all factors for access determination

**Key Components**:
- `ProjectPermissionService.evaluateProjectPermissions()`
- `AuthorizationService.checkProjectsAccess()`
- RBAC matrix with PROJECTS resource integration
- Database: `project_assignments`, `project_team_assignments`, permissions cache

**Security Features**:
- **Principle of Least Privilege**: Users get minimum required access
- **Boundary Enforcement**: Multiple layers of access control
- **Audit Logging**: Complete access decision audit trail
- **Permission Caching**: Optimized permission resolution with TTL
- **Dynamic Updates**: Real-time permission updates on assignment changes

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

### Core System Relationships
- `teams` → `users` (one-to-many) - Mobile app users
- `teams` → `devices` (one-to-many)
- `users` → `sessions` (one-to-many)
- `devices` → `sessions` (one-to-many)
- `users` → `user_pins` (one-to-one)
- `devices` → `telemetry_events` (one-to-many)
- `devices` → `policy_issues` (one-to-many)

### Web Admin System Relationships
- `web_admin_users` → Sessions (via JWT tokens) - Web admin authentication
- `web_admin_users` roles → VALID_WEB_ADMIN_ROLES - Role validation
- `web_admin_users` loginAttempts → Account lockout - Security enforcement
- `web_admin_users` lastLoginAt → Audit trail - Activity tracking

### Project Management Relationships
- `projects` → `project_assignments` (one-to-many) - Direct user assignments
- `projects` → `project_team_assignments` (one-to-many) - Team assignments
- `users` → `project_assignments` (one-to-many) - User's project assignments
- `teams` → `project_team_assignments` (one-to-many) - Team's project assignments
- `projects` → `users` (many-to-many) through `project_assignments`
- `projects` → `teams` (many-to-many) through `project_team_assignments`

### Project Boundary Relationships
- `projects.created_by` → `users.id` (project creator tracking)
- `projects.region_id` → `teams.id` (regional scope association)
- `project_assignments.assigned_by` → `users.id` (assignment tracking)
- `project_team_assignments.assigned_by` → `users.id` (team assignment tracking)

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

### Mobile App Authentication Endpoints
- `POST /api/v1/auth/login` - Mobile app user authentication
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/whoami` - Current user information

### Web Admin Authentication Endpoints
- `POST /api/web-admin/auth/login` - Web admin authentication with email/password
- `GET /api/web-admin/auth/whoami` - Current web admin user information
- `POST /api/web-admin/auth/logout` - Web admin logout with cookie clearing
- `POST /api/web-admin/auth/refresh` - Web admin token refresh
- `POST /api/web-admin/auth/create-admin` - Create new web admin user with role validation

### Project Management Endpoints
- `POST /api/v1/projects` - Create new project with geographic scope
- `GET /api/v1/projects` - List projects with pagination and filtering
- `GET /api/v1/projects/:id` - Get project details with access control
- `PUT /api/v1/projects/:id` - Update project with permission validation
- `DELETE /api/v1/projects/:id` - Soft delete project with audit trail

### Project Assignment Endpoints
- `POST /api/v1/projects/:id/users` - Assign user to project
- `GET /api/v1/projects/:id/users` - Get project user assignments
- `DELETE /api/v1/projects/:id/users/:userId` - Remove user from project
- `POST /api/v1/projects/:id/teams` - Assign team to project
- `GET /api/v1/projects/:id/teams` - Get project team assignments
- `DELETE /api/v1/projects/:id/teams/:teamId` - Remove team from project

### Cross-Reference Endpoints
- `GET /api/v1/users/:userId/projects` - Get user's project assignments
- `GET /api/v1/teams/:teamId/projects` - Get team's project assignments

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