# SurveyLauncher Backend – Data Models (PostgreSQL 18)

This document summarizes the PostgreSQL 18 schema that backs SurveyLauncher, listing each table’s columns, PostgreSQL data types, constraints/defaults, indexes, and cascade behavior. It references the `src/lib/db/schema.ts` Drizzle schema for the definitive definitions used by the application.

> PostgreSQL 18 Notes: all UUID columns use `uuid` with `default gen_random_uuid()` semantics, timestamps use `timestamptz`, JSON payloads are stored in `jsonb`, and enums are created with `CREATE TYPE` equivalents – the Drizzle schema generates migrations compatible with PG18’s defaults.

## Enum Types
- `user_role` (`TEXT` enum): values `TEAM_MEMBER`, `SUPERVISOR`, `ADMIN`. Used by `users.role` with default `TEAM_MEMBER`.

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

## General Constraints & Notes
- Most `varchar` columns have explicit length limits (32, 64, 255) to keep storage predictable.
- UUID PKs are generated by the database via `gen_random_uuid()` helpers; ensure `pgcrypto` or equivalent extension is enabled in PostgreSQL 18.
- `ON DELETE CASCADE` is pervasive to keep the schema consistent; removing a team cascades deeply through users, devices, sessions, telemetry, and policies.
- No soft deletes are modeled; archival should use `is_active` flags where present (e.g., `devices.is_active`, `users.is_active`).
- Indexes (e.g., `userCodeIdx`, `tokenJtiIdx`, telemetry indices) support the bulk query patterns described in `docs/workflows.md`.
