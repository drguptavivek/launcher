# SurveyLauncher Backend Execution Plan

## Goals & Constraints
- Deliver the SvelteKit-based backend that satisfies all contracts defined in `Agent.md`, emphasizing auth, policy delivery, telemetry ingestion, and supervisor override flows first.
- Maintain compliance with documented crypto (Argon2id, Ed25519 JWS, JWT with revocation) and rate-limiting requirements while staying deployable on PostgreSQL + Drizzle.
- Ensure every milestone can be validated locally (tests + seed + health endpoints) before Android integration.

## Phase Breakdown

### Phase 0 — Environment Foundations (Day 0-1)
1. Confirm toolchain (Node 20.x, pnpm/npm), Postgres availability, and `.env.example` coverage for all config keys listed in `Agent.md`.
2. Scaffold SvelteKit project layout with `src/lib/server` structure for db, auth, crypto, validators, services, and routes.
3. Implement configuration loader/validator (Zod) to fail-fast on missing secrets, RL knobs, or logging parameters.

#### Interim Mock API (parallel to Phase 0)
- Stand up the Express-based `/api/v1` mock server defined in `backend/mock-api` so the Android team can work against fixed responses immediately (see `backend/plan/basic-mock-api-plan.md` for contracts).
- Keep the mock feature gated behind `MOCK_API=true` and add `npm run dev:mock` / vitest contract tests to the mock package so it can be exercised independently from the future SvelteKit backend.
- Capture the current test status: `bun run test` passes against the mock suite, while `npm run test` cannot bind to `0.0.0.0` in this sandbox (EPERM). Log this limitation so future runs can prefer Bun or adjust permissions before rerunning `npm` tests.

### Phase 1 — Data & Crypto Primitives (Day 1-3)
1. Define Drizzle schema exactly as specified (team, device, user, user_pin, pin, session, telemetry_event, policy_issue, jwt_revocation) plus migrations.
2. Author seed script to create sample team/device/users, supervisor pin, and print policy signing public key; wire into `package.json` scripts.
3. Implement `crypto.ts`: Argon2id helpers, Ed25519 JWS verify/sign, secure random JTI generator, and shared time utilities (UTC, skew checks).

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
