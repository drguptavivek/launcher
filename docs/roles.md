# SurveyLauncher Role-Based Access Control (RBAC)

The SurveyLauncher system implements a comprehensive Role-Based Access Control (RBAC) system with **9 hierarchical roles** and **29 granular permissions**. This document provides detailed information about the role structure, permissions, and concrete usage examples.

## 🏗️ System Architecture

### Role Hierarchy
```
SYSTEM_ADMIN (Level 9)
├── NATIONAL_SUPPORT_ADMIN (Level 8)
├── REGIONAL_MANAGER (Level 7)
├── DEVICE_MANAGER (Level 6)
├── POLICY_ADMIN (Level 5)
├── AUDITOR (Level 4)
├── FIELD_SUPERVISOR (Level 3)
└── TEAM_MEMBER (Level 1)
```

### Database Schema

```sql
-- Core Tables
roles (9 records)
├── id, name, display_name, description
├── is_system_role, is_active, hierarchy_level
└── created_at, updated_at

permissions (29 records)
├── id, name, resource, action, scope
├── description, conditions, is_active
└── created_at

role_permissions (link table)
├── role_id, permission_id, granted_by
├── granted_at, is_active
└── created_at

user_role_assignments
├── user_id, role_id, team_id, project_id
├── granted_by, granted_at, expires_at
└── is_active

permission_cache (performance optimization)
├── user_id, resource, action, result
├── expires_at, created_at
└── metadata
```

## 🎭 System Roles (9 Roles)

### Level 1: TEAM_MEMBER
**Display Name**: Team Member
**Description**: Frontline survey operators with basic team access

**Permissions**:
- ✅ TEAMS: READ, LIST
- ✅ USERS: READ, LIST
- ✅ DEVICES: READ, LIST
- ✅ TELEMETRY: READ, LIST
- ✅ POLICY: READ
- ✅ AUTH: READ
- ✅ PROJECTS: READ, LIST, EXECUTE
- ✅ SUPPORT_TICKETS: READ, LIST

### Level 3: FIELD_SUPERVISOR
**Display Name**: Field Supervisor
**Description**: On-site supervisors managing field operations and team devices

**Permissions**:
- ✅ TEAMS: READ, LIST
- ✅ USERS: READ, LIST, UPDATE
- ✅ DEVICES: CREATE, READ, UPDATE, LIST
- ✅ SUPERVISOR_PINS: READ, LIST
- ✅ TELEMETRY: READ, LIST
- ✅ POLICY: READ
- ✅ AUTH: READ, EXECUTE (supervisor overrides)
- ✅ PROJECTS: READ, LIST, ASSIGN

### Level 7: REGIONAL_MANAGER
**Display Name**: Regional Manager
**Description**: Multi-team regional oversight with cross-team access within region

**Permissions**:
- ✅ TEAMS: MANAGE
- ✅ USERS: MANAGE
- ✅ DEVICES: MANAGE
- ✅ PROJECTS: MANAGE
- ✅ ORGANIZATION: READ, UPDATE
- ✅ All Level 3 and below permissions

### Level 9: SYSTEM_ADMIN
**Display Name**: System Administrator
**Description**: Full system configuration and administrative access

**Permissions**:
- ✅ ALL RESOURCES: FULL ACCESS (CREATE, READ, UPDATE, DELETE, MANAGE)
- ✅ SYSTEM_SETTINGS: MANAGE
- ✅ ORGANIZATION: MANAGE
- ✅ All other roles' permissions

### Specialized Roles
- **DEVICE_MANAGER**: Full device management specialization
- **POLICY_ADMIN**: Full policy management
- **AUDITOR**: Read-only audit access and compliance monitoring
- **SUPPORT_AGENT**: User support and troubleshooting capabilities
- **NATIONAL_SUPPORT_ADMIN**: National-level support with full cross-regional access

## 🔐 Permission Matrix

