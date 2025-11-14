# SurveyLauncher API Documentation

## Overview

The SurveyLauncher backend provides a comprehensive REST API for authentication, team management, user management, device management, supervisor PIN management, policy management, and telemetry. The API follows a consistent JSON format with proper error handling and response structures.

## Base URL

```
http://localhost:3000/api/v1
```

## Development

### Start the Server
```bash
npm run dev
```

The server runs with full PostgreSQL database implementation and all authentication/policy features enabled. For development setup instructions, see the database setup section below.

## Authentication

Most endpoints require JWT token authentication via the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Role-Based Access Control

The API implements enterprise-grade role-based access control (RBAC) with nine specialized roles organized into three categories:

### Field Operations Roles
- **TEAM_MEMBER**: Frontline survey operators with access to own team resources
- **FIELD_SUPERVISOR**: On-site supervisors managing field operations and team devices
- **REGIONAL_MANAGER**: Multi-team regional oversight with cross-team access within region

### Technical Operations Roles
- **SYSTEM_ADMIN**: Full system configuration and administrative access
- **SUPPORT_AGENT**: User support and troubleshooting capabilities
- **AUDITOR**: Read-only audit access and compliance monitoring

### Specialized Roles
- **DEVICE_MANAGER**: Android device lifecycle management
- **POLICY_ADMIN**: Policy creation and management
- **NATIONAL_SUPPORT_ADMIN**: Cross-team operational access (no system settings)

### Role Management Endpoints

The API provides comprehensive role management endpoints for administrating the RBAC system:

#### POST /api/v1/roles
Create a new role. Requires SYSTEM_ADMIN or NATIONAL_SUPPORT_ADMIN role.

#### GET /api/v1/roles
List roles with pagination and search. Requires SYSTEM_ADMIN, NATIONAL_SUPPORT_ADMIN, or REGIONAL_MANAGER role.

#### PUT /api/v1/roles/:id
Update an existing role. Requires SYSTEM_ADMIN or NATIONAL_SUPPORT_ADMIN role.

#### DELETE /api/v1/roles/:id
Soft delete a role. Requires SYSTEM_ADMIN role only.

#### POST /api/v1/users/:userId/roles
Assign a role to a user. Requires SYSTEM_ADMIN, NATIONAL_SUPPORT_ADMIN, or REGIONAL_MANAGER role.

#### DELETE /api/v1/users/:userId/roles/:roleId
Remove a role from a user. Requires SYSTEM_ADMIN, NATIONAL_SUPPORT_ADMIN, or REGIONAL_MANAGER role.

#### GET /api/v1/users/:userId/permissions
Get a user's effective permissions including inherited permissions. Requires authentication.

## Response Format

### Success Response
```json
{
  "success": true,
  // ... response data
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "request_id": "unique-request-id"
  }
}
```

## Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/login

Authenticate a user with device credentials and obtain session tokens.

**Request Body:**
```json
{
  "deviceId": "string",
  "userCode": "string",
  "pin": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "session": {
    "sessionId": "string",
    "userId": "string",
    "deviceId": "string",
    "startedAt": "2025-01-01T00:00:00Z",
    "expiresAt": "2025-01-01T08:00:00Z",
    "overrideUntil": "2025-01-01T10:00:00Z"
  },
  "accessToken": "string",
  "refreshToken": "string",
  "policyVersion": 3
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields
- `401 UNAUTHORIZED` - Invalid credentials
- `429 TOO_MANY_REQUESTS` - Rate limited (includes `retryAfter` field)

#### POST /api/v1/auth/logout

End the current user session.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/v1/auth/refresh

Refresh an access token using a refresh token.

**Request Body:**
```json
{
  "refresh_token": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "accessToken": "string",
  "expiresAt": "2025-01-01T00:00:00Z"
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing refresh token
- `401 UNAUTHORIZED` - Invalid refresh token

#### GET /api/v1/auth/whoami

Get current user and session information.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "string",
    "code": "string",
    "teamId": "string",
    "displayName": "string",
    "email": "string",
    "role": "TEAM_MEMBER|SUPERVISOR|ADMIN",
    "isActive": true
  },
  "session": {
    "sessionId": "string",
    "deviceId": "string",
    "expiresAt": "2025-01-01T00:00:00Z",
    "overrideUntil": "2025-01-01T10:00:00Z"
  }
}
```

#### POST /api/v1/auth/session/end

Force end the current session.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Session ended successfully"
}
```

