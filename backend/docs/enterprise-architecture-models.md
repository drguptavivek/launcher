# SurveyLauncher Enterprise Architecture Models

**Last Updated:** November 17, 2025
**Version:** 1.0
**Purpose:** Complete ERD reference for developers with exact field names and relationships

---

## Overview

This document provides the complete database schema reference for the SurveyLauncher Enterprise Architecture, including exact field names, data types, constraints, and relationships. All field names and types match the implementation in `backend/src/lib/db/schema.ts`.

---

## Enterprise ERD Diagram

Complete Schema Reference

### 1. Core Entities

#### ORGANIZATIONS Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  display_name VARCHAR(250) NOT NULL,
  description TEXT,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  settings JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organization_name ON organizations(name);
CREATE INDEX idx_organization_code ON organizations(code);
CREATE INDEX idx_organization_active ON organizations(is_active);
```

#### TEAMS Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  state_id VARCHAR(16) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_team_name ON teams(name);
CREATE INDEX idx_team_organization_id ON teams(organization_id);
```

#### USERS Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'TEAM_MEMBER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_code ON users(code);
CREATE INDEX idx_user_team_id ON users(team_id);
```

#### DEVICES Table
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  android_id VARCHAR(64),
  app_version VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  last_gps_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_device_android_id ON devices(android_id);
CREATE INDEX idx_device_team_id ON devices(team_id);
```

### 2. Authentication & Security

#### USER_PINS Table
```sql
CREATE TABLE user_pins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pin_hash VARCHAR(255) NOT NULL, -- Argon2id hash
  salt VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rotated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### SUPERVISOR_PINS Table
```sql
CREATE TABLE supervisor_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL, -- Argon2id hash
  salt VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rotated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_supervisor_pin_team_id ON supervisor_pins(team_id);
```

#### WEB_ADMIN_USERS Table
```sql
CREATE TABLE web_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- Argon2id hash
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'SYSTEM_ADMIN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_at TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_web_admin_email ON web_admin_users(email);
CREATE INDEX idx_web_admin_role ON web_admin_users(role);
```

#### SESSIONS Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(16) NOT NULL DEFAULT 'open', -- open, expired, ended
  override_until TIMESTAMP WITH TIME ZONE,
  token_jti VARCHAR(64),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent VARCHAR(255)
);

-- Indexes
CREATE INDEX idx_session_user_id ON sessions(user_id);
CREATE INDEX idx_session_device_id ON sessions(device_id);
CREATE INDEX idx_session_token_jti ON sessions(token_jti);
```

#### PIN_ATTEMPTS Table
```sql
CREATE TABLE pin_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  attempt_type VARCHAR(16) NOT NULL, -- 'user_pin', 'supervisor_pin'
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pin_attempt_user_id ON pin_attempts(user_id);
CREATE INDEX idx_pin_attempt_device_id ON pin_attempts(device_id);
CREATE INDEX idx_pin_attempt_type ON pin_attempts(attempt_type);
```

### 3. RBAC System

#### ROLES Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_role_name ON roles(name);
```

#### PERMISSIONS Table
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL DEFAULT 'TEAM',
  description TEXT,
  conditions JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_permission_resource_action ON permissions(resource, action);
CREATE INDEX idx_permission_name ON permissions(name);
```

#### ROLE_PERMISSIONS Table
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX idx_role_permission_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permission_permission_id ON role_permissions(permission_id);
```

#### USER_ROLE_ASSIGNMENTS Table
```sql
CREATE TABLE user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  region_id VARCHAR(32),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  context JSONB
);