| Resource | TEAM_MEMBER | FIELD_SUPERVISOR | REGIONAL_MANAGER | SYSTEM_ADMIN |
|----------|-------------|------------------|------------------|---------------|
| **TEAMS** | READ, LIST | READ, LIST | MANAGE | MANAGE |
| **USERS** | READ, LIST | READ, LIST, UPDATE | MANAGE | MANAGE |
| **DEVICES** | READ, LIST | CREATE, READ, UPDATE, LIST | MANAGE | MANAGE |
| **PROJECTS** | READ, LIST, EXECUTE | READ, LIST, ASSIGN | MANAGE | MANAGE |
| **POLICY** | READ | READ | READ | MANAGE | MANAGE |
| **AUTH** | READ | READ, EXECUTE | READ, EXECUTE | MANAGE |
| **SYSTEM_SETTINGS** | ❌ | ❌ | ❌ | MANAGE | MANAGE |

## 💻 Concrete API Examples

### 1. Web Admin Authentication

```bash
# Login as System Admin
curl -X POST http://localhost:3000/api/v1/web-admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@surveylauncher.aiims",
    "password": "admin123456"
  }'

# Response
{
  "ok": true,
  "user": {
    "id": "admin-uuid",
    "email": "admin@surveylauncher.aiims",
    "role": "SYSTEM_ADMIN",
    "fullName": "Admin User"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Project Access with Authorization

```bash
# List Projects (requires authentication)
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <token>"

# Create Project (requires PROJECTS.CREATE permission)
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "National Health Survey 2024",
    "abbreviation": "NHS2024",
    "contactPersonDetails": "Dr. John Doe",
    "status": "ACTIVE",
    "geographicScope": "NATIONAL"
  }'