### Team Management Endpoints

#### POST /api/v1/teams

Create a new team.

**Authentication:** Required (ADMIN role)

**Request Body:**
```json
{
  "name": "string",
  "timezone": "string",
  "stateId": "string"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "team": {
    "id": "uuid",
    "name": "string",
    "timezone": "string",
    "stateId": "string",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields
- `401 UNAUTHORIZED` - Insufficient permissions
- `409 CONFLICT` - Team name already exists

#### GET /api/v1/teams

List teams with pagination and search.

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN)

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 50, max: 100) - Items per page
- `search` (string) - Search term for team names
- `isActive` (boolean) - Filter by active status

**Response (200 OK):**
```json
{
  "success": true,
  "teams": [
    {
      "id": "uuid",
      "name": "string",
      "timezone": "string",
      "stateId": "string",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

#### GET /api/v1/teams/:id

Get a specific team by ID.

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN with team access)

**URL Parameters:**
- `id` (string) - Team UUID

**Response (200 OK):**
```json
{
  "success": true,
  "team": {
    "id": "uuid",
    "name": "string",
    "timezone": "string",
    "stateId": "string",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404 NOT_FOUND` - Team not found
- `403 FORBIDDEN` - No access to this team

#### PUT /api/v1/teams/:id

Update team information.

**Authentication:** Required (ADMIN role or team supervisor)

**URL Parameters:**
- `id` (string) - Team UUID

**Request Body:**
```json
{
  "name": "string",
  "timezone": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "team": {
    "id": "uuid",
    "name": "string",
    "timezone": "string",
    "stateId": "string",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### DELETE /api/v1/teams/:id

Delete a team (soft delete).

**Authentication:** Required (ADMIN role)

**URL Parameters:**
- `id` (string) - Team UUID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Team deleted successfully"
}
```

**Error Responses:**
- `404 NOT_FOUND` - Team not found
- `401 UNAUTHORIZED` - Insufficient permissions
- `409 CONFLICT` - Cannot delete team with active dependencies

### User Management Endpoints

#### POST /api/v1/users

Create a new user with PIN.

**Authentication:** Required (ADMIN role or team supervisor)

**Request Body:**
```json
{
  "teamId": "string",
  "code": "string",
  "displayName": "string",
  "email": "string",
  "role": "TEAM_MEMBER|SUPERVISOR|ADMIN",
  "pin": "string"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "code": "string",
    "teamId": "string",
    "displayName": "string",
    "email": "string",
    "role": "TEAM_MEMBER",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields or weak PIN
- `401 UNAUTHORIZED` - Insufficient permissions
- `404 NOT_FOUND` - Team not found
- `409 CONFLICT` - User code already exists in team

#### GET /api/v1/users

List users with pagination and search.

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN)

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 50, max: 100) - Items per page
- `search` (string) - Search term for display names
- `teamId` (string) - Filter by team
- `role` (string) - Filter by role
- `isActive` (boolean) - Filter by active status

**Response (200 OK):**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "code": "string",
      "teamId": "string",
      "displayName": "string",
      "email": "string",
      "role": "TEAM_MEMBER",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

#### GET /api/v1/users/:id

Get a specific user by ID.

**Authentication:** Required (user themselves, team supervisor, or ADMIN)

**URL Parameters:**
- `id` (string) - User UUID

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "code": "string",
    "teamId": "string",
    "displayName": "string",
    "email": "string",
    "role": "TEAM_MEMBER",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - No access to this user

#### PUT /api/v1/users/:id

Update user information.

**Authentication:** Required (user themselves, team supervisor, or ADMIN)

**URL Parameters:**
- `id` (string) - User UUID

**Request Body:**
```json
{
  "displayName": "string",
  "email": "string",
  "role": "TEAM_MEMBER|SUPERVISOR|ADMIN",
  "pin": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "code": "string",
    "teamId": "string",
    "displayName": "string",
    "email": "string",
    "role": "TEAM_MEMBER",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404 NOT_FOUND` - User not found
- `403 FORBIDDEN` - No access to this user
- `400 BAD_REQUEST` - Invalid role or weak PIN

#### DELETE /api/v1/users/:id

Delete a user (soft delete).

**Authentication:** Required (ADMIN role)

**URL Parameters:**
- `id` (string) - User UUID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `404 NOT_FOUND` - User not found
- `401 UNAUTHORIZED` - Insufficient permissions

### Device Management Endpoints

#### POST /api/v1/devices

Register a new device.

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN)

**Request Body:**
```json
{
  "teamId": "string",
  "name": "string",
  "androidId": "string",
  "appVersion": "string"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "device": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "androidId": "string",
    "appVersion": "string",
    "isActive": true,
    "lastSeenAt": null,
    "lastGpsAt": null,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields
- `401 UNAUTHORIZED` - Insufficient permissions
- `404 NOT_FOUND` - Team not found
- `409 CONFLICT` - Android ID already exists

#### GET /api/v1/devices

List devices with pagination and search.

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN)

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 50, max: 100) - Items per page
- `search` (string) - Search term for device names
- `teamId` (string) - Filter by team
- `isActive` (boolean) - Filter by active status

**Response (200 OK):**
```json
{
  "success": true,
  "devices": [
    {
      "id": "uuid",
      "teamId": "string",
      "name": "string",
      "androidId": "string",
      "appVersion": "string",
      "isActive": true,
      "lastSeenAt": "2025-01-01T00:00:00Z",
      "lastGpsAt": "2025-01-01T00:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

#### GET /api/v1/devices/:id

Get a specific device by ID.

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN with team access)

**URL Parameters:**
- `id` (string) - Device UUID

**Response (200 OK):**
```json
{
  "success": true,
  "device": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "androidId": "string",
    "appVersion": "string",
    "isActive": true,
    "lastSeenAt": "2025-01-01T00:00:00Z",
    "lastGpsAt": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404 NOT_FOUND` - Device not found
- `403 FORBIDDEN` - No access to this device

#### PUT /api/v1/devices/:id

Update device information.

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN with team access)

**URL Parameters:**
- `id` (string) - Device UUID

**Request Body:**
```json
{
  "name": "string",
  "androidId": "string",
  "appVersion": "string",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "device": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "androidId": "string",
    "appVersion": "string",
    "isActive": true,
    "lastSeenAt": "2025-01-01T00:00:00Z",
    "lastGpsAt": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### DELETE /api/v1/devices/:id

Delete a device (soft delete).

**Authentication:** Required (TEAM_MEMBER, SUPERVISOR, ADMIN with team access)

**URL Parameters:**
- `id` (string) - Device UUID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

**Error Responses:**
- `404 NOT_FOUND` - Device not found
- `403 FORBIDDEN` - No access to this device

### Supervisor PIN Management Endpoints

#### POST /api/v1/supervisor/pins

Create a new supervisor PIN.

**Authentication:** Required (ADMIN role)

**Request Body:**
```json
{
  "teamId": "string",
  "name": "string",
  "pin": "string"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "supervisorPin": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "pinHash": "hashed-string",
    "salt": "salt-string",
    "isActive": true,
    "rotatedAt": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields or weak PIN
- `401 UNAUTHORIZED` - Insufficient permissions
- `404 NOT_FOUND` - Team not found
- `409 CONFLICT` - Team already has an active supervisor PIN

#### GET /api/v1/supervisor/pins

List supervisor PINs.

**Authentication:** Required (ADMIN, SUPERVISOR)

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 50, max: 100) - Items per page
- `teamId` (string) - Filter by team
- `isActive` (boolean) - Filter by active status

**Response (200 OK):**
```json
{
  "success": true,
  "supervisorPins": [
    {
      "id": "uuid",
      "teamId": "string",
      "name": "string",
      "isActive": true,
      "rotatedAt": "2025-01-01T00:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

#### GET /api/v1/supervisor/pins/:id

Get a specific supervisor PIN by ID.

**Authentication:** Required (ADMIN, SUPERVISOR)

**URL Parameters:**
- `id` (string) - Supervisor PIN UUID

**Response (200 OK):**
```json
{
  "success": true,
  "supervisorPin": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "isActive": true,
    "rotatedAt": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404 NOT_FOUND` - Supervisor PIN not found
- `401 UNAUTHORIZED` - Insufficient permissions

#### PUT /api/v1/supervisor/pins/:id

Update supervisor PIN.

**Authentication:** Required (ADMIN role)

**URL Parameters:**
- `id` (string) - Supervisor PIN UUID

**Request Body:**
```json
{
  "name": "string",
  "pin": "string",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "supervisorPin": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "isActive": true,
    "rotatedAt": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### DELETE /api/v1/supervisor/pins/:id

Delete (deactivate) supervisor PIN.

**Authentication:** Required (ADMIN role)

**URL Parameters:**
- `id` (string) - Supervisor PIN UUID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Supervisor PIN deactivated successfully"
}
```

#### POST /api/v1/supervisor/pins/:teamId/rotate

Rotate supervisor PIN for a team.

**Authentication:** Required (ADMIN role)

**URL Parameters:**
- `teamId` (string) - Team UUID

**Request Body:**
```json
{
  "newPin": "string",
  "name": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "supervisorPin": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "pinHash": "hashed-string",
    "salt": "salt-string",
    "isActive": true,
    "rotatedAt": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### GET /api/v1/supervisor/pins/:teamId/active

Get active supervisor PIN for a team.

**Authentication:** Required (ADMIN, SUPERVISOR)

**URL Parameters:**
- `teamId` (string) - Team UUID

**Response (200 OK):**
```json
{
  "success": true,
  "supervisorPin": {
    "id": "uuid",
    "teamId": "string",
    "name": "string",
    "isActive": true,
    "rotatedAt": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404 NOT_FOUND` - No active supervisor PIN found for team
- `401 UNAUTHORIZED` - Insufficient permissions

### Legacy Supervisor Override Endpoints

#### POST /api/v1/supervisor/override/login

Request supervisor override access for a device.

**Request Body:**
```json
{
  "supervisor_pin": "string",
  "deviceId": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "overrideUntil": "2025-01-01T10:00:00Z",
  "token": "string"
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields
- `401 UNAUTHORIZED` - Invalid supervisor PIN
- `429 TOO_MANY_REQUESTS` - Rate limited

### Policy Endpoints

#### GET /api/v1/policy/:deviceId

Retrieve the policy configuration for a specific device.

**URL Parameters:**
- `deviceId` (string) - The device identifier

**Response (200 OK):**
```json
{
  "jws": "eyJhbGciOiJFZERTQSJ9...",
  "payload": {
    "version": 3,
    "deviceId": "dev-mock-001",
    "teamId": "t_012",
    "tz": "Asia/Kolkata",
    "timeAnchor": {
      "serverNowUtc": "2025-11-12T10:00:00Z",
      "maxClockSkewSec": 180,
      "maxPolicyAgeSec": 86400
    },
    "session": {
      "allowedWindows": [
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
      "graceMinutes": 10,
      "supervisorOverrideMinutes": 120
    },
    "pin": {
      "mode": "server_verify",
      "minLength": 6,
      "retryLimit": 5,
      "cooldownSeconds": 300
    },
    "gps": {
      "activeFixIntervalMinutes": 3,
      "minDisplacementM": 50
    },
    "telemetry": {
      "heartbeatMinutes": 10,
      "batchMax": 50
    },
    "meta": {
      "issuedAt": "2025-11-12T10:00:00Z",
      "expiresAt": "2025-11-13T10:00:00Z"
    }
  }
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing device ID
- `404 NOT_FOUND` - Device not found

### Telemetry Endpoints

#### POST /api/v1/telemetry

Submit a batch of telemetry events from a device.

**Request Body:**
```json
{
  "events": [
    {
      "type": "heartbeat|gps|app_usage|screen_time",
      "timestamp": "2025-01-01T00:00:00Z",
      "eventData": {}
    }
  ],
  "deviceId": "string",
  "sessionId": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "accepted": 25,
  "dropped": 0
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Invalid batch format
- `404 NOT_FOUND` - Device not found

#### POST /api/v1/telemetry/batch

Submit a large batch of telemetry events from a device.

**Request Body:**
```json
{
  "events": [
    {
      "eventType": "string",
      "timestamp": "2025-01-01T00:00:00Z",
      "eventData": {},
      "deviceId": "string"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "accepted": 100,
  "dropped": 0
}
```

### Health Check Endpoints

#### GET /api/v1/health

Check API health status.

**Response (200 OK):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

#### GET /api/v1/health/db

Check database connectivity.

**Response (200 OK):**
```json
{
  "success": true,
  "database": "PostgreSQL",
  "status": "connected",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

#### GET /api/v1/health/auth

Check authentication system.

**Response (200 OK):**
```json
{
  "success": true,
  "auth": "operational",
  "jwtSecrets": "configured",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Error Codes

### Authentication Errors
- `UNAUTHORIZED` - Invalid or missing authentication
- `LOGIN_FAILED` - Invalid credentials
- `REFRESH_FAILED` - Refresh token invalid/expired
- `RATE_LIMITED` - Too many attempts (includes `retryAfter` in response)
- `DEVICE_NOT_FOUND` - Device ID not recognized
- `INSUFFICIENT_PERMISSIONS` - User lacks required role or permissions
- `TEAM_ACCESS_DENIED` - User cannot access resources from this team
- `OWNER_ACCESS_REQUIRED` - User can only access their own resources

### Validation Errors
- `MISSING_FIELDS` - Required request fields missing
- `INVALID_FORMAT` - Invalid data format
- `WEAK_PIN` - PIN too short (minimum 4 characters)
- `INVALID_ROLE` - Invalid user role specified
- `DUPLICATE_CODE` - User code already exists in team
- `DUPLICATE_ANDROID_ID` - Android ID already exists
- `ALREADY_EXISTS` - Resource already exists (team with active PIN, etc.)

### Resource Errors
- `NOT_FOUND` - Resource not found
- `NO_SESSION` - No active session found
- `SESSION_END_FAILED` - Failed to end session
- `DEVICE_NOT_FOUND` - Device ID not found in policy system
- `POLICY_ERROR` - General policy issuance failure
- `TELEMETRY_ERROR` - General telemetry processing failure
- `INTERNAL_ERROR` - Server-side error
- `AUTH_ERROR` - Authentication middleware error

### Database Errors
- `DATABASE_ERROR` - Database connection or query error
- `CONSTRAINT_VIOLATION` - Database constraint violation
- `MIGRATION_FAILED` - Database migration failed

## Rate Limiting

### Login Rate Limiting
- **5 attempts per 15 minutes** per IP address
- **Progressive backoff** for failed attempts
- **Account lockout** after limit reached

### PIN Rate Limiting
- **10 attempts per 10 minutes** per device
- **Cooldown period** after failed attempts
- **Supervisor PIN has stricter limits**

### Telemetry Rate Limiting
- **120 requests per minute** per device
- **Batch size limits** to prevent abuse
- **Automatic rejection** of malformed requests

## Database Schema

### Core Tables

#### Teams
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255)) - Team name
- `timezone` (VARCHAR(50)) - Team timezone
- `stateId` (VARCHAR(16)) - State identifier
- `isActive` (BOOLEAN) - Team active status
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### Users
- `id` (UUID, Primary Key)
- `code` (VARCHAR(32)) - User login code
- `teamId` (UUID, Foreign Key to teams.id)
- `displayName` (VARCHAR(255)) - Display name
- `email` (VARCHAR(255)) - Optional email
- `role` (ENUM: TEAM_MEMBER, SUPERVISOR, ADMIN) - User role
- `isActive` (BOOLEAN) - User active status
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### Devices
- `id` (UUID, Primary Key)
- `teamId` (UUID, Foreign Key to teams.id)
- `name` (VARCHAR(255)) - Device name
- `androidId` (VARCHAR(64)) - Android device ID
- `appVersion` (VARCHAR(32)) - App version
- `isActive` (BOOLEAN) - Device active status
- `lastSeenAt` (TIMESTAMP) - Last device activity
- `lastGpsAt` (TIMESTAMP) - Last GPS data
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (Timestamp) - Last update timestamp

#### User PINs
- `userId` (UUID, Primary Key, Foreign Key to users.id)
- `pinHash` (VARCHAR(255)) - Hashed PIN (Argon2id)
- `salt` (VARCHAR(255)) - PIN salt
- `isActive` (BOOLEAN) - PIN active status
- `rotatedAt` (TIMESTAMP) - Last PIN rotation
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### Supervisor PINs
- `id` (UUID, Primary Key)
- `teamId` (UUID, Foreign Key to teams.id)
- `name` (VARCHAR(255)) - PIN descriptive name
- `pinHash` (VARCHAR(255)) - Hashed PIN (Argon2id)
- `salt` (VARCHAR(255)) - PIN salt
- `isActive` (BOOLEAN) - PIN active status
- `rotatedAt` (TIMESTAMP) - Last PIN rotation
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### Sessions
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to users.id)
- `teamId` (UUID, Foreign Key to teams.id)
- `deviceId` (UUID, Foreign Key to devices.id)
- `startedAt` (TIMESTAMP) - Session start
- `expiresAt` (TIMESTAMP) - Session expiration
- `endedAt` (TIMESTAMP) - Session end
- `status` (VARCHAR(16)) - Session status
- `overrideUntil` (TIMESTAMP) - Supervisor override until
- `tokenJti` (VARCHAR(64)) - JWT token JTI
- `lastActivityAt` (TIMESTAMP) - Last activity

#### Telemetry Events
- `id` (UUID, Primary Key)
- `deviceId` (UUID, Foreign Key to devices.id)
- `sessionId` (UUID, Foreign Key to sessions.id)
- `eventType` (VARCHAR(32)) - Event type
- `eventData` (JSONB) - Event payload
- `timestamp` (TIMESTAMP) - Event timestamp
- `receivedAt` (TIMESTAMP) - Processing time

#### Policy Issues
- `id` (UUID, Primary Key)
- `deviceId` (UUID, Foreign Key to devices.id)
- `version` (VARCHAR(16)) - Policy version
- `issuedAt` (TIMESTAMP) - Issuance timestamp
- `expiresAt` (TIMESTAMP) - Expiration timestamp
- `jwsKid` (VARCHAR(64)) - JWS key identifier
- `policyData` (JSONB) - Policy data

#### JWT Revocations
- `jti` (VARCHAR(64), Primary Key) - JWT token JTI
- `revokedAt` (TIMESTAMP) - Revocation timestamp
- `expiresAt` (TIMESTAMP) - Token expiration
- `reason` (VARCHAR(64)) - Revocation reason
- `revokedBy` (VARCHAR(255)) - Who revoked the token

#### PIN Attempts
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to users.id)
- `deviceId` (UUID, Foreign Key to devices.id)
- `attemptType` (VARCHAR(16)) - Attempt type
- `success` (BOOLEAN) - Attempt success
- `ipAddress` (VARCHAR(45)) - IP address
- `attemptedAt` (TIMESTAMP) - Attempt timestamp

## Development Notes

### Database Setup

For first-time setup:
```bash
# Install dependencies
npm install

# Generate cryptographic keys
npm run keys:generate

# Setup PostgreSQL database (standard mode)
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Testing

Run integration tests to verify API contract:
```bash
npm test
```

The test suite covers:
- Authentication flows
- CRUD operations for all resources
- Policy retrieval
- Telemetry batching
- Error scenarios
- Rate limiting behavior
- Role-based access control

### Environment Variables

Key environment variables:

**Database:**
- `DATABASE_URL` - PostgreSQL connection string

**JWT Configuration:**
- `JWT_ACCESS_SECRET` - Access token secret (32+ chars)
- `JWT_REFRESH_SECRET` - Refresh token secret (32+ chars)

**Rate Limiting:**
- `LOGIN_RATE_LIMIT_MAX` - Login attempts per period
- `PIN_RATE_LIMIT_MAX` - PIN attempts per period

**CORS:**
- `CORS_ALLOWED_ORIGINS` - Allowed frontend origins

### PostgreSQL Setup

The server now uses PostgreSQL with connection pooling:
- **Connection Pool Size:** 20 connections max
- **Idle Timeout:** 30 seconds
- **Connection Timeout:** 2 seconds
- **SSL Support:** Automatic for production environment

## Quick Start Guide

### 1. Start the Server
```bash
# Recommended for development
npm run dev:mock

# Or for full PostgreSQL mode
npm run dev
```

### 2. Test the API

**Test Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","userCode":"test001","pin":"123456"}'
```

**Test Teams:**
```bash
# Create a team
curl -X POST http://localhost:3000/api/v1/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{"name":"Test Team","timezone":"UTC","stateId":"US-CA"}'
```

**Test Users:**
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{"teamId":"team-uuid","code":"USER001","displayName":"Test User","pin":"123456","role":"TEAM_MEMBER"}'
```

**Test Devices:**
```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{"teamId":"team-uuid","name":"Test Device","androidId":"test123","appVersion":"1.0.0"}'
```

**Test Supervisor PINs:**
```bash
curl -X POST http://localhost:3000/api/v1/supervisor/pins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token" \
  -d '{"teamId":"team-uuid","name":"Main PIN","pin":"789012"}'
```

### 3. Expected Responses

**Login Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "session-uuid",
    "userId": "user-uuid",
    "deviceId": "device-uuid",
    "startedAt": "2025-01-01T00:00:00Z",
    "expiresAt": "2025-01-01T08:00:00Z",
    "overrideUntil": null
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "policyVersion": 3
}
```

**Whoami Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "code": "USER001",
    "teamId": "team-uuid",
    "displayName": "Test User",
    "email": "user@example.com",
    "role": "TEAM_MEMBER",
    "isActive": true
  },
  "session": {
    "sessionId": "session-uuid",
    "deviceId": "device-uuid",
    "expiresAt": "2025-01-01T08:00:00Z",
    "overrideUntil": null
  }
}
```

### Additional Features

The API supports:
- **Comprehensive Role-Based Access Control** - Fine-grained permissions
- **PostgreSQL with Connection Pooling** - Production-ready database
- **Full CRUD Operations** - Complete user/device/team management
- **Supervisor PIN Rotation** - Secure PIN management
- **Telemetry Batching** - Efficient data collection
- **Rate Limiting** - Protection against abuse
- **Comprehensive Error Handling** - Consistent error responses
- **Request Tracking** - Request IDs for debugging
- **Health Checks** - System status monitoring

## Production Considerations

- Use HTTPS in production
- Configure proper database connection pooling
- Implement proper logging and monitoring
- Set up backup strategies
- Configure rate limiting based on your needs
- Use proper secret management
- Enable database connection encryption
- Consider database read replicas for scaling
- Implement proper audit logging for compliance