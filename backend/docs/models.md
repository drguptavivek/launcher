# SurveyLauncher Backend – Data Models (PostgreSQL)

This document summarizes the PostgreSQL schema that backs SurveyLauncher, listing each table's columns, PostgreSQL data types, constraints/defaults, indexes, and cascade behavior. It references the `src/lib/db/schema.ts` Drizzle schema for the definitive definitions used by the application.

## Enum Types

### Role-Based Access Control (RBAC) Enums
- `user_role` (`TEXT` enum): values `TEAM_MEMBER`, `FIELD_SUPERVISOR`, `REGIONAL_MANAGER`, `SYSTEM_ADMIN`, `SUPPORT_AGENT`, `AUDITOR`, `DEVICE_MANAGER`, `POLICY_ADMIN`, `NATIONAL_SUPPORT_ADMIN`. Used by `users.role` and `web_admin_users.role` with default `TEAM_MEMBER`.
- `permission_scope` (`TEXT` enum): values `ORGANIZATION`, `REGION`, `TEAM`, `USER`, `SYSTEM`. Used by `permissions.scope` with default `TEAM`.
- `permission_action` (`TEXT` enum): values `CREATE`, `READ`, `UPDATE`, `DELETE`, `LIST`, `MANAGE`, `EXECUTE`, `AUDIT`. Used by `permissions.action`.
- `resource_type` (`TEXT` enum): values `TEAMS`, `USERS`, `DEVICES`, `SUPERVISOR_PINS`, `TELEMETRY`, `POLICY`, `AUTH`, `SYSTEM_SETTINGS`, `AUDIT_LOGS`, `SUPPORT_TICKETS`, `ORGANIZATION`, `PROJECTS`. Used by `permissions.resource`.

### Project Management Enums
- `project_status` (`TEXT` enum): values `ACTIVE`, `INACTIVE`. Used by `projects.status` with default `ACTIVE`.
- `project_geographic_scope` (`TEXT` enum): values `NATIONAL`, `REGIONAL`. Used by `projects.geographic_scope` with default `NATIONAL`.

## Core Tables

### organizations
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `name` | `varchar(200)` | `NOT NULL` | Organization name. Indexed by `nameIdx`. |
| `display_name` | `varchar(250)` | `NOT NULL` | Human-readable display name. |
| `description` | `text` | nullable | Detailed description. |
| `code` | `varchar(50)` | `NOT NULL`, `UNIQUE` | Unique identifier. Indexed by `codeIdx`. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Active status. Indexed by `activeIdx`. |
| `is_default` | `boolean` | `NOT NULL`, default `false` | Default organization for fallback. |
| `settings` | `jsonb` | nullable | Organization-specific settings. |
| `metadata` | `jsonb` | nullable | Additional metadata. |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |

**Cascade behavior**: Organization deletion cascades to `teams`, `users`, `projects`, and all related data.

### teams
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `name` | `varchar(255)` | `NOT NULL` | Team name. Indexed by `nameIdx`. |
| `timezone` | `varchar(50)` | `NOT NULL`, default `UTC` | Team timezone for scheduling. |
| `state_id` | `varchar(16)` | `NOT NULL` | State/region identifier. |
| `organization_id` | `uuid` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | Multi-tenant support. Indexed by `organizationIdIdx`. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Active status. |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |

**Cascade behavior**: Team deletion cascades to `devices`, `users`, `supervisor_pins`, `sessions`, and all related data.

### devices
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | Indexed by `teamIdIdx`. |
| `name` | `varchar(255)` | `NOT NULL` | Device display name. |
| `android_id` | `varchar(64)` | nullable | Unique Android device ID. Indexed by `androidIdIdx`. |
| `app_version` | `varchar(32)` | nullable | Installed app version. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Device active status. |
| `last_seen_at`, `last_gps_at` | `timestamptz` | nullable | Last activity timestamps. |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |

**Cascade behavior**: Device deletion cascades to `sessions`, `telemetry_events`, `policy_issues`, and `pin_attempts`.

### users
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `code` | `varchar(32)` | `NOT NULL` | Login code. Indexed by `userCodeIdx`. |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | Indexed by `teamIdIdx`. |
| `display_name` | `varchar(255)` | `NOT NULL` | User display name. |
| `email` | `varchar(255)` | nullable | Optional email contact. |
| `role` | `user_role` enum | `NOT NULL`, default `TEAM_MEMBER` | RBAC role assignment. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | User active status. |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |

