# Role Differentiation Guide

## Overview

SurveyLauncher supports two distinct user interfaces with role-based access control:

1. **Android App Interface** - Field operations and mobile access
2. **Web Admin Interface** - Administrative and management functions

This document clearly defines which roles can access which interfaces.

## Role Categories

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

## Authentication Flow

### Android App Authentication
- **Authentication Method**: Device ID + User Code + PIN
- **Allowed Roles**: `TEAM_MEMBER`, `FIELD_SUPERVISOR`, `REGIONAL_MANAGER` only
- **Token Type**: Device-scoped JWT with app permissions
- **Access Scope**: Mobile app features only

### Web Admin Authentication
- **Authentication Method**: Email + Password
- **Allowed Roles**: All roles except `TEAM_MEMBER` (field workers use app)
- **Token Type**: Web-scoped JWT with admin permissions
- **Access Scope**: Web admin dashboard and management features

## Security Enforcement

### Database Level
- `users` table: Android app users (App + Web roles)
- `web_admin_users` table: Web admin users (Web-only + Hybrid roles)
- Role validation enforced during authentication

### Authentication Service Level
```typescript
// Web Admin authentication - rejects TEAM_MEMBER role
if (user.role === 'TEAM_MEMBER') {
  return {
    success: false,
    error: {
      code: 'WEB_ACCESS_DENIED',
      message: 'TEAM_MEMBER role cannot access web admin interface'
    }
  };
}

// Android App authentication - allows only hybrid roles
const allowedAppRoles = ['TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER'];
if (!allowedAppRoles.includes(user.role)) {
  return {
    success: false,
    error: {
      code: 'APP_ACCESS_DENIED',
      message: 'Role not authorized for mobile app access'
    }
  };
}
```

### Frontend Level
- Login pages restricted by role type
- Navigation menus filtered by user role
- API endpoints validate role permissions

## Role Migration Strategy

### Existing Users
1. **Android App Users** (`users` table):
   - Keep `TEAM_MEMBER`, `FIELD_SUPERVISOR`, `REGIONAL_MANAGER` roles
   - Can continue using app authentication
   - Optionally create web admin accounts for hybrid access

2. **Web Admin Users** (`web_admin_users` table):
   - Create accounts for all `SYSTEM_ADMIN`, `SUPPORT_AGENT`, `AUDITOR` roles
   - Create web accounts for `FIELD_SUPERVISOR`, `REGIONAL_MANAGER` for hybrid access
   - `TEAM_MEMBER` users generally don't need web access

### New User Creation
- **App Users**: Created in `users` table with device authentication
- **Admin Users**: Created in `web_admin_users` table with email/password
- **Hybrid Users**: Created in both tables for dual access

## Permission Matrix

| Feature | TEAM_MEMBER | FIELD_SUPERVISOR | REGIONAL_MANAGER | SYSTEM_ADMIN | SUPPORT_AGENT | AUDITOR | DEVICE_MANAGER | POLICY_ADMIN | NATIONAL_SUPPORT_ADMIN |
|---------|-------------|------------------|------------------|--------------|--------------|---------|----------------|--------------|------------------------|
| **Android App** |
| Daily login & GPS tracking | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Supervisor override | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Web Dashboard** |
| User management | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Device management | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Policy configuration | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Audit logs | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Reports & analytics | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Support tickets | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| National oversight | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Implementation Notes

### Role Validation
- Every API endpoint validates user roles
- Frontend components show/hide features based on roles
- Database constraints prevent invalid role assignments

### Security Benefits
1. **Clear Separation**: Field workers cannot access admin functions
2. **Least Privilege**: Users only get access they need
3. **Audit Trail**: Clear accountability by role type
4. **Scalability**: Easy to add new roles with defined access patterns

### Future Enhancements
- Role-based feature flags
- Time-based role elevation
- Multi-factor authentication for admin roles
- Role inheritance and delegation

---

**Last Updated**: 2025-11-15
**Version**: 1.0
**Next Review**: 2025-12-15