# Response
{
  "ok": true,
  "project": {
    "id": "proj-uuid-123",
    "title": "National Health Survey 2024",
    "abbreviation": "NHS2024",
    "status": "ACTIVE",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### 3. Permission Enforcement

```bash
# Access Denied - No Permission
curl -X DELETE http://localhost:3000/api/v1/projects/proj-uuid-123 \
  -H "Authorization: Bearer <team-member-token>"

# Response
{
  "ok": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions to DELETE PROJECTS",
    "request_id": "req-uuid-456"
  }
}
```

## 📋 Role Assignment Examples

### 1. User Role Assignment via Database

```sql
-- Assign TEAM_MEMBER role to user
INSERT INTO user_role_assignments (
  id, user_id, role_id, team_id, project_id,
  granted_by, granted_at, expires_at, is_active
) VALUES (
  'assignment-uuid',
  'user-uuid-123',
  (SELECT id FROM roles WHERE name = 'TEAM_MEMBER'),
  'team-uuid-456',
  'project-uuid-789',
  'admin-uuid',
  NOW(),
  NULL,
  true
);
```

### 2. Project-Specific Permissions

```bash
# Assign user to project with specific role
curl -X POST http://localhost:3000/api/v1/projects/proj-uuid-123/members \
  -H "Authorization: Bearer <manager-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-123",
    "role": "TEAM_MEMBER"
  }'

# Response
{
  "ok": true,
  "message": "User assigned to project successfully"
}
```

## 🎯 Real-World Scenarios

### Scenario 1: Field Supervisor Managing Devices

**User**: Sarah Chen (FIELD_SUPERVISOR)

```bash
# Can view all devices in her region
curl -X GET http://localhost:3000/api/v1/devices

# Can create new devices for field operations
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Authorization: Bearer <sarah-token>" \
  -d '{
    "name": "Field Tablet 001",
    "androidId": "android-123",
    "teamId": "team-field-ops"
  }'

# Cannot delete system settings (permission denied)
curl -X DELETE http://localhost:3000/api/v1/system-settings/config
# Returns 403 Forbidden
```

### Scenario 2: System Administrator Full Access

**User**: Alex Kumar (SYSTEM_ADMIN)

```bash
# Full system access
curl -X GET http://localhost:3000/api/v1/projects  # All projects
curl -X POST http://localhost:3000/api/v1/users     # Create users
curl -X POST http://localhost:3000/api/v1/teams     # Create teams
curl -X POST http://localhost:3000/api/v1/roles     # Manage roles
curl -X GET http://localhost:3000/api/v1/audit     # View audit logs

# Response shows all resources with full access
```

### Scenario 3: Team Member Limited Access

**User**: Maria Garcia (TEAM_MEMBER)

```bash
# Can view her projects and devices
curl -X GET http://localhost:3000/api/v1/projects/my
curl -X GET http://localhost:3000/api/v1/devices

# Cannot create new projects (permission denied)
curl -X POST http://localhost:3000/api/v1/projects \
  -d '{"title": "Unauthorized Project"}'
# Returns 403 Forbidden

# Can view telemetry data for assigned devices
curl -X GET http://localhost:3000/api/v1/telemetry
```

## 🔍 Authorization Flow

### 1. Authentication
```typescript
// JWT Token Validation
const token = req.headers.authorization?.replace('Bearer ', '');
const decoded = JWTUtils.verifyAccessToken(token);

if (!decoded.success || !decoded.payload.userId) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

### 2. Permission Check
```typescript
// Permission Middleware
const permissionResult = await AuthorizationService.checkPermission(
  req.user.id,
  'PROJECTS',    // Resource
  'CREATE',     // Action
  {
    teamId: req.user.teamId,
    projectId: req.params.projectId,
    requestId: req.headers['x-request-id']
  }
);

if (!permissionResult.allowed) {
  return res.status(403).json({
    error: 'INSUFFICIENT_PERMISSIONS',
    message: permissionResult.reason
  });
}
```

### 3. Audit Logging
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "userId": "user-uuid-123",
  "resource": "PROJECTS",
  "action": "CREATE",
  "allowed": true,
  "grantedBy": ["role-uuid-456"],
  "evaluationTime": 15,
  "requestId": "req-uuid-789"
}
```

## 📊 Performance Features

### Permission Caching
- **Cache Duration**: 15 minutes for active permissions
- **Cache Invalidation**: Automatic on role changes
- **Performance**: Sub-millisecond permission checks after cache warm

### Audit Trail
- **All Access Attempts**: Logged with full context
- **Decision Reason**: Clear explanation for allow/deny decisions
- **Performance Metrics**: Track slow permission evaluations
- **Security Monitoring**: Detect unusual access patterns

## 🚀 Integration Examples

### Frontend Integration

```typescript
// React Component with Permission Check
import { hasPermission } from '../lib/permissions';

function ProjectActions({ project, userRole }) {
  const canEdit = hasPermission(userRole, 'PROJECTS', 'UPDATE');
  const canDelete = hasPermission(userRole, 'PROJECTS', 'DELETE');

  return (
    <div>
      {canEdit && (
        <button onClick={() => editProject(project.id)}>
          Edit Project
        </button>
      )}
      {canDelete && (
        <button onClick={() => deleteProject(project.id)}>
          Delete Project
        </button>
      )}
    </div>
  );
}
```

### Mobile App Integration

```typescript
// Android App Permission Check
const checkProjectAccess = async (projectId: string, userId: string) => {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${await getAuthToken()}`
    }
  });

  return response.ok;
};
```

## 📚 Key Concepts

1. **Hierarchical Roles**: Each level inherits permissions from lower levels
2. **Granular Permissions**: 29 permissions across 9 roles for precise access control
3. **Context-Aware**: Permissions consider team, project, and geographic scope
4. **Audit-Ready**: All access decisions logged for compliance
5. **Performance Optimized**: Caching and database indexes for fast lookups
6. **Fail-Secure**: Default deny access, explicit grant required

## 🔧 Configuration

### Environment Variables
```env
# Role and Permission System
RBAC_ENABLED=true
PERMISSION_CACHE_TTL=900000  # 15 minutes
AUDIT_LOG_LEVEL=INFO
```

### Database Migration
```bash
# Generate and run migrations
npm run db:generate
npm run db:migrate

