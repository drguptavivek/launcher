# User & Device Registration Gaps Analysis

## Executive Summary

This document identifies critical gaps between the user registration workflow requirements, frontend expectations, and current backend implementation. The analysis reveals that the user registration workflow is **completely non-functional** due to missing backend endpoints and data schema issues.

**Key Finding**: The frontend is fully implemented and expecting comprehensive user management APIs, but the backend only provides basic device authentication and policy functionality.

## 🚨 Critical Issues

### 1. User Registration Workflow Completely Broken

The workflow documented in `user-device-registration.md` expects a comprehensive set of user management APIs that **do not exist** in the current backend implementation.

**Impact**: Admin interface cannot create users, teams, or devices. Frontend user management pages will fail with API errors.

### 2. Missing User Management API (12+ Endpoints)

The frontend expects these endpoints that are completely missing from the backend:

#### Team Management API
- ❌ `POST /api/v1/teams` - Create new team
- ❌ `GET /api/v1/teams` - List all teams
- ❌ `PUT /api/v1/teams/:id` - Update team details

#### User Management API
- ❌ `POST /api/v1/users` - Register new user with PIN hashing
- ❌ `GET /api/v1/users` - List users (with pagination)
- ❌ `GET /api/v1/users/:id` - Get user details
- ❌ `PUT /api/v1/users/:id` - Update user details
- ❌ `DELETE /api/v1/users/:id` - Deactivate user

#### Device Management API
- ❌ `POST /api/v1/devices` - Register new device
- ❌ `GET /api/v1/devices` - List devices
- ❌ `PUT /api/v1/devices/:id` - Update device details
- ❌ `POST /api/v1/devices/:id/deactivate` - Deactivate device

#### Supervisor PIN Management API
- ❌ `POST /api/v1/supervisor/pins` - Create supervisor PIN
- ❌ `PUT /api/v1/supervisor/pins/:teamId` - Update supervisor PIN
- ❌ `POST /api/v1/supervisor/pins/:teamId/rotate` - Rotate supervisor PIN

## 📊 Frontend-Backend Mismatch Analysis

### Frontend Route Status (from `survey-launcher-ui/docs/routes.md`)

| Frontend Route | Expected Backend API | Backend Status | Data Persistence |
|---------------|---------------------|----------------|------------------|
| `/users` | `GET /api/v1/users` | ❌ Missing | ❌ Mock Only |
| `/users/create` | `POST /api/v1/users` | ❌ Missing | ❌ Mock Only |
| `/users/[id]` | `GET /api/v1/users/:id` | ❌ Missing | ❌ Mock Only |
| `/users/[id]/edit` | `PUT /api/v1/users/:id` | ❌ Missing | ❌ Mock Only |

**Current Status**: User Management API is "Mock Implementation" with "In Memory" data only.

### Data Flow Issues

**Expected User Creation Flow**:
```
Frontend Form → POST /api/v1/users → Database → Response
```

**Current Reality**:
```
Frontend Form → POST /api/v1/users → ❌ 404 Not Found
```

## 🗄️ Database Schema Gaps

### Missing User Table Fields

**Workflow Expects**:
```sql
-- users table should have:
role VARCHAR(24) NOT NULL DEFAULT 'TEAM_MEMBER', -- Missing
email VARCHAR(255), -- Missing
```

**Current Schema**:
```sql
-- users table actually has:
id UUID PRIMARY KEY,
teamId UUID REFERENCES teams(id),
code VARCHAR(32) NOT NULL,
displayName VARCHAR(120) NOT NULL,
isActive BOOLEAN DEFAULT true,
createdAt TIMESTAMP DEFAULT NOW()
-- Missing: role, email fields
```

### Role Definition Missing

**Workflow expects these roles**:
- `TEAM_MEMBER`
- `SUPERVISOR`
- `ADMIN`

**Current implementation**: No role-based access control system exists.

## 🔐 Authentication & Authorization Gaps

### Admin Role Missing
- User workflow assumes "Admin" role for registration operations
- Backend schema has no `role` field in users table
- No role-based access control implemented
- Current auth middleware only validates JWT tokens, not user permissions

### Missing Auth Guards
- User management endpoints need admin authentication
- No middleware for role-based authorization exists
- Any authenticated user could access admin functions (if endpoints existed)

### Audit Logging Gaps
- No audit trail for user registration actions
- Missing request tracking for admin operations
- No compliance logging for user management

## 📋 Implementation Priority Matrix

### Phase 1: Critical Core Endpoints (Blockers)

