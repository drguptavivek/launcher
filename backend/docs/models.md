# SurveyLauncher Backend – Data Models (PostgreSQL 18)

This document summarizes the PostgreSQL 18 schema that backs SurveyLauncher, listing each table’s columns, PostgreSQL data types, constraints/defaults, indexes, and cascade behavior. It references the `src/lib/db/schema.ts` Drizzle schema for the definitive definitions used by the application.

> PostgreSQL 18 Notes: all UUID columns use `uuid` with `default gen_random_uuid()` semantics, timestamps use `timestamptz`, JSON payloads are stored in `jsonb`, and enums are created with `CREATE TYPE` equivalents – the Drizzle schema generates migrations compatible with PG18’s defaults.

## Enum Types

### Role-Based Access Control (RBAC) Enums
- `user_role` (`TEXT` enum): values `TEAM_MEMBER`, `FIELD_SUPERVISOR`, `REGIONAL_MANAGER`, `SYSTEM_ADMIN`, `SUPPORT_AGENT`, `AUDITOR`, `DEVICE_MANAGER`, `POLICY_ADMIN`, `NATIONAL_SUPPORT_ADMIN`. Used by `users.role` with default `TEAM_MEMBER`.
- `permission_scope` (`TEXT` enum): values `ORGANIZATION`, `REGION`, `TEAM`, `USER`, `SYSTEM`. Used by `permissions.scope` with default `TEAM`.
- `permission_action` (`TEXT` enum): values `CREATE`, `READ`, `UPDATE`, `DELETE`, `LIST`, `MANAGE`, `EXECUTE`, `AUDIT`. Used by `permissions.action`.
- `resource_type` (`TEXT` enum): values `TEAMS`, `USERS`, `DEVICES`, `SUPERVISOR_PINS`, `TELEMETRY`, `POLICY`, `AUTH`, `SYSTEM_SETTINGS`, `AUDIT_LOGS`, `SUPPORT_TICKETS`, `ORGANIZATION`. Used by `permissions.resource`.

## teams
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `name` | `varchar(255)` | `NOT NULL` | indexed by `name`. |
| `timezone` | `varchar(50)` | `NOT NULL`, default `UTC` | |
| `state_id` | `varchar(16)` | `NOT NULL` | |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Cascade behavior**: `teams.id` is the parent for all foreign keys below, each declared with `ON DELETE CASCADE` so removing a team deletes related devices, users, supervisor PINs, sessions, and telemetry/pin records.

## devices
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | Index `teamIdIdx`. |
| `name` | `varchar(255)` | `NOT NULL` | |
| `android_id` | `varchar(64)` | nullable | Index `androidIdIdx`. |
| `app_version` | `varchar(32)` | nullable | |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `last_seen_at`, `last_gps_at` | `timestamptz` | nullable | |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Cascade behavior**: Deletes cascade to `sessions`, `telemetry_events`, `policy_issues`, and `pin_attempts`.

## users
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `code` | `varchar(32)` | `NOT NULL` | Index `userCodeIdx`. |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | Index `teamIdIdx`. |
| `display_name` | `varchar(255)` | `NOT NULL` | |
| `email` | `varchar(255)` | nullable | |
| `role` | `user_role` enum | `NOT NULL`, default `TEAM_MEMBER` | |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Cascade behavior**: Deleting a user cascades to `user_pins`, `sessions`, `pin_attempts`.

## user_pins
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `user_id` | `uuid` | `PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE` | |
| `pin_hash`, `salt` | `varchar(255)` | `NOT NULL` | Argon2id data. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `rotated_at`, `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Cascade behavior**: Owned by `users`, no downstream children.

## supervisor_pins
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | Index `teamIdIdx`. |
| `name` | `varchar(255)` | `NOT NULL` | |
| `pin_hash`, `salt` | `varchar(255)` | `NOT NULL` | |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `rotated_at`, `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Cascade behavior**: Team delete removes supervisor PINs.