# Seed default roles and permissions
npm run db:seed-default-roles
```

## 📊 Role Hierarchy Overview

### 🏗️ Hierarchical Structure

```
SYSTEM_ADMIN (Level 9)
├── NATIONAL_SUPPORT_ADMIN (Level 8)
├── REGIONAL_MANAGER (Level 7)
├── DEVICE_MANAGER (Level 6)
├── POLICY_ADMIN (Level 5)
├── AUDITOR (Level 4)
├── FIELD_SUPERVISOR (Level 3)
└── TEAM_MEMBER (Level 1)
```

### 📈 Role Breakdown by Level

#### **Level 9: SYSTEM_ADMIN** 👑
- **Access**: Full system control
- **Scope**: All resources, all organizations
- **Special**: System settings, organization management

#### **Level 8: NATIONAL_SUPPORT_ADMIN** 🌍
- **Access**: Cross-regional operational support
- **Scope**: All teams, all regions (except system settings)
- **Special**: National-level oversight and support

#### **Level 7: REGIONAL_MANAGER** 🏢
- **Access**: Multi-team regional management
- **Scope**: All teams and projects within region
- **Special**: Organization updates, cross-team access

#### **Level 6: DEVICE_MANAGER** 📱
- **Access**: Full device lifecycle management
- **Scope**: All devices, telemetry, and technical support
- **Special**: Device provisioning, monitoring, troubleshooting

#### **Level 5: POLICY_ADMIN** 📋
- **Access**: Complete policy management
- **Scope**: All policies and compliance rules
- **Special**: Policy creation, updates, enforcement

#### **Level 4: AUDITOR** 🔍
- **Access**: Read-only audit and compliance
- **Scope**: All resources (read-only)
- **Special**: Compliance monitoring, audit trails

#### **Level 3: FIELD_SUPERVISOR** 👥
- **Access**: On-site team and device management
- **Scope**: Assigned teams and their devices
- **Special**: Supervisor override capabilities

#### **Level 1: TEAM_MEMBER** 🔧
- **Access**: Basic operational access
- **Scope**: Personal assignments and team data
- **Special**: Survey execution, data collection

### 🔐 Permission Inheritance

**Higher levels inherit all permissions from lower levels + additional capabilities:**

- **SYSTEM_ADMIN** = All permissions from all roles + system settings
- **REGIONAL_MANAGER** = All Field Supervisor permissions + team/user management
- **FIELD_SUPERVISOR** = All Team Member permissions + device/user management
- **TEAM_MEMBER** = Base operational permissions

### 🎯 Specialized Roles

Some roles have **specialized focus** rather than hierarchical progression:

- **SUPPORT_AGENT** (Level implied: ~2-3) - User support focus
- **AUDITOR** (Level 4) - Read-only compliance focus
- **DEVICE_MANAGER** (Level 6) - Technical device focus
- **POLICY_ADMIN** (Level 5) - Policy management focus

### 📈 Access Progression

```
Basic Operations → Team Management → Regional Oversight → National Support → System Administration
     ↓                    ↓                  ↓                  ↓                    ↓
TEAM_MEMBER → FIELD_SUPERVISOR → REGIONAL_MANAGER → NATIONAL_SUPPORT_ADMIN → SYSTEM_ADMIN
```

The hierarchy ensures **principle of least privilege** - users only get access needed for their specific responsibilities, with clear escalation paths for broader organizational needs.

## 🚀 Step-by-Step Setup Guide

This section provides a comprehensive guide for system administrators to set up projects, teams, users, and assign roles in the SurveyLauncher system.

### Step 1: System Initialization

#### 1.1 Database Setup and Role Seeding

```bash
# 1. Run database migrations
npm run db:migrate

# 2. Seed default roles and permissions
npm run db:seed-default-roles seed

# 3. Verify role configuration
npm run db:seed-default-roles verify
```

Expected output:
```
✅ Default roles seeding completed successfully!
📊 Summary:
  - Roles created: 9
  - Permissions created: 29
  - Role-permission assignments: 89