-- Indexes
CREATE INDEX idx_user_role_assignment_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignment_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignment_team_id ON user_role_assignments(team_id);
CREATE INDEX idx_user_role_assignment_organization_id ON user_role_assignments(organization_id);
```

#### PERMISSION_CACHE Table
```sql
CREATE TABLE permission_cache (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  effective_permissions JSONB NOT NULL,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_permission_cache_user_id ON permission_cache(user_id);
CREATE INDEX idx_permission_cache_expires_at ON permission_cache(expires_at);
```

### 4. Project Management

#### PROJECTS Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(50) NOT NULL UNIQUE,
  contact_person_details TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  geographic_scope VARCHAR(50) NOT NULL DEFAULT 'NATIONAL',
  region_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_project_abbreviation ON projects(abbreviation);
CREATE INDEX idx_project_status ON projects(status);
CREATE INDEX idx_project_organization_id ON projects(organization_id);
CREATE INDEX idx_project_created_by ON projects(created_by);
```

#### PROJECT_ASSIGNMENTS Table
```sql
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  role_in_project VARCHAR(100),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_until TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_project_assignment_unique ON project_assignments(project_id, user_id);
CREATE INDEX idx_project_assignment_project ON project_assignments(project_id);
CREATE INDEX idx_project_assignment_user ON project_assignments(user_id);
CREATE INDEX idx_project_assignment_active ON project_assignments(is_active);
```

#### PROJECT_TEAM_ASSIGNMENTS Table
```sql
CREATE TABLE project_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_role VARCHAR(100),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_until TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_project_team_assignment_unique ON project_team_assignments(project_id, team_id);
CREATE INDEX idx_project_team_assignment_project ON project_team_assignments(project_id);
CREATE INDEX idx_project_team_assignment_team ON project_team_assignments(team_id);
CREATE INDEX idx_project_team_assignment_active ON project_team_assignments(is_active);
```

### 5. Operations & Telemetry

#### TELEMETRY_EVENTS Table
```sql
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(32) NOT NULL, -- gps, heartbeat, gate.blocked, pin.verify
  event_data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_telemetry_device_id ON telemetry_events(device_id);
CREATE INDEX idx_telemetry_session_id ON telemetry_events(session_id);
CREATE INDEX idx_telemetry_event_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_timestamp ON telemetry_events(timestamp);
```

#### POLICY_ISSUES Table
```sql
CREATE TABLE policy_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  version VARCHAR(16) NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  jws_kid VARCHAR(64) NOT NULL,
  policy_data JSONB NOT NULL,
  ip_address VARCHAR(45)
);

-- Indexes
CREATE INDEX idx_policy_issue_device_id ON policy_issues(device_id);
CREATE INDEX idx_policy_issue_expires_at ON policy_issues(expires_at);
```

#### JWT_REVOCATIONS Table
```sql
CREATE TABLE jwt_revocations (
  jti VARCHAR(64) PRIMARY KEY,
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason VARCHAR(64),
  revoked_by VARCHAR(255)
);

-- Indexes
CREATE INDEX idx_jwt_revocation_jti ON jwt_revocations(jti);
CREATE INDEX idx_jwt_revocation_expires_at ON jwt_revocations(expires_at);
```

---

## Enums Reference

### User Role Enum
```sql
CREATE TYPE user_role AS ENUM (
  -- Field Operations Roles
  'TEAM_MEMBER',
  'FIELD_SUPERVISOR',
  'REGIONAL_MANAGER',

  -- Technical Operations Roles
  'SYSTEM_ADMIN',
  'SUPPORT_AGENT',
  'AUDITOR',

  -- Specialized Roles
  'DEVICE_MANAGER',
  'POLICY_ADMIN',
  'NATIONAL_SUPPORT_ADMIN'
);
```

### Permission Scope Enum
```sql
CREATE TYPE permission_scope AS ENUM (
  'ORGANIZATION', -- Full organizational access
  'REGION',      -- Multi-team regional access
  'TEAM',        -- Single team access
  'USER',        -- Personal access only
  'SYSTEM'       -- System-level configuration access
);
```

### Permission Action Enum
```sql
CREATE TYPE permission_action AS ENUM (
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LIST',
  'MANAGE',     -- Full control including permissions
  'EXECUTE',    -- Execute operations (e.g., overrides)
  'AUDIT'       -- Read-only audit access
);
```

### Resource Type Enum
```sql
CREATE TYPE resource_type AS ENUM (
  'TEAMS',
  'USERS',
  'DEVICES',
  'SUPERVISOR_PINS',
  'TELEMETRY',
  'POLICY',
  'AUTH',
  'SYSTEM_SETTINGS',
  'AUDIT_LOGS',
  'SUPPORT_TICKETS',
  'ORGANIZATION',
  'PROJECTS'
);
```

### Project Status Enum
```sql
CREATE TYPE project_status AS ENUM (
  'ACTIVE',
  'INACTIVE'
);
```

### Project Geographic Scope Enum
```sql
CREATE TYPE project_geographic_scope AS ENUM (
  'NATIONAL',
  'REGIONAL'
);
```

---

## Key Relationship Patterns

### 1. Organization Hierarchy
- **organizations** → **teams** (1:N)
- **organizations** → **projects** (1:N)
- **organizations** → **user_role_assignments** (1:N)

### 2. Team Structure
- **teams** → **users** (1:N)
- **teams** → **devices** (1:N)
- **teams** → **supervisor_pins** (1:N)

### 3. User Management
- **users** → **user_pins** (1:1)
- **users** → **sessions** (1:N)
- **users** → **user_role_assignments** (1:N)
- **users** → **project_assignments** (1:N)

### 4. Project Management
- **projects** → **project_assignments** (1:N)
- **projects** → **project_team_assignments** (1:N)
- **projects** → **teams** (regional projects only)

### 5. RBAC System
- **roles** → **role_permissions** (1:N)
- **users** → **user_role_assignments** (1:N)
- **permissions** → **role_permissions** (1:N)

### 6. Device Operations
- **devices** → **sessions** (1:N)
- **devices** → **telemetry_events** (1:N)
- **devices** → **policy_issues** (1:N)

---

## Field Naming Conventions

### Primary Keys
- Always `id` (UUID)
- Exception: `jwt_revocations.jti` (VARCHAR)

### Foreign Keys
- Pattern: `{table_name}_id`
- Example: `team_id`, `user_id`, `organization_id`

### Timestamps
- `created_at` - Record creation time
- `updated_at` - Last modification time
- `*_at` - Event-specific timestamps

### Boolean Fields
- Prefix with `is_` for state fields
- Example: `is_active`, `is_default`, `is_system_role`

### JSON Fields
- Use `jsonb` type for structured data
- Store settings, metadata, event data

---

## Performance Indexes

### Critical Query Patterns
1. **User Authentication**: `users.code`, `user_pins.user_id`
2. **Device Management**: `devices.android_id`, `devices.team_id`
3. **Session Management**: `sessions.user_id`, `sessions.device_id`, `sessions.token_jti`
4. **Telemetry Processing**: `telemetry_events.device_id`, `telemetry_events.timestamp`
5. **Project Access**: `project_assignments.user_id`, `project_assignments.project_id`
6. **Permission Resolution**: `user_role_assignments.user_id`, `role_permissions.role_id`

### Compound Indexes
- `project_assignments(project_id, user_id)` - Unique assignment constraint
- `project_team_assignments(project_id, team_id)` - Unique team assignment
- `telemetry_events(device_id, timestamp)` - Time-series queries
- `sessions(user_id, started_at)` - User session history

---

## Usage Examples for Developers

### Field Reference in Code
```typescript
// Correct field names from schema
const user = {
  id: 'uuid',
  code: 'userCode',           // NOT user_code
  teamId: 'teamUuid',         // NOT team_id
  displayName: 'Full Name',   // NOT display_name
  role: 'TEAM_MEMBER',
  isActive: true              // NOT is_active
};

const session = {
  userId: 'userUuid',         // NOT user_id
  teamId: 'teamUuid',         // NOT team_id
  deviceId: 'deviceUuid',     // NOT device_id
  startedAt: new Date(),      // NOT started_at
  expiresAt: new Date(),      // NOT expires_at
  tokenJti: 'token-id'        // NOT token_jti
};
```

### Relationship Queries
```typescript
// Get user with team and organization
const userWithTeam = await db
  .select()
  .from(users)
  .leftJoin(teams, eq(users.teamId, teams.id))
  .leftJoin(organizations, eq(teams.organizationId, organizations.id))
  .where(eq(users.id, userId));

// Get project assignments for user
const userProjects = await db
  .select({
    project: projects,
    assignment: projectAssignments
  })
  .from(projectAssignments)
  .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
  .where(
    and(
      eq(projectAssignments.userId, userId),
      eq(projectAssignments.isActive, true)
    )
  );
```

---

## Migration & Versioning

### Schema Version Control
- All timestamp fields use `WITH TIME ZONE`
- UUID primary keys with `DEFAULT gen_random_uuid()`
- Proper CASCADE/SET NULL for foreign key constraints
- Soft delete support via `deleted_at` fields where needed

### Data Integrity
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate data
- Check constraints validate enum values
- Not null constraints ensure required data
