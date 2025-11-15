# SurveyLauncher API Documentation

## Overview

The SurveyLauncher backend provides a comprehensive REST API with unified endpoints:
1. **Unified API** (`/api/v1/*`) - All endpoints consolidated under a single prefix
   - Mobile device authentication and field operations (`/api/v1/auth/*`)
   - Web administrative and management functions (`/api/v1/web-admin/*`)
   - Projects, teams, users, devices, and more

The API follows a consistent JSON format with proper error handling and response structures, implementing enterprise-grade role-based access control (RBAC) with nine specialized roles.

## 🚀 Interactive API Documentation

### Swagger UI (Recommended)
- **URL**: http://localhost:3000/api-docs
- **Description**: Interactive API documentation with testing capabilities
- **Features**:
  - Try out endpoints directly from your browser
  - View request/response schemas
  - Authentication support (Bearer tokens and cookies)
  - Real-time API testing
  - Download OpenAPI specification

### OpenAPI Specification
- **JSON**: http://localhost:3000/api-docs.json
- **YAML**: [openapi.yaml](../openapi.yaml)
- **Usage**: Import into Postman, Insomnia, or other API clients

## Base URLs

```
Unified API:   http://localhost:3000/api/v1
Swagger UI:     http://localhost:3000/api-docs
```

### API Structure
- **Mobile Authentication**: `/api/v1/auth/*` - Device-based authentication for Android apps
- **Web Administration**: `/api/v1/web-admin/*` - Email/password authentication for web interface
- **Projects**: `/api/v1/projects/*` - Project management with role-based access
- **Teams**: `/api/v1/teams/*` - Team and organization management
- **Users**: `/api/v1/users/*` - User management and assignments
- **Devices**: `/api/v1/devices/*` - Device registration and management
- **Policy**: `/api/v1/policy/*` - Policy distribution for devices
- **Telemetry**: `/api/v1/telemetry/*` - Data collection from devices
- **Supervisor**: `/api/v1/supervisor/*` - Supervisor override functionality

## Development

### Start the Server
```bash
npm run dev
```

The server runs with full PostgreSQL database implementation and all authentication/policy features enabled. Interactive documentation is available at `/api-docs` once the server starts.

### Quick API Testing

1. **Navigate to Swagger UI**: Open http://localhost:3000/api-docs
2. **Test Authentication**: Use the `/api/v1/auth/login` endpoint
3. **Authorize**: Click "Authorize" button and add your JWT token
4. **Test Other Endpoints**: Use the authenticated session to explore other APIs

For development setup instructions, see the database setup section below.

## Authentication

Most endpoints require JWT token authentication via the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Role-Based Access Control

The API implements enterprise-grade role-based access control (RBAC) with nine specialized roles organized into two access categories:

### 🟢 App + Web Roles (Hybrid Access)
Users with these roles can access **both** the Android app and Web Admin interface.

| Role | Description | Primary Use Cases |
|------|-------------|-------------------|
| `TEAM_MEMBER` | Field users | Daily Android app usage, basic web reporting |
| `FIELD_SUPERVISOR` | Frontline supervisors | Android app management, web dashboard oversight |
| `REGIONAL_MANAGER` | Regional leadership | Multi-location oversight via web, app usage for field visits |

### 🔵 Web Admin Only Roles (Web-Only Access)
Users with these roles can **only** access the Web Admin interface, never the Android app.

| Role | Description | Primary Use Cases |
|------|-------------|-------------------|
| `SYSTEM_ADMIN` | Full system administrator | Complete system configuration, user management |
| `SUPPORT_AGENT` | Customer support | Help desk, user assistance, troubleshooting |
| `AUDITOR` | Compliance auditor | Audit logs, compliance reporting, monitoring |
| `DEVICE_MANAGER` | Device management | Device inventory, remote configuration, kiosk management |
| `POLICY_ADMIN` | Policy administrator | Policy creation, distribution, compliance management |
| `NATIONAL_SUPPORT_ADMIN` | National-level support | Cross-regional oversight, national reporting |

### Role-Based Access Enforcement

