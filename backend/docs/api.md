# SurveyLauncher API Documentation

## Overview

The SurveyLauncher backend provides a REST API for authentication, policy management, telemetry, and supervisor override functionality. The API follows a consistent JSON format with proper error handling and response structures.

## Base URL

```
http://localhost:5173/api/v1
```

## Authentication

Most endpoints require JWT token authentication via the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "ok": true,
  // ... response data
}
```

### Error Response
```json
{
  "ok": false,
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
  "ok": true,
  "session": {
    "session_id": "string",
    "user_id": "string",
    "started_at": "2025-01-01T00:00:00Z",
    "expires_at": "2025-01-01T08:00:00Z",
    "override_until": "2025-01-01T10:00:00Z"
  },
  "access_token": "string",
  "refresh_token": "string",
  "policy_version": 3
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Missing required fields
- `401 UNAUTHORIZED` - Invalid credentials
- `429 TOO_MANY_REQUESTS` - Rate limited (includes `retry_after` field)

#### POST /api/v1/auth/logout

End the current user session.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "ok": true,
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
  "ok": true,
  "access_token": "string",
  "expires_at": "2025-01-01T00:00:00Z"
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
  "user": {
    "id": "string",
    "code": "string",
    "team_id": "string",
    "display_name": "string"
  },
  "session": {
    "session_id": "string",
    "device_id": "string",
    "expires_at": "2025-01-01T00:00:00Z",
    "override_until": "2025-01-01T10:00:00Z"
  },
  "policy_version": 3
}
```

#### POST /api/v1/auth/session/end

Force end the current session.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Session ended successfully"
}
```

### Supervisor Override Endpoints

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
  "ok": true,
  "override_until": "2025-01-01T10:00:00Z",
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
  "jws": "string",
  "payload": {
    "version": 3,
    "device_id": "string",
    "team_id": "string",
    "tz": "string",
    "time_anchor": {
      "server_now_utc": "2025-01-01T00:00:00Z",
      "max_clock_skew_sec": 180,
      "max_policy_age_sec": 86400
    },
    "session": {
      "allowed_windows": [
        {
          "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
          "start": "08:00",
          "end": "19:30"
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
      "min_displacement_m": 50
    },
    "telemetry": {
      "heartbeat_minutes": 10,
      "batch_max": 50
    },
    "meta": {
      "issued_at": "2025-01-01T00:00:00Z",
      "expires_at": "2025-01-02T00:00:00Z"
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
      "data": {}
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "accepted": 25,
  "dropped": 0
}
```

**Error Responses:**
- `400 BAD_REQUEST` - Invalid batch format
- `404 NOT_FOUND` - Device not found

## Error Codes

### Authentication Errors
- `UNAUTHORIZED` - Invalid or missing authentication
- `LOGIN_FAILED` - Invalid credentials
- `REFRESH_FAILED` - Refresh token invalid/expired
- `RATE_LIMITED` - Too many attempts (includes `retry_after` in response)
- `DEVICE_NOT_FOUND` - Device ID not recognized

### Session Errors
- `NO_SESSION` - No active session found
- `SESSION_END_FAILED` - Failed to end session

### Policy Errors
- `DEVICE_NOT_FOUND` - Device ID not found in policy system
- `POLICY_ERROR` - General policy issuance failure

### Telemetry Errors
- `INVALID_BATCH` - Malformed telemetry batch
- `DEVICE_NOT_FOUND` - Device not found for telemetry
- `TELEMETRY_ERROR` - General telemetry processing failure

### General Errors
- `MISSING_FIELDS` - Required request fields missing
- `INTERNAL_ERROR` - Server-side error
- `AUTH_ERROR` - Authentication middleware error

## Rate Limiting

Several endpoints implement rate limiting to prevent abuse:
- Login endpoints: 5 attempts per 15 minutes per IP
- Supervisor override: 3 attempts per hour per device
- Failed authentication increments retry counters

## Request IDs

All requests should include a unique `x-request-id` header for tracking and debugging. If not provided, the server generates one and includes it in error responses.

## Development Notes

### Mock API Mode

Set `MOCK_API=true` environment variable to enable mock mode for development:
- All endpoints return deterministic mock data
- No database dependencies
- Ideal for frontend development without backend setup

### Testing

Run integration tests to verify API contract:
```bash
npm test
```

The test suite covers:
- Authentication flows
- Policy retrieval
- Telemetry batching
- Error scenarios
- Rate limiting behavior