## sessions
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | `REFERENCES users(id) ON DELETE CASCADE` | Nullable to support system sessions? |
| `team_id` | `uuid` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | |
| `device_id` | `uuid` | `NOT NULL REFERENCES devices(id) ON DELETE CASCADE` | |
| `started_at`, `expires_at` | `timestamptz` | `NOT NULL`, `expires_at` must be provided | |
| `ended_at`, `override_until`, `last_activity_at` | `timestamptz` | `last_activity_at` default `now()` | |
| `status` | `varchar(16)` | `NOT NULL`, default `'open'` | values: `open`, `expired`, `ended`. |
| `token_jti` | `varchar(64)` | nullable | Indexed `tokenJtiIdx`. |
**Cascade behavior**: Deleting the session cascades telemetry events and pin attempts through their FK definitions.

## telemetry_events
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `device_id` | `uuid` | `NOT NULL REFERENCES devices(id) ON DELETE CASCADE` | Index `deviceIdIdx`. |
| `session_id` | `uuid` | `REFERENCES sessions(id) ON DELETE CASCADE` | nullable (some events pre-session). |
| `event_type` | `varchar(32)` | `NOT NULL` | e.g., `gps`, `heartbeat`. Index `eventTypeIdx`. |
| `event_data` | `jsonb` | `NOT NULL` | Arbitrary telemetry payload. |
| `timestamp`, `received_at` | `timestamptz` | `timestamp` required; `received_at` default `now()` | Indexed `timestampIdx`. |
**Cascade behavior**: Follows cascade on referenced device/session to remove stale telemetry.

## policy_issues
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `device_id` | `uuid` | `NOT NULL REFERENCES devices(id) ON DELETE CASCADE` | Index `deviceIdIdx`. |
| `version` | `varchar(16)` | `NOT NULL` | Policy version identifier. |
| `issued_at`, `expires_at` | `timestamptz` | `NOT NULL`, default `issued_at` now | |
| `jws_kid` | `varchar(64)` | `NOT NULL` | Signed key ID. |
| `policy_data` | `jsonb` | `NOT NULL` | Contains signed policy payload. |
| `ip_address` | `varchar(45)` | nullable | Stores source IP. |
**Cascade behavior**: Child of `devices`.

## jwt_revocations
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `jti` | `varchar(64)` | `PRIMARY KEY` | JWT identifier. |
| `revoked_at`, `expires_at` | `timestamptz` | `NOT NULL`, default `now()` | `expires_at` used to clean up revoked tokens. |
| `reason`, `revoked_by` | `varchar(64/255)` | nullable | |
| Indexes | `jtiIdx`, `expiresAtIdx` | | |
**Cascade behavior**: None (standalone revocation log).

## pin_attempts
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `user_id`, `device_id` | `uuid` | `NOT NULL REFERENCES users(id)/devices(id) ON DELETE CASCADE` | Indexed. |
| `attempt_type` | `varchar(16)` | `NOT NULL` | `'user_pin'` or `'supervisor_pin'`. Index `attemptTypeIdx`. |
| `success` | `boolean` | `NOT NULL` | |
| `ip_address` | `varchar(45)` | nullable | |
| `attempted_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Cascade behavior**: Tied to user/device lifecycle deletions.

## Enhanced RBAC System Tables

### roles
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `name` | `varchar(50)` | `NOT NULL`, `UNIQUE` | Uppercase role name. Index `nameIdx`. |
| `display_name` | `varchar(120)` | `NOT NULL` | Human-readable role name. |
| `description` | `text` | nullable | Role description and purpose. |
| `is_system_role` | `boolean` | `NOT NULL`, default `false` | Predefined system roles (immutable). |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `hierarchy_level` | `integer` | `NOT NULL`, default `0` | For role inheritance (0=highest). |
| `created_at`, `updated_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Cascade behavior**: Role deletion cascades to `role_permissions` and `user_role_assignments`. System roles are protected from modification/deletion.