```

#### 1.2 Create System Administrator Account

```bash
# Connect to database
psql postgresql://laucnher_db_user:ieru7Eikfaef1Liueo9ix4Gi@127.0.0.1:5434/launcher

# Create system admin user
INSERT INTO users (
  id, email, full_name, role, is_active,
  email_verified, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'admin@surveylauncher.aiims',
  'System Administrator',
  'SYSTEM_ADMIN',
  true,
  true,
  NOW(),
  NOW()
);
```

### Step 2: Organizational Structure Setup

#### 2.1 Create Organization

```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AIIMS National Health Survey",
    "code": "AIIMS_NHS",
    "description": "National health survey organization",
    "settings": {
      "maxUsersPerTeam": 50,
      "sessionTimeoutHours": 8,
      "gpsRequired": true
    }
  }'
```

Response:
```json
{
  "ok": true,
  "organization": {
    "id": "org-uuid-123",
    "name": "AIIMS National Health Survey",
    "code": "AIIMS_NHS",
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### 2.2 Create Teams

```bash
# Create regional teams
curl -X POST http://localhost:3000/api/v1/teams \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delhi Field Operations",
    "code": "DELHI_FO",
    "region": "DELHI",
    "organizationId": "org-uuid-123",
    "supervisorUserId": "supervisor-uuid-456"
  }'

curl -X POST http://localhost:3000/api/v1/teams \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mumbai Field Operations",
    "code": "MUMBAI_FO",
    "region": "MAHARASHTRA",
    "organizationId": "org-uuid-123",
    "supervisorUserId": "supervisor-uuid-789"
  }'
```

### Step 3: Create Projects

#### 3.1 Create National Survey Project

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "National Health Survey 2024",
    "abbreviation": "NHS2024",
    "description": "Comprehensive national health assessment",
    "contactPersonDetails": "Dr. Sarah Kumar",
    "contactEmail": "sarah.kumar@aiims.edu",
    "contactPhone": "+91-11-1234-5678",
    "status": "ACTIVE",
    "startDate": "2025-02-01",
    "endDate": "2025-12-31",
    "geographicScope": "NATIONAL",
    "organizationId": "org-uuid-123",
    "settings": {
      "gpsRequired": true,
      "minGpsAccuracy": 50,
      "heartbeatInterval": 10,
      "sessionTimeout": 8
    }
  }'
```

#### 3.2 Create Regional Projects

```bash
# Delhi-specific project
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <regional-manager-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Delhi Urban Health Assessment",
    "abbreviation": "DUHA2024",
    "description": "Urban health survey for Delhi region",
    "contactPersonDetails": "Dr. Rajesh Singh",
    "status": "ACTIVE",
    "startDate": "2025-03-01",
    "endDate": "2025-08-31",
    "geographicScope": "REGIONAL",
    "organizationId": "org-uuid-123",
    "parentProjectId": "national-project-uuid"
  }'
```

### Step 4: Create and Assign Users

#### 4.1 Create Field Supervisor

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.chen@surveylauncher.aiims",
    "fullName": "Sarah Chen",
    "role": "FIELD_SUPERVISOR",
    "teamId": "delhi-team-uuid",
    "phone": "+91-98765-43210",
    "isActive": true
  }'
```

Response:
```json
{
  "ok": true,
  "user": {
    "id": "user-uuid-456",
    "email": "sarah.chen@surveylauncher.aiims",
    "fullName": "Sarah Chen",
    "role": "FIELD_SUPERVISOR",
    "teamId": "delhi-team-uuid",
    "isActive": true,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

#### 4.2 Create Team Members

```bash
# Create multiple team members for Delhi team
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <supervisor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.garcia@surveylauncher.aiims",
    "fullName": "Maria Garcia",
    "role": "TEAM_MEMBER",
    "teamId": "delhi-team-uuid",
    "phone": "+91-98765-43211",
    "isActive": true
  }'

curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <supervisor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed.khan@surveylauncher.aiims",
    "fullName": "Ahmed Khan",
    "role": "TEAM_MEMBER",
    "teamId": "delhi-team-uuid",
    "phone": "+91-98765-43212",
    "isActive": true
  }'
```

#### 4.3 Create Device Manager

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tech.support@surveylauncher.aiims",
    "fullName": "Technical Support Team",
    "role": "DEVICE_MANAGER",
    "teamId": "tech-team-uuid",
    "phone": "+91-11-2345-6789",
    "isActive": true
  }'
```

### Step 5: Assign Users to Projects

#### 5.1 Assign Team Members to Projects

```bash
# Assign team member to national project
curl -X POST http://localhost:3000/api/v1/projects/national-project-uuid/members \
  -H "Authorization: Bearer <manager-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "maria-uuid-789",
    "role": "TEAM_MEMBER",
    "assignedAt": "2025-01-15T11:00:00Z"
  }'

# Assign supervisor to multiple projects
curl -X POST http://localhost:3000/api/v1/projects/national-project-uuid/members \
  -H "Authorization: Bearer <manager-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "sarah-uuid-456",
    "role": "FIELD_SUPERVISOR",
    "assignedAt": "2025-01-15T11:00:00Z"
  }'
```

#### 5.2 Bulk Assignment for Team

```bash
curl -X POST http://localhost:3000/api/v1/projects/regional-project-uuid/members/bulk \
  -H "Authorization: Bearer <supervisor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assignments": [
      {
        "userId": "maria-uuid-789",
        "role": "TEAM_MEMBER"
      },
      {
        "userId": "ahmed-uuid-790",
        "role": "TEAM_MEMBER"
      }
    ]
  }'
```

### Step 6: Device Setup and Assignment

#### 6.1 Register Android Devices

```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Authorization: Bearer <device-manager-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delhi Field Tablet 001",
    "androidId": "android_12345abcdef",
    "teamId": "delhi-team-uuid",
    "assignedUserId": "maria-uuid-789",
    "model": "Samsung Galaxy Tab A8",
    "osVersion": "Android 13",
    "appVersion": "1.0.0",
    "status": "ACTIVE"
  }'
```

#### 6.2 Configure Device Policies

```bash
curl -X POST http://localhost:3000/api/v1/devices/device-uuid-123/policy \
  -H "Authorization: Bearer <policy-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "gpsSettings": {
      "required": true,
      "minAccuracy": 50,
      "collectionInterval": 3
    },
    "timeWindows": [
      {
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "startTime": "08:00",
        "endTime": "19:30"
      },
      {
        "days": ["Sat"],
        "startTime": "09:00",
        "endTime": "15:00"
      }
    ],
    "supervisorOverride": {
      "enabled": true,
      "maxDurationMinutes": 120
    }
  }'
```

### Step 7: Verify Setup

#### 7.1 Verify Team Structure

```bash
# List all teams
curl -X GET http://localhost:3000/api/v1/teams \
  -H "Authorization: Bearer <admin-token>"

# View team members
curl -X GET http://localhost:3000/api/v1/teams/delhi-team-uuid/members \
  -H "Authorization: Bearer <supervisor-token>"

# View team devices
curl -X GET http://localhost:3000/api/v1/teams/delhi-team-uuid/devices \
  -H "Authorization: Bearer <supervisor-token>"
```

#### 7.2 Verify User Permissions

```bash
# Check current user permissions
curl -X GET http://localhost:3000/api/v1/auth/whoami \
  -H "Authorization: Bearer <user-token>"

# Test specific permissions
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <team-member-token>"

# Attempt restricted operation (should fail)
curl -X DELETE http://localhost:3000/api/v1/projects/project-uuid \
  -H "Authorization: Bearer <team-member-token>"
# Expected: 403 Forbidden
```

#### 7.3 Database Verification