**Cascade behavior**: User deletion cascades to `user_pins`, `user_role_assignments`, `sessions`, `pin_attempts`.

### user_pins
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `user_id` | `uuid` | `PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE` | |
| `pin_hash`, `salt` | `varchar(255)` | `NOT NULL` | Argon2id credentials. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | PIN active status. |
| `rotated_at`, `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | Rotation timestamps. |

**Cascade behavior**: Owned by `users`, no downstream children.

### supervisor_pins
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | Indexed by `teamIdIdx`. |
| `name` | `varchar(255)` | `NOT NULL` | Supervisor PIN identifier. |
| `pin_hash`, `salt` | `varchar(255)` | `NOT NULL` | Argon2id credentials. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | PIN active status. |
| `rotated_at`, `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |

**Cascade behavior**: Team deletion removes supervisor PINs.

### web_admin_users
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `email` | `varchar(255)` | `NOT NULL`, `UNIQUE` | Login email. Indexed by `emailIdx`. |
| `password` | `varchar(255)` | `NOT NULL` | Argon2id password hash. |
| `first_name`, `last_name` | `varchar(255)` | `NOT NULL` | User's name. |
| `role` | `user_role` enum | `NOT NULL`, default `SYSTEM_ADMIN` | Admin role. Indexed by `roleIdx`. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Account status. |
| `last_login_at` | `timestamptz` | nullable | Last successful login. |
| `login_attempts` | `integer` | `NOT NULL`, default `0` | Failed login counter. |
| `locked_at` | `timestamptz` | nullable | Account lockout timestamp. |
| `password_changed_at` | `timestamptz` | `NOT NULL`, default `now()` | Password rotation tracking. |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |

**Cascade behavior**: Standalone admin accounts, no cascade dependencies.

### sessions
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | `REFERENCES users(id) ON DELETE CASCADE` | Nullable for system sessions. Indexed by `userIdIdx`. |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | |
| `device_id` | `uuid` | `NOT NULL REFERENCES devices(id) ON DELETE CASCADE` | Indexed by `deviceIdIdx`. |
| `started_at`, `expires_at` | `timestamptz` | `NOT NULL` | Session lifecycle. |
| `ended_at`, `override_until`, `last_activity_at` | `timestamptz` | `last_activity_at` default `now()` | Session state tracking. |
| `status` | `varchar(16)` | `NOT NULL`, default `'open'` | Values: `open`, `expired`, `ended`. |
| `token_jti` | `varchar(64)` | nullable | JWT identifier. Indexed by `tokenJtiIdx`. |

**Cascade behavior**: Session deletion cascades to `telemetry_events` and `pin_attempts`.

### telemetry_events
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `device_id` | `uuid` | `NOT NULL REFERENCES devices(id) ON DELETE CASCADE` | Indexed by `deviceIdIdx`. |
| `session_id` | `uuid` | `REFERENCES sessions(id) ON DELETE CASCADE` | nullable. Indexed by `sessionIdIdx`. |
| `event_type` | `varchar(32)` | `NOT NULL` | GPS, heartbeat, etc. Indexed by `eventTypeIdx`. |
| `event_data` | `jsonb` | `NOT NULL` | Event payload. |
| `timestamp` | `timestamptz` | `NOT NULL` | Event time. Indexed by `timestampIdx`. |
| `received_at` | `timestamptz` | `NOT NULL`, default `now()` | Ingestion time. |

**Cascade behavior**: Follows cascade on referenced device/session.

### policy_issues
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `device_id` | `uuid` | `NOT NULL REFERENCES devices(id) ON DELETE CASCADE` | Indexed by `deviceIdIdx`. |
| `version` | `varchar(16)` | `NOT NULL` | Policy version. |
| `issued_at`, `expires_at` | `timestamptz` | `NOT NULL`, `expires_at` required | Policy validity window. |
| `jws_kid` | `varchar(64)` | `NOT NULL` | Signature key ID. |
| `policy_data` | `jsonb` | `NOT NULL` | Signed policy content. |
| `ip_address` | `varchar(45)` | nullable | Request source IP. |
| `expires_at` | `timestamptz` | `NOT NULL` | Indexed by `expiresAtIdx`. |