| Priority | Endpoint | Impact | Effort |
|----------|----------|---------|--------|
| 🔴 High | `POST /api/v1/teams` | Enables team creation | Medium |
| 🔴 High | `POST /api/v1/users` | Enables user registration | High |
| 🔴 High | `POST /api/v1/devices` | Enables device registration | Medium |
| 🔴 High | `POST /api/v1/supervisor/pins` | Enables supervisor setup | Medium |

### Phase 2: Management Endpoints (Important)

| Priority | Endpoint | Impact | Effort |
|----------|----------|---------|--------|
| 🟡 Medium | `GET /api/v1/users` | User listing for admin UI | Medium |
| 🟡 Medium | `GET /api/v1/teams` | Team listing for admin UI | Low |
| 🟡 Medium | `PUT /api/v1/users/:id` | User editing functionality | Medium |
| 🟡 Medium | `GET /api/v1/devices` | Device listing for admin UI | Medium |

### Phase 3: Security & Enhancement (Nice to Have)

| Priority | Feature | Impact | Effort |
|----------|---------|---------|--------|
| 🟢 Low | Role-based access control | Security enhancement | High |
| 🟢 Low | Email field in user schema | User contact feature | Low |
| 🟢 Low | Audit logging system | Compliance feature | Medium |

## 🔍 Detailed Gap Analysis

### 1. User Creation Request Mismatch

**Workflow Expects**:
```json
POST /api/v1/users
{
  "teamId": "team-uuid",
  "code": "u123",
  "displayName": "John Doe",
  "role": "TEAM_MEMBER",
  "pin": "123456"
}
```

**Backend Reality**: Endpoint doesn't exist, and `role` field not in database schema.

### 2. PIN Storage Implementation

**Expected**: PIN hashing with Scrypt and storage in `userPins` table
**Reality**: Database table exists but no API endpoints to create/update user PINs

### 3. Team-Based Access Control

**Expected**: Users can only be created/managed within their team by authorized admins
**Reality**: No team-based authorization middleware exists

### 4. Device Registration Flow

**Expected**:
```json
POST /api/v1/devices
{
  "androidId": "android-device-unique-id",
  "teamId": "team-uuid",
  "appVersion": "1.0.0"
}
```

**Reality**: Endpoint doesn't exist, no device registration capability

## 📈 Impact Assessment

### High Priority Issues (Workflow Blockers)
- ✗ **User registration workflow completely non-functional**
- ✗ **Admin interface cannot manage users or teams**
- ✗ **Device registration impossible**
- ✗ **Frontend user management pages will fail with API errors**

### Medium Priority Issues (Feature Limitations)
- ✗ **Missing role-based authorization**
- ✗ **No audit trail for registration actions**
- ✗ **Email notifications not possible**
- ✗ **Team-based access control missing**

### Current Working Features
- ✅ **Basic device authentication** (8 endpoints implemented)
- ✅ **Policy distribution** (JWS-signed policies)
- ✅ **Telemetry collection** (batch processing)
- ✅ **Supervisor override** (emergency access)
- ✅ **Frontend UI** (complete but expecting missing APIs)

## 🛠️ Recommended Implementation Approach

### Phase 1: Core API Implementation (2-3 weeks)
1. Implement database schema updates (add role, email fields)
2. Create team management endpoints
3. Implement user registration with PIN hashing
4. Add device registration endpoints
5. Create supervisor PIN management

### Phase 2: Security & Authorization (1-2 weeks)
1. Implement role-based access control middleware
2. Add admin authentication guards
3. Create audit logging system
4. Implement team-based authorization

### Phase 3: Integration & Testing (1 week)
1. Integration testing with frontend
2. End-to-end workflow testing
3. Security audit and penetration testing
4. Performance optimization

## 📚 Reference Documents

- **User Registration Workflow**: `workflows/user-device-registration.md`
- **Frontend Routes**: `survey-launcher-ui/docs/routes.md`
- **Backend API**: `backend/docs/api.md`
- **Database Schema**: `src/lib/server/db/schema.ts`

## 🎯 Success Criteria

After implementing the missing endpoints:

- ✅ Admin can create new teams via frontend
- ✅ Admin can register new users with PINs
- ✅ Admin can register and assign devices
- ✅ Supervisor PINs can be created and managed
- ✅ Frontend user management pages functional
- ✅ Role-based access control enforced
- ✅ Complete audit trail for all admin actions

---

**Document Created**: November 13, 2025
**Analysis Scope**: User & Device Registration Workflow
**Critical Issues**: 12+ missing API endpoints
**Estimated Implementation Time**: 4-6 weeks for complete functionality