### permissions
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `name` | `varchar(100)` | `NOT NULL`, `UNIQUE` | Unique permission identifier. |
| `resource` | `resource_type` enum | `NOT NULL` | Target resource type. |
| `action` | `permission_action` enum | `NOT NULL` | Allowed action on resource. |
| `scope` | `permission_scope` enum | `NOT NULL`, default `TEAM` | Permission scope level. |
| `description` | `text` | nullable | Permission description. |
| `conditions` | `jsonb` | nullable | Additional conditions (temporal, geo, etc.). |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `created_at` | `timestamptz` | `NOT NULL`, default `now()` | |
**Indexes**: `resourceActionIdx` on `(resource, action)`, `nameIdx` on `name`.
**Cascade behavior**: Permission deletion cascades to `role_permissions`.

### role_permissions
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `role_id` | `uuid` | `NOT NULL REFERENCES roles(id) ON DELETE CASCADE` | Index `roleIdIdx`. |
| `permission_id` | `uuid` | `NOT NULL REFERENCES permissions(id) ON DELETE CASCADE` | Index `permissionIdIdx`. |
| `granted_by` | `uuid` | `REFERENCES users(id)` | User who granted this permission. |
| `granted_at` | `timestamptz` | `NOT NULL`, default `now()` | |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
**Purpose**: Maps roles to their permissions, allowing fine-grained access control.
**Cascade behavior**: Junction table - cascades from both roles and permissions.

### user_role_assignments
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | |
| `user_id` | `uuid` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Index `userIdIdx`. |
| `role_id` | `uuid` | `NOT NULL REFERENCES roles(id) ON DELETE CASCADE` | Index `roleIdIdx`. |
| `organization_id` | `uuid` | `NOT NULL` | Multi-tenant support. Index `organizationIdIdx`. |
| `team_id` | `uuid` | `REFERENCES teams(id) ON DELETE CASCADE` | Team-scoped assignment. Index `teamIdIdx`. |
| `region_id` | `varchar(32)` | nullable | Geographic/organizational region. |
| `granted_by` | `uuid` | `REFERENCES users(id)` | User who assigned the role. |
| `granted_at` | `timestamptz` | `NOT NULL`, default `now()` | |
| `expires_at` | `timestamptz` | nullable | Temporary role assignments. |
| `is_active` | `boolean` | `NOT NULL`, default `true` | |
| `context` | `jsonb` | nullable | Additional assignment context. |
**Purpose**: Supports multiple roles per user with scoping and expiration.
**Cascade behavior**: User deletion removes all role assignments.

### permission_cache
| Column | Type | Constraints / Defaults | Notes |
| --- | --- | --- | --- |
| `user_id` | `uuid` | `PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE` | Index `userIdIdx`. |
| `effective_permissions` | `jsonb` | `NOT NULL` | Cached resolved permissions. |
| `computed_at` | `timestamptz` | `NOT NULL`, default `now()` | When cache was computed. |
| `expires_at` | `timestamptz` | `NOT NULL` | Cache expiration time. Index `expiresAtIdx`. |
| `version` | `integer` | `NOT NULL`, default `1` | Cache invalidation version. |
**Purpose**: Performance optimization for permission resolution (<100ms target).
**Cascade behavior**: User deletion removes cache entry.

## General Constraints & Notes
- Most `varchar` columns have explicit length limits (32, 64, 255) to keep storage predictable.
- UUID PKs are generated by the database via `gen_random_uuid()` helpers; ensure `pgcrypto` or equivalent extension is enabled in PostgreSQL 18.
- `ON DELETE CASCADE` is pervasive to keep the schema consistent; removing a team cascades deeply through users, devices, sessions, telemetry, and policies.
- No soft deletes are modeled; archival should use `is_active` flags where present (e.g., `devices.is_active`, `users.is_active`).
- Indexes (e.g., `userCodeIdx`, `tokenJtiIdx`, telemetry indices) support the bulk query patterns described in `docs/workflows.md`.