**Cascade behavior**: Child of `devices`.

### jwt_revocations
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `jti` | `varchar(64)` | `PRIMARY KEY` | JWT identifier. |
| `revoked_at`, `expires_at` | `timestamptz` | `NOT NULL`, default `now()` | Revocation window. |
| `reason`, `revoked_by` | `varchar(64/255)` | nullable | Revocation details. |
| `jti_idx`, `expires_at_idx` | indexes | | Performance indexes. |

**Cascade behavior**: Standalone revocation log.

### pin_attempts
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `user_id`, `device_id` | `uuid` | `NOT NULL REFERENCES users(id)/devices(id) ON DELETE CASCADE` | Indexed by `userIdIdx`, `deviceIdIdx`. |
| `attempt_type` | `varchar(16)` | `NOT NULL` | `user_pin` or `supervisor_pin`. Indexed by `attemptTypeIdx`. |
| `success` | `boolean` | `NOT NULL` | Attempt result. |
| `ip_address` | `varchar(45)` | nullable | Source IP. |
| `attempted_at` | `timestamptz` | `NOT NULL`, default `now()` | Attempt timestamp. |

**Cascade behavior**: Tied to user/device lifecycle.

## Enhanced RBAC System Tables

### roles
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `name` | `varchar(50)` | `NOT NULL`, `UNIQUE` | Role name. Indexed by `nameIdx`. |
| `display_name` | `varchar(120)` | `NOT NULL` | Human-readable name. |
| `description` | `text` | nullable | Role purpose. |
| `is_system_role` | `boolean` | `NOT NULL`, default `false` | Immutable predefined roles. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Role status. |
| `hierarchy_level` | `integer` | `NOT NULL`, default `0` | Inheritance level (0=highest). |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |

**Cascade behavior**: Role deletion cascades to `role_permissions` and `user_role_assignments`.