#### Android App Authentication
- **Authentication Method**: Device ID + User Code + PIN
- **Allowed Roles**: `TEAM_MEMBER`, `FIELD_SUPERVISOR`, `REGIONAL_MANAGER` only
- **Token Type**: Device-scoped JWT with app permissions
- **Access Scope**: Mobile app features only

#### Web Admin Authentication
- **Authentication Method**: Email + Password
- **Allowed Roles**: All roles except `TEAM_MEMBER` (field workers use app)
- **Token Type**: Web-scoped JWT with admin permissions
- **Access Scope**: Web admin dashboard and management features

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

### Mobile App API Response Format

**Success Response:**
```json
{
  "success": true,
  // ... response data
}
```

**Error Response:**
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

### Web Admin API Response Format

**Success Response:**
```json
{
  "ok": true,
  // ... response data
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

### Cookie Support (Web Admin API)

Web Admin API uses HTTP-only cookies for token management:
- `access_token` - JWT access token (20 minutes expiry)
- `refresh_token` - JWT refresh token (12 hours expiry)
- `auth_type` - Authentication type identifier

Tokens can also be provided via Authorization header as fallback.

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

## Web Admin Authentication Endpoints

Web Admin API uses email/password authentication instead of device-based authentication.

#### POST /api/v1/web-admin/auth/login

Authenticate a web admin user with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "SYSTEM_ADMIN|SUPPORT_AGENT|AUDITOR|DEVICE_MANAGER|POLICY_ADMIN|NATIONAL_SUPPORT_ADMIN|FIELD_SUPERVISOR|REGIONAL_MANAGER",
    "fullName": "string"
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing email or password
- `401 UNAUTHORIZED` - Invalid credentials, account locked, or account inactive
- `423 LOCKED` - Account temporarily locked due to failed attempts

**Role Validation:**
- `TEAM_MEMBER` role is rejected with `WEB_ACCESS_DENIED` error
- Only 8 valid web admin roles are allowed

#### GET /api/v1/web-admin/auth/whoami

Get current web admin user information.

**Authentication:** Required (Bearer token or cookie)

**Response (200 OK):**
```json
{
  "ok": true,
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "SYSTEM_ADMIN",
    "fullName": "string",
    "lastLoginAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `401 UNAUTHORIZED` - Invalid or missing token
- `403 FORBIDDEN` - User inactive or TEAM_MEMBER role

#### POST /api/v1/web-admin/auth/logout

End web admin session and clear cookies.

**Authentication:** Required (Bearer token or cookie)

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Logout successful"
}
```

**Security Features:**
- Clears HTTP-only access_token cookie
- Clears HTTP-only refresh_token cookie
- Clears auth_type cookie
- Supports token revocation

#### POST /api/v1/web-admin/auth/refresh

Refresh web admin access token using refresh token.

**Authentication:** Required (Bearer token or cookie)

**Response (200 OK):**
```json
{
  "ok": true,
  "accessToken": "string",
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "SYSTEM_ADMIN",
    "fullName": "string"
  }
}
```

**Error Responses:**
- `401 UNAUTHORIZED` - Invalid or expired refresh token
- `403 FORBIDDEN` - User not found or inactive

#### POST /api/v1/web-admin/auth/create-admin

Create a new web admin user (for initial setup).

**Authentication:** Required (System Admin role recommended)

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "SYSTEM_ADMIN"
}
```

