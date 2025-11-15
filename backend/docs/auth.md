# SurveyLauncher Authentication System

This document provides comprehensive details about the SurveyLauncher authentication architecture, covering both mobile device authentication and web-based administrative access.

## 🏗️ Authentication Architecture Overview

SurveyLauncher implements a **dual authentication system** designed to serve two distinct user populations:

1. **Mobile Device Authentication** - For field workers using Android tablets
2. **Web Admin Authentication** - For system administrators and managers

```
┌─────────────────────────────────────────────────────────────┐
│                    SurveyLauncher Auth System              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │  Mobile Auth        │    │  Web Admin Auth              │ │
│  │                     │    │                             │ │
│  │  • deviceId         │    │  • email + password          │ │
│  │  • userCode         │    │  • RBAC-based               │ │
│  │  • PIN              │    │  • Session management        │ │
│  │  • Device-bound     │    │  • Role-based access         │ │
│  │                     │    │                             │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📱 Mobile Device Authentication

### Purpose
Field workers using Android tablets in kiosk mode for survey data collection.

### Authentication Flow
```mermaid
sequenceDiagram
    participant Device as Android Tablet
    participant API as SurveyLauncher API
    participant DB as Database
    participant GPS as GPS Service

    Device->>API: POST /api/v1/auth/login
    Note over Device: deviceId, userCode, PIN

    API->>DB: Verify user exists and is active
    API->>DB: Verify device is registered
    API->>DB: Verify PIN hash (Argon2id)

    alt PIN Valid
        API->>DB: Create session (device-bound)
        API->>Device: Return JWT tokens + session info
        Device->>GPS: Start location service
        Device->>API: Begin telemetry heartbeat
    else PIN Invalid
        API->>DB: Log failed attempt
        API->>Device: Return 401 with retry delay
    end
```

### API Endpoints

#### **POST /api/v1/auth/login**
Authenticates mobile device users.

**Request:**
```json
{
  "deviceId": "android_12345abcdef",
  "userCode": "emp001",
  "pin": "123456"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "session": {
    "sessionId": "session-uuid-123",
    "userId": "user-uuid-456",
    "deviceId": "android-123",
    "startedAt": "2025-01-15T10:30:00Z",
    "expiresAt": "2025-01-15T18:30:00Z",
    "overrideUntil": null
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "policyVersion": 3
}
```

**Response (Error):**
```json
{
  "ok": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid user code or PIN",
    "request_id": "req-uuid-789"
  }
}
```

#### **GET /api/v1/auth/whoami**
Returns current user and session information.

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": "user-uuid-456",
    "code": "emp001",
    "teamId": "team-uuid-789",
    "displayName": "Rahul Sharma",
    "role": "TEAM_MEMBER"
  },
  "session": {
    "sessionId": "session-uuid-123",
    "deviceId": "android-123",
    "expiresAt": "2025-01-15T18:30:00Z",
    "overrideUntil": null
  }
}
```

#### **POST /api/v1/auth/logout**
Ends the current session and stops GPS tracking.

#### **POST /api/v1/auth/refresh**
Refreshes JWT tokens using refresh token.

#### **POST /api/v1/auth/heartbeat**
Periodic heartbeat to maintain session and report device status.

### Security Features

#### **Device Binding**
- Sessions are bound to specific Android devices
- Tokens cannot be used from other devices
- Automatic session invalidation on device change

#### **Rate Limiting**
- PIN attempts: 10 per 10 minutes per device/IP
- Login attempts: 10 per 10 minutes per device/IP
- Exponential backoff on failed attempts

#### **PIN Security**
- Argon2id hashing with memory-hard parameters
- 6-digit minimum PIN length
- Failed attempt lockout (configurable duration)
- Supervisor PIN override capability

#### **Session Management**
- Configurable session timeout (default: 8 hours)
- Automatic GPS telemetry during active sessions
- Policy enforcement via time windows
- Supervisor override extensions

### Database Schema