### permissions
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `name` | `varchar(100)` | `NOT NULL`, `UNIQUE` | Unique permission identifier. |
| `resource` | `resource_type` enum | `NOT NULL` | Target resource type. |
| `action` | `permission_action` enum | `NOT NULL` | Allowed action. |
| `scope` | `permission_scope` enum | `NOT NULL`, default `TEAM` | Permission scope. |
| `description` | `text` | nullable | Permission description. |
| `conditions` | `jsonb` | nullable | Additional conditions. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Permission status. |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()` | |
| `resource_action_idx`, `name_idx` | indexes | | Performance indexes. |

**Cascade behavior**: Permission deletion cascades to `role_permissions`.

### role_permissions
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `role_id` | `uuid` | `NOT NULL REFERENCES roles(id) ON DELETE CASCADE` | Indexed by `roleIdIdx`. |
| `permission_id` | `uuid` | `NOT NULL REFERENCES permissions(id) ON DELETE CASCADE` | Indexed by `permissionIdIdx`. |
| `granted_by` | `uuid` | `REFERENCES users(id)` | Granting user. |
| `granted_at` | `timestamptz` | `NOT NULL`, default `now()` | Grant timestamp. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Mapping status. |

**Purpose**: Maps roles to permissions for fine-grained access control.
**Cascade behavior**: Junction table - cascades from both roles and permissions.

### user_role_assignments
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Indexed by `userIdIdx`. |
| `role_id` | `uuid` | `NOT NULL REFERENCES roles(id) ON DELETE CASCADE` | Indexed by `roleIdIdx`. |
| `organization_id` | `uuid` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | Multi-tenant support. Indexed by `organizationIdIdx`. |
| `team_id` | `uuid` | `REFERENCES teams(id) ON DELETE CASCADE` | Team scoping. Indexed by `teamIdIdx`. |
| `region_id` | `varchar(32)` | nullable | Geographic region. |
| `granted_by` | `uuid` | `REFERENCES users(id)` | Assigning user. |
| `granted_at` | `timestamptz` | `NOT NULL`, default `now()` | Assignment timestamp. |
| `expires_at` | `timestamptz` | nullable | Temporary assignments. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Assignment status. |
| `context` | `jsonb` | nullable | Additional context. |

**Purpose**: Supports multiple roles per user with scoping and expiration.
**Cascade behavior**: User deletion removes all role assignments.

### permission_cache
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `user_id` | `uuid` | `PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE` | Indexed by `userIdIdx`. |
| `effective_permissions` | `jsonb` | `NOT NULL` | Cached resolved permissions. |
| `computed_at` | `timestamptz` | `NOT NULL`, default `now()` | Cache computation time. |
| `expires_at` | `timestamptz` | `NOT NULL` | Cache expiration. Indexed by `expiresAtIdx`. |
| `version` | `integer` | `NOT NULL`, default `1` | Cache invalidation version. |

**Purpose**: Performance optimization for permission resolution (<100ms target).
**Cascade behavior**: User deletion removes cache entry.

## Project Management Tables

### projects
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `title` | `varchar(255)` | `NOT NULL` | Project title. |
| `abbreviation` | `varchar(50)` | `NOT NULL`, `UNIQUE` | Short identifier. Indexed by `abbreviationIdx`. |
| `contact_person_details` | `text` | nullable | Contact information. |
| `status` | `project_status` enum | `NOT NULL`, default `ACTIVE` | Project status. Indexed by `statusIdx`. |
| `geographic_scope` | `project_geographic_scope` enum | `NOT NULL`, default `NATIONAL` | Coverage area. |
| `region_id` | `uuid` | `REFERENCES teams(id) ON DELETE SET NULL` | Regional association. |
| `organization_id` | `uuid` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | Multi-tenant support. Indexed by `organizationIdx`. |
| `created_by` | `uuid` | `NOT NULL REFERENCES users(id)` | Project creator. Indexed by `createdByIdx`. |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |
| `deleted_at` | `timestamptz` | nullable | Soft delete support. |

**Cascade behavior**: Project deletion cascades to `project_assignments` and `project_team_assignments`.

### project_assignments
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `project_id` | `uuid` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | Indexed by `projectIdx`. |
| `user_id` | `uuid` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Indexed by `userIdx`. |
| `assigned_by` | `uuid` | `NOT NULL REFERENCES users(id)` | Assignment author. |
| `role_in_project` | `varchar(100)` | nullable | Project-specific role. |
| `assigned_at` | `timestamptz` | `NOT NULL`, default `now()` | Assignment timestamp. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Assignment status. Indexed by `activeIdx`. |
| `assigned_until` | `timestamptz` | nullable | Temporary assignments. |
| `project_user_idx` | index | | Unique constraint on (project_id, user_id). |

**Purpose**: Individual user project assignments with role definition.
**Cascade behavior**: Junction table - cascades from both projects and users.

### project_team_assignments
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `project_id` | `uuid` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | Indexed by `projectIdx`. |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | Indexed by `teamIdx`. |
| `assigned_by` | `uuid` | `NOT NULL REFERENCES users(id)` | Assignment author. |
| `assigned_role` | `varchar(100)` | nullable | Team project role. |
| `assigned_at` | `timestamptz` | `NOT NULL`, default `now()` | Assignment timestamp. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | Assignment status. Indexed by `activeIdx`. |
| `assigned_until` | `timestamptz` | nullable | Temporary assignments. |
| `project_team_idx` | index | | Unique constraint on (project_id, team_id). |

**Purpose**: Team-based project assignments (all team members get project access).
**Cascade behavior**: Junction table - cascades from both projects and teams.

## General Constraints & Notes

- **UUID Generation**: All UUID columns use `defaultRandom()` for application-side generation or database `gen_random_uuid()` where available.
- **Timezone Handling**: All timestamps use `timestamptz` (with timezone) for consistent UTC-based timekeeping.
- **Cascade Strategy**: Extensive use of `ON DELETE CASCADE` maintains data consistency when parent records are removed.
- **Soft Deletes**: Key tables (`projects`) support soft deletion via `deleted_at` columns for audit trails.
- **Performance Optimization**: Strategic indexes on foreign keys, unique constraints, and common query patterns support high-load scenarios.
- **Multi-tenancy**: Organization-based data isolation through `organization_id` foreign keys with cascade enforcement.
- **RBAC System**: Sophisticated role-based access control with hierarchical roles, granular permissions, and caching for performance (<100ms resolution target).
- **Audit Trail**: Comprehensive tracking of user assignments, permission grants, and state changes with timestamps and actor attribution.