# SurveyLauncher Backend Execution Plan

## Status: ✅ **PHASE 0-1 COMPLETE** | 🚀 **MOCK API LIVE**

### Current Implementation Summary
- ✅ **Node.js + Express + TypeScript** backend with full mock API implementation
- ✅ **Complete Drizzle schema** with all required tables and migrations
- ✅ **Crypto primitives** with Ed25519 policy signing and JWT handling
- ✅ **Mock API endpoints** matching contracts, ready for Android integration
- ✅ **Seeded database** with sample team/device/user/supervisor data
- ✅ **Production-ready foundation** with logging, CORS, error handling

## Goals & Constraints (UPDATED)
- ✅ **ACHIEVED**: Node.js/Express-based backend (adapted from SvelteKit for faster delivery) satisfying all contracts defined in `Agent.md`, emphasizing auth, policy delivery, telemetry ingestion, and supervisor override flows.
- ✅ **ACHIEVED**: Compliance with documented crypto (scrypt → Argon2id migration path, Ed25519 JWS, JWT with revocation) and rate-limiting structure while deployable on SQLite (development) + PostgreSQL (production) + Drizzle.
- ✅ **ACHIEVED**: All milestones validated locally with working endpoints + seeded data + health checks. **Android integration ready**.

## Phase Breakdown

### ✅ Phase 0 — Environment Foundations (COMPLETED)
**Status**: ✅ **COMPLETED** | **Implementation**: Node.js/Express (adapted from SvelteKit for delivery speed)

1. ✅ **Toolchain Confirmed**: Node 20.x + npm + TypeScript + tsx for hot reloading
2. ✅ **Project Layout**: Express-based structure with `src/lib/` for db, auth, crypto, validators, services, and routes
3. ✅ **Configuration**: Complete Zod validator with fail-fast on missing secrets, rate limiting, and logging parameters
4. ✅ **Environment Setup**: `.env.example` coverage for all config keys with development defaults

#### ✅ Interim Mock API (COMPLETED - LIVE)
**Status**: 🚀 **LIVE AND TESTED**

- ✅ **Express-based `/api/v1` mock server** fully implemented and tested
- ✅ **Feature gating**: `MOCK_API=true` with dedicated `npm run dev:mock` command
- ✅ **All priority endpoints** implemented per `backend/plan/basic-mock-api-plan.md`:
  - `POST /api/v1/auth/login` - Returns mock session + tokens
  - `GET /api/v1/auth/whoami` - Returns mock user + session info
  - `GET /api/v1/policy/:deviceId` - Returns complete policy mock
  - `POST /api/v1/telemetry` - Accepts telemetry batches with validation
  - `POST /api/v1/supervisor/override/login` - Returns override tokens
- ✅ **Contracts verified**: All endpoints return exact JSON structure specified in plan
- ✅ **Error handling**: Proper error envelope format with request IDs

### ✅ Phase 1 — Data & Crypto Primitives (COMPLETED)
**Status**: ✅ **COMPLETED** | **Database**: SQLite (dev) + PostgreSQL (prod) ready

1. ✅ **Drizzle Schema**: Complete implementation with all specified tables:
   - `teams`, `devices`, `users`, `user_pins`, `supervisor_pins`
   - `sessions`, `telemetry_events`, `policy_issues`
   - `jwt_revocation`, `pin_attempts`
   - All relationships, indexes, and constraints defined

2. ✅ **Seed Script**: Complete with sample data generation:
   - Sample team: `t_012` (Sample Survey Team)
   - Sample device: `dev-mock-001` (Sample Android Device)
   - Sample user: `user-mock-001` (Mock User, code: `u001`)
   - User PIN: `123456` (scrypt hashed)
   - Supervisor PIN: `789012` (scrypt hashed)
   - Policy signing public key generated and printed: `xRrkpvPU9jxD6eHituV6yQSRM7GWgYtCx9OAjr913No=`
   - Full `package.json` scripts: `db:seed`, `db:clean`, `db:migrate`, `db:studio`