**Response (201 Created):**
```json
{
  "ok": true,
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "SYSTEM_ADMIN",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "message": "Admin user created successfully"
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields, weak password, or invalid role
- `409 CONFLICT` - Email already exists

**Role Validation:**
- Only accepts 8 valid web admin roles (excludes TEAM_MEMBER)
- Password must be at least 8 characters long

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

### Mobile App Authentication Errors
- `UNAUTHORIZED` - Invalid or missing authentication
- `LOGIN_FAILED` - Invalid credentials
- `REFRESH_FAILED` - Refresh token invalid/expired
- `RATE_LIMITED` - Too many attempts (includes `retryAfter` in response)
- `DEVICE_NOT_FOUND` - Device ID not recognized
- `INSUFFICIENT_PERMISSIONS` - User lacks required role or permissions
- `TEAM_ACCESS_DENIED` - User cannot access resources from this team
- `OWNER_ACCESS_REQUIRED` - User can only access their own resources

### Web Admin Authentication Errors
- `WEB_ACCESS_DENIED` - TEAM_MEMBER role cannot access web admin interface
- `ACCOUNT_LOCKED` - Account temporarily locked due to failed login attempts
- `ACCOUNT_INACTIVE` - Account is deactivated
- `INVALID_TOKEN_TYPE` - Token type mismatch for intended operation
- `NO_TOKEN` - Missing authentication token
- `NO_REFRESH_TOKEN` - Missing refresh token
- `INVALID_REFRESH_TOKEN` - Invalid or expired refresh token

### Role Validation Errors (Both APIs)
- `INVALID_ROLE` - Invalid role specified for operation
- `VALIDATION_ERROR` - General validation error for input data

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

#### Users (Mobile App Users)
- `id` (UUID, Primary Key)
- `code` (VARCHAR(32)) - User login code
- `teamId` (UUID, Foreign Key to teams.id)
- `displayName` (VARCHAR(255)) - Display name
- `email` (VARCHAR(255)) - Optional email
- `role` (ENUM: TEAM_MEMBER, FIELD_SUPERVISOR, REGIONAL_MANAGER, SYSTEM_ADMIN, SUPPORT_AGENT, AUDITOR, DEVICE_MANAGER, POLICY_ADMIN, NATIONAL_SUPPORT_ADMIN) - User role
- `isActive` (BOOLEAN) - User active status
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### Web Admin Users (Web Interface Users)
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255)) - Email (required for login)
- `password` (VARCHAR(255)) - Hashed password (Argon2id with salt)
- `firstName` (VARCHAR(255)) - First name
- `lastName` (VARCHAR(255)) - Last name
- `role` (ENUM: SYSTEM_ADMIN, SUPPORT_AGENT, AUDITOR, DEVICE_MANAGER, POLICY_ADMIN, NATIONAL_SUPPORT_ADMIN, FIELD_SUPERVISOR, REGIONAL_MANAGER) - Web admin role (excludes TEAM_MEMBER)
- `isActive` (BOOLEAN) - Account active status
- `loginAttempts` (INTEGER) - Failed login attempts counter
- `lockedAt` (TIMESTAMP) - Account lockout timestamp
- `lastLoginAt` (TIMESTAMP) - Last successful login
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

**Test Mobile App Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001","userCode":"test001","pin":"123456"}'
```

**Test Web Admin Login:**
```bash
curl -X POST http://localhost:3000/api/web-admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"adminpassword123"}'
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

**Mobile App Whoami Response:**
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

**Web Admin Login Response:**
```json
{
  "ok": true,
  "user": {
    "id": "admin-uuid",
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Admin",
    "role": "SYSTEM_ADMIN",
    "fullName": "John Admin"
  },
  "message": "Login successful"
}
```

### Additional Features

The API supports:
- **Dual Interface Architecture** - Separate Mobile App API and Web Admin API
- **Comprehensive Role-Based Access Control** - 9 specialized roles with clear access boundaries
- **Role Differentiation Enforcement** - TEAM_MEMBER blocked from web admin interface
- **PostgreSQL with Connection Pooling** - Production-ready database
- **Full CRUD Operations** - Complete user/device/team management
- **Supervisor PIN Rotation** - Secure PIN management
- **Web Admin Account Security** - Account lockout, login attempt tracking, password hashing
- **Cookie-based Authentication** - HTTP-only cookies for web admin sessions
- **Telemetry Batching** - Efficient data collection
- **Rate Limiting** - Protection against abuse
- **Comprehensive Error Handling** - Consistent error responses across both APIs
- **Request Tracking** - Request IDs for debugging
- **Health Checks** - System status monitoring
- **Hybrid Role Support** - Field supervisors and regional managers can access both interfaces

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