```sql
-- Mobile users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL,           -- Employee code (emp001)
  team_id UUID REFERENCES teams(id),
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'TEAM_MEMBER',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Device registration
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  android_id VARCHAR(64) UNIQUE NOT NULL,
  team_id UUID REFERENCES teams(id),
  name VARCHAR(200) NOT NULL,
  app_version VARCHAR(32),
  is_active BOOLEAN DEFAULT true
);

-- Session management
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  device_id UUID REFERENCES devices(id),
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(16) DEFAULT 'open',
  override_until TIMESTAMP,
  token_jti VARCHAR(64) UNIQUE
);

-- PIN storage (Argon2id)
CREATE TABLE user_pins (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  verifier_hash VARCHAR(255) NOT NULL, -- Argon2id hash
  salt VARCHAR(32) NOT NULL,
  rotated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

## 🖥️ Web Admin Authentication

### Purpose
System administrators, managers, and supervisors accessing the web-based management interface.

### Authentication Flow
```mermaid
sequenceDiagram
    participant Admin as Web Admin
    participant API as SurveyLauncher API
    participant DB as Database
    participant RBAC as Authorization Service

    Admin->>API: POST /api/v1/web-admin/auth/login
    Note over Admin: email, password

    API->>DB: Verify admin user exists
    API->>DB: Verify password hash (bcrypt)
    API->>RBAC: Load user permissions

    alt Valid Credentials
        API->>DB: Update last_login_at
        API->>Admin: Return JWT tokens + user info
        Admin->>API: Subsequent requests with Bearer token
        API->>RBAC: Validate permissions per request
    else Invalid Credentials
        API->>Admin: Return 401 with generic error
    end
```

### API Endpoints

#### **POST /api/v1/web-admin/auth/login**
Authenticates web administrative users.

**Request:**
```json
{
  "email": "admin@surveylauncher.aiims",
  "password": "admin123456"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "user": {
    "id": "admin-uuid-123",
    "email": "admin@surveylauncher.aiims",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "SYSTEM_ADMIN",
    "fullName": "System Administrator"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### **GET /api/v1/web-admin/auth/whoami**
Returns current admin user and role information.

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": "admin-uuid-123",
    "email": "admin@surveylauncher.aiims",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "SYSTEM_ADMIN",
    "fullName": "System Administrator",
    "lastLoginAt": "2025-01-15T10:30:00Z"
  }
}
```

#### **POST /api/v1/web-admin/auth/logout**
Ends the current admin session.

#### **POST /api/v1/web-admin/auth/refresh**
Refreshes admin JWT tokens.

#### **GET /api/v1/web-admin/auth/users**
List all admin users (SYSTEM_ADMIN only).

#### **POST /api/v1/web-admin/auth/users**
Create new admin user (authorized roles only).

### Security Features

#### **Role-Based Access Control (RBAC)**
- 9 hierarchical roles with granular permissions
- Permission inheritance based on hierarchy level
- Context-aware access control (team boundaries)
- Real-time permission validation

#### **Password Security**
- bcrypt hashing with adaptive work factor
- 8-character minimum password length
- No password reuse restrictions
- Secure password reset flow

#### **Session Management**
- JWT-based stateless authentication
- Configurable token TTL (15min access, 7d refresh)
- Token revocation capability
- Secure cookie options for web interface

#### **Account Security**
- Account lockout on failed attempts
- Last login tracking
- Activity logging and audit trails
- Multi-factor authentication readiness

### Database Schema

```sql
-- Web admin users table
CREATE TABLE web_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role assignments (for future extensibility)
CREATE TABLE admin_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES web_admin_users(id),
  role_id UUID REFERENCES roles(id),
  granted_by UUID REFERENCES web_admin_users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

## 🔐 JWT Token Structure

### Mobile Authentication Tokens
```json
{
  "sub": "user-uuid-456",
  "type": "mobile",
  "deviceId": "android-123",
  "sessionId": "session-uuid-789",
  "role": "TEAM_MEMBER",
  "teamId": "team-uuid-abc",
  "jti": "token-uuid-xyz",
  "iat": 1642248600,
  "exp": 1642250400,
  "iss": "surveylauncher-api"
}
```