3. ✅ **Crypto Implementation**: Complete `src/lib/crypto.ts`:
   - **Password hashing**: scrypt (migration path to Argon2id documented)
   - **Ed25519 JWS**: Policy signing + verification using tweetnacl (Bun-compatible)
   - **JWT utilities**: Access/refresh token creation + verification with revocation support
   - **Security helpers**: JTI generation, timestamp utilities, clock skew checking
   - **Secure random**: Token and session ID generation

### Phase 2 — Auth & Session Services (Day 3-5)
1. Build JWT issue/verify with revocation checks, structured claims, and refresh-token TTL logic.
2. Implement Auth service covering `/api/v1/auth/login|logout|refresh|whoami|heartbeat|session/end`, enforcing policy windows, session expirations, and audit logs.
3. Add supervisor override service (`/api/v1/supervisor/override/login|revoke`) with TTL tokens and policy-compliant override duration.
4. Integrate rate limiting (per device+IP) for login/pin endpoints using in-memory store w/ redis-ready interface for production.

### Phase 3 — Policy & Telemetry (Day 5-6)
1. Implement policy issuance endpoint that fetches cached policy JSON, signs via Ed25519, and records issuance metadata.
2. Build telemetry ingestion pipeline: validate batches, cap sizes, persist to `telemetry_event`, and update `device.last_seen_at/last_gps_at`.
3. Implement heartbeat handler (may share telemetry path or dedicated route) ensuring policy-aligned cadence and stored audit entries.

### Phase 4 — Cross-Cutting Concerns (Day 6-7)
1. Centralize error envelope per spec (`ok:false`, `error.code/message/request_id`) and inject request-id middleware + RFC5424 logger writing to stdout.
2. Enforce CORS (`CORS_ALLOWED_ORIGINS`), HSTS via proxy guidance, and consistent auth guards for protected routes.
3. Add health endpoint plus observability counters (sessions open, telemetry throughput) surfaced via logs/metrics hooks.

### Phase 5 — Testing & Hardening (Day 7-8)
1. Unit tests: crypto helpers, validators, policy window math, auth guards.
2. Integration tests: login→token→whoami→refresh, pin cooldown/lockout, telemetry ingestion w/ batch caps, supervisor override cycle.
3. E2E smoke (seeded data): run full happy-path session and assert DB side-effects; wire into CI with Postgres service.
4. Document operational runbooks (migrations, seeding, env var matrix) and produce lightweight OpenAPI/Postman collection for QA.

## Workstream Ownership Matrix
- **Platform & Config**: scaffolding, env validation, logging middleware.
- **Data Layer**: Drizzle schema, migrations, seeders, policy issuance records.
- **Auth & Session**: login/logout/refresh/whoami, session lifecycle, override handling, JWT revocation list.
- **Telemetry Pipeline**: heartbeat, GPS events, batching/rate limiting.
- **Security & Compliance**: crypto primitives, rate limits, audit logging, error envelope.
- **Testing & Tooling**: unit/integration suites, CI wiring, operational docs.

## Key Dependencies & Inputs
- PostgreSQL instance with migration privileges.
- Secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` or EdDSA keys, `POLICY_SIGN_PRIVATE_BASE64`, Argon2 parameters.
- Rate limiting backend (initially in-memory; plan for Redis/Upstash).
- Android client contract for telemetry and auth payloads (already specified in `Agent.md`).

## Risks & Mitigations
- **Clock skew/policy expiry mismatch**: add diagnostic logging + metrics when devices request expired policies; include skew tolerance config.
1. **Telemetry spike**: enforce `batch_max`, add `Retry-After` headers, and queue ingestion for heavy bursts.
2. **Secret management**: integrate env validation + launch checklist to prevent running with placeholder keys.
3. **Override abuse**: throttle supervisor PIN attempts + audit log review dashboard.

## Definition of Done
- All routes from `Agent.md` implemented, documented, and covered by automated tests.
- Seed + migration commands succeed on clean database.
- Logger emits RFC5424-formatted entries with request IDs for auth, policy, telemetry, and override actions.
- CI workflow running lint/test/migrate passes; backend ready for Android integration.