```sql
-- Verify organizational structure
SELECT
  o.name as organization,
  t.name as team,
  u.full_name as user_name,
  u.role as user_role,
  COUNT(d.id) as device_count
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id
LEFT JOIN users u ON u.team_id = t.id
LEFT JOIN devices d ON d.assigned_user_id = u.id
GROUP BY o.id, t.id, u.id
ORDER BY o.name, t.name, u.full_name;

-- Verify project assignments
SELECT
  p.title as project,
  u.full_name as user_name,
  u.role as user_role,
  pm.assigned_at,
  pm.is_active
FROM projects p
JOIN project_members pm ON pm.project_id = p.id
JOIN users u ON pm.user_id = u.id
WHERE p.is_active = true
ORDER BY p.title, u.full_name;
```

### Step 8: User Access Testing

#### 8.1 Test System Administrator Access

```bash
# Login as system admin
curl -X POST http://localhost:3000/api/v1/web-admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@surveylauncher.aiims",
    "password": "admin123456"
  }'

# Test full system access
curl -X GET http://localhost:3000/api/v1/users
curl -X GET http://localhost:3000/api/v1/teams
curl -X GET http://localhost:3000/api/v1/projects
curl -X GET http://localhost:3000/api/v1/devices
curl -X GET http://localhost:3000/api/v1/audit-logs
```

#### 8.2 Test Regional Manager Access

```bash
# Login as regional manager
curl -X POST http://localhost:3000/api/v1/web-admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "delhi.manager@surveylauncher.aiims",
    "password": "manager123456"
  }'

# Test regional access
curl -X GET http://localhost:3000/api/v1/teams/region/DELHI
curl -X GET http://localhost:3000/api/v1/projects/region/DELHI
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "New Team Member",
    "role": "TEAM_MEMBER",
    "teamId": "delhi-team-uuid"
  }'
```

#### 8.3 Test Field Supervisor Access

```bash
# Test device management
curl -X GET http://localhost:3000/api/v1/devices/team/delhi-team-uuid
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Field Tablet",
    "androidId": "android_new_device",
    "teamId": "delhi-team-uuid"
  }'

# Test team member management
curl -X GET http://localhost:3000/api/v1/users/team/delhi-team-uuid
curl -X PUT http://localhost:3000/api/v1/users/maria-uuid-789 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+91-98765-54321"
  }'
```

#### 8.4 Test Team Member Access

```bash
# Test limited access
curl -X GET http://localhost:3000/api/v1/projects/my
curl -X GET http://localhost:3000/api/v1/devices/assigned
curl -X GET http://localhost:3000/api/v1/teams/my

# Attempt restricted operations (should fail)
curl -X POST http://localhost:3000/api/v1/projects
curl -X DELETE http://localhost:3000/api/v1/devices/device-uuid
# Expected: 403 Forbidden for all
```

### 📋 Setup Checklist

#### ✅ System Configuration
- [ ] Database migrated and roles seeded
- [ ] System administrator account created
- [ ] Organization registered
- [ ] Security policies configured

#### ✅ Organizational Structure
- [ ] Regional teams created
- [ ] Team supervisors assigned
- [ ] Team members created and assigned to teams
- [ ] Team hierarchy verified

#### ✅ Project Management
- [ ] National project created
- [ ] Regional projects established
- [ ] Users assigned to appropriate projects
- [ ] Project permissions verified

#### ✅ Device Management
- [ ] Android devices registered
- [ ] Device policies configured
- [ ] Device-user assignments completed
- [ ] Device access tested

#### ✅ Access Verification
- [ ] All user roles can login successfully
- [ ] Permissions working correctly for each role
- [ ] Restricted operations properly blocked
- [ ] Audit logs capturing all access attempts

This comprehensive setup guide ensures a properly configured SurveyLauncher system with clear role separation, appropriate access controls, and verified functionality across all user levels.

This RBAC system provides enterprise-grade access control while maintaining flexibility for the diverse needs of survey project management across different organizational levels and geographic scopes.