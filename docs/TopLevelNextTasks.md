## Backend Priority Tasks

The following entries give any coding agent (Codex or otherwise) the context, success criteria, and reference docs to resolve the outstanding backend work. Each item should be treated as a small ticket: gather the referenced files, validate what’s in the code, implement fixes, and bring the docs back in sync so the next agent picks up from a single source of truth.

- **Policy payload & validation pipeline (up-to-date)**
  - Reference: `workflows/policy-distribution.md` (Complete Policy JSON + issuance flow), `backend/src/services/policy-service.ts`, `backend/src/lib/config.ts`, and `backend/.env.example`.
  - Status: `PolicyPayload` now exposes the UI/telemetry metadata, GPS accuracy/age, retries, and blocked-message text, validates every section before signing, caches the signed payload per device, and documents the new configuration knobs in `.env.example`. Future agents who touch this flow should keep these references synchronized and refresh the cached policy structure whenever new fields are added.
  - Goal: Maintain schema alignment so Android devices always receive the documented structure, and keep the config/README guidance in sync when updates are made.

- **Retention cleanup & hashing**
  - Reference: README retention statements (backend/README.md:24-40, README.md:22-60) plus `TelemetryService` and `PolicyService` cleanup stubs.
  - Task: Replace the scrypt fallback with Argon2id (or explicitly call out the fallback in the docs) and introduce async cleanup jobs that delete telemetry/policy records older than the 24-hour window mentioned in the docs. Tie these jobs to the health checks or cron runner described elsewhere so retention is enforceable.
  - Goal: Honor the proclaimed 24h retention policy and keep hashed secrets aligned with the enterprise-grade security posture.

- **Operational secrets, cleanup, & TLS posture**
  - Reference: `docs/SecurityComplianceGuide.md` (hardening notes, TLS reminders), `docs/OperationsDevOpsGuide.md` (maintenance steps), `backend/docs/security.md`, and the JWT/policy cleanup mentions in `backend/src/services/jwt-service.ts` and `policy-service.ts`.
  - Task: Verify TLS requirements are documented/enforced in production configs, prune expired `jwt_revocations` entries on a schedule, and document how key rotation (JWT + Ed25519) should be handled without downtime. Add or expand scripts/docs that fit these routines into the operator checklist so rotations and secret hygiene stay visible.
  - Goal: Keep production secrets/keys fresh, maintain the documented TLS/compliance posture, and prevent tables designed for revocations/retention from growing unbounded.

- **QA & automation coverage**
  - Reference: `docs/QATestGuide.md` (test strategy + gaps), `backend/docs/testing-guide.md`, and the placeholder team/user/device tests referenced there.
  - Task: Flesh out the missing regression suites for the team/user/device CRUD flows (including supervisor PINs) while keeping auth/policy/telemetry-focused suites green. Document the way QA plans to simulate rate limiting, overrides, and telemetry batches so future agents can extend those suites without guessing at the constraints.
  - Goal: Provide high confidence that backend flows tied to documentation remain stable and give QA a reliable script for future releases.

- **Mobile experience assurance**
  - Reference: `docs/MobileUserGuide.md`, `workflows/policy-distribution.md`, and `workflows/telemetry-collection.md`.
  - Task: Codify the launcher expectations (policy windows, GPS accuracy/age, telemetry batch handling, supervisor overrides, rate-limit messaging) into tests or smoke scripts and update the guide whenever the backend behavior drifts. Ensure the policy payload metadata described for the UI matches the actual JWS fields emitted from `PolicyService`.
  - Goal: Prevent regressions that would break the mobile policy/telemetry experience by keeping the documentation, tests, and emitted payloads in sync.

- **Team management coverage**
  - Reference: `workflows/user-device-registration.md`, backend docs/models/api, and `backend/src/services/team-service.ts` plus the relevant routes.
  - Task: Confirm the TeamService/route layer implements the full CRUD surface (create/list/update/delete) the admin UI expects, ensure database relationships (teams→users/devices) are enforced, and tighten auth middleware so only the correct team context can mutate resources.
  - Goal: Match documentation + user-device registration workflow so future agents can rely on these endpoints without manually revalidating behavior.

- **Multi-factor enforcement documentation**
  - Reference: README authentication summary (README.md:5-60) and `backend/docs/workflows.md` (Authentication workflows, supervisor overrides).
  - Task: Document the complete MFA enforcement chain—device validation, user code lookup, PIN verification with rate limiting/lockout, supervisor override tokens, policy issuance, and JWT/session plumbing (AuthService, RateLimiter, SupervisorPinService, JWTService). Spell out how each factor is enforced today, what invariants must hold, and how the policy issuance ties into it.
  - Goal: Provide a single, accurate reference so future work on MFA or launcher parsing doesn’t have to infer the existing implementation from the codebase.

Each section should link back to the concrete code/docs so that agents can rapidly gather requirements, implement changes, and leave a consistent trail for the next handoff.
