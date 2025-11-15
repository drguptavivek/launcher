# SurveyLauncher API Documentation

## Overview

The SurveyLauncher backend provides comprehensive REST API documentation powered by Swagger UI, allowing developers to explore, test, and understand all available endpoints.

## Accessing the Documentation

### Swagger UI (Interactive Documentation)
- **URL**: `http://localhost:3000/api-docs`
- **Description**: Interactive API documentation with testing capabilities
- **Features**:
  - Try out endpoints directly from your browser
  - View request/response schemas
  - Authentication support (Bearer tokens and cookies)
  - Parameter validation
  - Real-time API testing

### OpenAPI Specification (JSON)
- **URL**: `http://localhost:3000/api-docs.json`
- **Description**: Raw OpenAPI 3.0 specification in JSON format
- **Usage**: Download for use with API clients, Postman, or other tools

### OpenAPI Specification (YAML)
- **File**: `/backend/openapi.yaml`
- **Description**: Human-readable OpenAPI specification in YAML format
- **Usage**: Version control, documentation generation, API client creation

## API Architecture

The SurveyLauncher API consists of two main interfaces:

### 1. Mobile App API (`/api/v1/*`)
Designed for Android devices with:
- Device-based authentication
- Role-based access control (3 hybrid roles)
- Real-time telemetry collection
- Policy distribution and enforcement
- Supervisor override capabilities

### 2. Web Admin API (`/api/web-admin/*`)
Designed for administrative web interface with:
- Email/password authentication
- Comprehensive role management (9 total roles)
- User and device management
- Policy configuration
- Analytics and reporting

## Authentication Methods

### Mobile App Authentication
- **Method**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <access_token>`
- **Flow**: Device ID + User Code + PIN → Access Token → Refresh Token

### Web Admin Authentication
- **Method**: HTTP-only Cookies + Bearer Token
- **Cookies**: `access_token`, `refresh_token`, `auth_type`
- **Header**: `Authorization: Bearer <access_token>` (fallback)
- **Flow**: Email + Password → Cookies + Token → Refresh Flow

## Role-Based Access Control

### Hybrid Roles (App + Web Access)
- `TEAM_MEMBER`: Field users with basic mobile and web access
- `FIELD_SUPERVISOR`: Frontline supervisors with oversight capabilities
- `REGIONAL_MANAGER`: Regional leadership with multi-location access

### Web-Only Roles
- `SYSTEM_ADMIN`: Full system administration
- `SUPPORT_AGENT`: Customer support and troubleshooting
- `AUDITOR`: Compliance and audit functionality
- `DEVICE_MANAGER`: Device inventory and configuration
- `POLICY_ADMIN`: Policy creation and management
- `NATIONAL_SUPPORT_ADMIN`: National-level oversight

## Key Endpoints

### Health & System
- `GET /health` - Basic health check
- `GET /api-docs` - Interactive API documentation
- `GET /api-docs.json` - OpenAPI specification

### Mobile App Endpoints
- `POST /api/v1/auth/login` - Device user authentication
- `GET /api/v1/auth/whoami` - Current user information
- `POST /api/v1/auth/logout` - End user session
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/policy/{deviceId}` - Device policy retrieval
- `POST /api/v1/telemetry` - Submit telemetry data

### Web Admin Endpoints
- `POST /api/web-admin/auth/login` - Web admin authentication
- `GET /api/web-admin/auth/whoami` - Current admin information
- `POST /api/web-admin/auth/logout` - End admin session
- `POST /api/web-admin/auth/create-admin` - Create admin user

### Management Endpoints
- `GET/POST /api/v1/teams` - Team management
- `GET/POST /api/v1/users` - User management
- `GET/POST /api/v1/devices` - Device management
- `GET/PUT/DELETE /api/v1/teams/{id}` - Team operations
- `GET/PUT/DELETE /api/v1/users/{id}` - User operations
- `GET/PUT/DELETE /api/v1/devices/{id}` - Device operations

## Testing the API

### Using Swagger UI
1. Navigate to `http://localhost:3000/api-docs`
2. Click on any endpoint to expand details
3. Click "Try it out" to test the endpoint
4. Fill in required parameters and request body
5. Click "Execute" to send the request
6. View the response directly in the interface

### Authentication Testing

#### Mobile App Testing
1. First authenticate via `POST /api/v1/auth/login`
2. Copy the `access_token` from the response
3. Click "Authorize" button in Swagger UI
4. Enter `Bearer <access_token>` in the value field
5. Click "Authorize" to apply the token

#### Web Admin Testing
1. First authenticate via `POST /api/web-admin/auth/login`
2. The response will include HTTP-only cookies (set automatically)
3. Use the provided `access_token` for manual testing
4. Enter `Bearer <access_token>` in the authorization modal

### Using curl Examples

#### Mobile App Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-001",
    "userCode": "USER001",
    "pin": "123456"
  }'
```

#### Web Admin Login
```bash
curl -X POST http://localhost:3000/api/web-admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpassword123"
  }' \
  -c cookies.txt
```

#### Authenticated Request
```bash
curl -X GET http://localhost:3000/api/v1/auth/whoami \
  -H "Authorization: Bearer <access_token>"
```

## Response Formats

### Success Response (Mobile API)
```json
{
  "success": true,
  "data": { ... }
}
```

### Success Response (Web Admin API)
```json
{
  "ok": true,
  "data": { ... }
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

## Rate Limiting

- **Login**: 5 attempts per 15 minutes per IP
- **PIN Verification**: 10 attempts per 10 minutes per device
- **Telemetry**: 120 requests per minute per device
- **General API**: Standard rate limits apply

## Development

### Starting the Server
```bash
cd backend
npm run dev
```

### Updating Documentation
1. Update the `openapi.yaml` file for changes
2. Restart the server to reload changes
3. Visit `/api-docs` to verify updates

### Manual Schema Updates
If you make changes to the OpenAPI spec manually:
1. Edit `backend/openapi.yaml`
2. Test the changes at `http://localhost:3000/api-docs`
3. Validate the JSON at `http://localhost:3000/api-docs.json`

## Error Codes

Common error codes you may encounter:

- `UNAUTHORIZED` - Authentication required or failed
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Support

For API-related questions or issues:
- Check the interactive documentation at `/api-docs`
- Review the OpenAPI specification in `openapi.yaml`
- Consult the API response messages for specific error details
- Contact the SurveyLauncher development team