### Web Admin Authentication Tokens
```json
{
  "sub": "admin-uuid-123",
  "type": "web-admin",
  "email": "admin@surveylauncher.aiims",
  "role": "SYSTEM_ADMIN",
  "permissions": ["USERS.MANAGE", "DEVICES.MANAGE", "..."],
  "jti": "token-uuid-xyz",
  "iat": 1642248600,
  "exp": 1642250400,
  "iss": "surveylauncher-api"
}
```

## 🛡️ Security Controls

### Rate Limiting Configuration
```env
# Rate limits per 10-minute window
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=50
PIN_RATE_LIMIT_MAX=10
```

### Token Configuration
```env
# JWT Settings
JWT_ACCESS_SECRET=hAhTFFkFba+qnf66Q4JmKztZi8znEKBWEDKU5O+Ie2E=
JWT_REFRESH_SECRET=4eI2SmKHWz+seWXFe0UCiV1EGnGte7y8MUe1AFo+mNg=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

### CORS Configuration
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

## 🔄 Authentication Integration

### Middleware Usage

#### Mobile Authentication Middleware
```typescript
import { authenticateToken } from '../middleware/auth';

// Protect mobile routes
router.use('/api/v1/telemetry', authenticateToken('mobile'));
router.use('/api/v1/devices/:id', authenticateToken('mobile'));
```

#### Web Admin Authentication Middleware
```typescript
import { authenticateWebAdmin } from '../middleware/auth';

// Protect admin routes
router.use('/api/v1/users', authenticateWebAdmin());
router.use('/api/v1/teams', authenticateWebAdmin());
router.use('/api/v1/projects', authenticateWebAdmin());
```

### Permission Checking
```typescript
import { hasPermission } from '../middleware/auth';

// Route-level permission check
router.post('/api/v1/projects',
  authenticateWebAdmin(),
  hasPermission('PROJECTS', 'CREATE'),
  createProjectHandler
);
```

## 📊 Authentication Analytics

### Key Metrics
- **Login Success Rate**: Percentage of successful authentication attempts
- **Failed Login Rate**: Authentication failure rate by user type
- **Session Duration**: Average session length by role
- **Device Registration**: New device registrations over time
- **Geographic Distribution**: Login locations by team/region

### Security Monitoring
- **Brute Force Attempts**: Detect and block credential stuffing
- **Unusual Activity**: Flag logins from unexpected locations/devices
- **Token Abuse**: Monitor for stolen/compromised tokens
- **Role Escalation**: Detect unauthorized permission attempts

## 🧪 Testing Authentication

### Mobile Auth Testing
```bash
# Test mobile login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "android_12345abcdef",
    "userCode": "emp001",
    "pin": "123456"
  }'

# Test whoami
curl -X GET http://localhost:3000/api/v1/auth/whoami \
  -H "Authorization: Bearer <mobile-token>"
```

### Web Admin Auth Testing
```bash
# Test admin login
curl -X POST http://localhost:3000/api/v1/web-admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@surveylauncher.aiims",
    "password": "admin123456"
  }'

# Test whoami
curl -X GET http://localhost:3000/api/v1/web-admin/auth/whoami \
  -H "Authorization: Bearer <admin-token>"
```

## 🔮 Future Enhancements

### Planned Features
- **Multi-Factor Authentication (MFA)** for admin accounts
- **Single Sign-On (SSO)** integration with enterprise directories
- **Biometric Authentication** support for mobile devices
- **Conditional Access Policies** based on location/time
- **OAuth2/OIDC** provider capabilities
- **Audit Log Integration** with SIEM systems

### Security Roadmap
- **Zero Trust Architecture** implementation
- **Hardware Security Module (HSM)** for key management
- **Advanced Threat Detection** with machine learning
- **Compliance Reporting** for audit requirements

This dual authentication system provides appropriate security controls for both field operations and administrative access while maintaining operational efficiency and user experience requirements.