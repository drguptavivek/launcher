# Administrators Guide

## Purpose
This guide captures the functional requirements that SurveyLauncher administrators and operators rely on to keep the backend secure, compliant, and aligned with the mobile launcher’s expectations. It collects information spread across the README, backend documentation, and workflow files so you can refer to a single functional source-of-truth before touching policies, telemetry, or team management.

## Scope
- Authentication, sessions, and MFA enforcement
- Policy issuance/validation and device enforcement windows
- Telemetry collection, validation, and retention
- Team, user, device, and supervisor PIN management
- Monitoring, alerting, and recurring operational tasks

## System Overview
- **Backend**: Express + TypeScript service exposing 8 REST APIs with JWT-based authentication and Drizzle ORM backed by PostgreSQL/SQLite (`backend/README.md`).
- **Security**: Multi-tier rate limiting, RFC-5424 structured logging, JWT revocation (JTI store), policy signing via Ed25519, and Zod-based environment validation (`README.md`, `backend/docs/workflows.md`).
- **Data Layer**: 9 core tables (teams, users, devices, userPins, supervisorPins, sessions, telemetryEvents, policyIssues, jwtRevocations) with foreign keys and indexes to support policy/auth/telemetry flows (`README.md:37-43`, `backend/docs/workflows.md:124-182`).

## Functional Requirements

### Authentication & MFA
- **Multi-factor flow**: Device identity + user code + PIN verification (`README.md:5-11`, `backend/docs/workflows.md:42-120`).
- **PIN security**: Scrypt/Argon2 hashing with lockout after 5 failures, longer cooldowns, and per-user/per-device tracking (`AuthService`, `rate-limiter.ts`).
- **JWT management**: Access (≈20 min), refresh (≈12 hr), and override (2 hr) tokens generated with `JWTService` including revocation recording (`backend/docs/workflows.md:42-120`, `backend/src/services/jwt-service.ts`).
- **Session lifecycle**: Stored in `sessions` table, automatically timed out, and extendable via supervisor override tokens.

### Policy Management
- **Policy payload**: Enforces time windows (Mon–Fri 08:00–19:30, Sat 09:00–15:00), grace periods (10 min), supervisor overrides (120 min), GPS requirements (3 min interval, 50 m displacement, 20 m accuracy, 5 min max age), telemetry batch/config requirements, and UI blocked message (`workflows/policy-distribution.md`, `backend/src/services/policy-service.ts`).
- **Issuance**: Policies signed with Ed25519 JWS (key rotation via `policySigner`), stored in `policyIssues` along with metadata, and returned over `GET /api/v1/policy/:deviceId`.
- **Validation**: Devices verify the signature, clock skew (±180s), expiry, and payload structure before enforcement.
- **Cache**: Backend caches signed policies per device until expiry to minimize redundant signing.

### Telemetry Collection
- **Event types**: Heartbeat, GPS, app usage, screen time, battery, network, error events (`README.md`, `workflows/telemetry-collection.md`).
- **Batching**: Up to 50 events per payload; backend enforces batching, validates timestamps/age (<24h, <5m in future), GPS coords, battery percentages, and type-specific payloads.
- **Storage**: Valid events inserted into `telemetryEvents` with device association; `devices` table lastSeen/lastGps timestamps updated.
- **Retention**: Documented 24-hour retention requires cleanup jobs (not yet implemented) and health monitoring.

### Supervisor Override
- Supervisor PINs stored separately (`supervisorPins` table) with brute-force protections (`SupervisorPinService`).
- Overrides produce 2-hour override tokens, audited for every action (`backend/docs/workflows.md:185-210`).
- Override revocation handled via dedicated endpoint (`POST /api/v1/supervisor/override/revoke`).

### Team/User/Device Administration
- CRUD surfaces exist for teams, users, devices, and supervisor pins (`workflows/user-device-registration.md` and user-device-registration-gaps analysis).
- Admins must use the SvelteKit UI or direct APIs to create teams, register users with hashed PINs, bind devices to teams, and rotate supervisor PINs.
- Middleware enforces team-scoped access, while rate limiting logs all operations with request IDs.

### Operational Monitoring & Health
- **Health endpoint**: `GET /health` returns readiness.
- **Structured logging**: All requests/errors carry request_id, user, session, and performance metrics.
- **Rate limiting stats**: In-memory limiter provides insights via logging/counters; consider exposing via metrics in future.
- **Maintenance**: Regular policy/telemetry cleanup (seen in docs as planned) and JWT revocation table pruning should be scheduled with cron or job runner.

## API Summary (Refer to actual documentation for payloads)
- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/whoami`
- `GET /api/v1/policy/:deviceId`
- `POST /api/v1/supervisor/override/login`, `POST /api/v1/supervisor/override/revoke`
- `POST /api/v1/telemetry`
- Team/User/Device/Supervisor PIN APIs as detailed in `workflows/user-device-registration.md`.

## References & Workflows
- Policy creation/distribution: `workflows/policy-distribution.md`
- Telemetry pipeline: `workflows/telemetry-collection.md`
- Authentication/device registration: `workflows/device-authentication.md`, `workflows/user-device-registration.md`
- Backend status/configuration: `README.md`, `backend/README.md`, `backend/docs/workflows.md`

## Next Steps for Administrators
1. Align policies and telemetry configuration using the new environment variables (`backend/.env.example` updates) and ensure the launcher receives the matching JSON structure.
2. Schedule retention/cleanup jobs to enforce the 24-hour window promised in documentation.
3. Monitor rate limiting and audit logs as part of regular maintenance and escalate policy validation failures immediately.
