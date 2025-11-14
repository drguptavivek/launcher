## Backend Priority Tasks

The following entries give any coding agent (Codex or otherwise) the context, success criteria, and reference docs to resolve the outstanding backend work. Each item should be treated as a small ticket: gather the referenced files, validate what’s in the code, implement fixes, and bring the docs back in sync so the next agent picks up from a single source of truth.

- **Policy payload & validation pipeline**
  - Reference: `workflows/policy-distribution.md` (Complete Policy JSON + issuance flow) and `backend/src/services/policy-service.ts`.
  - Task: Expand `PolicyPayload`/`createPolicyPayload` to include the telemetry/UI metadata, GPS accuracy fields, retry limits, and other properties shown in the workflow doc. Validate every subsection via `PolicyService.validatePolicyPayload()` before signing and cache/store the resulting shaped payload so the launcher parser always receives the documented schema.
  - Goal: Align the backend policy generator with the documented format (README.md:15-113, backend/docs/workflows.md:124-182) so Android devices can parse policies without ambiguity.

- **Retention cleanup & hashing**
  - Reference: README retention statements (backend/README.md:24-40, README.md:22-60) plus `TelemetryService` and `PolicyService` cleanup stubs.
  - Task: Replace the scrypt fallback with Argon2id (or explicitly call out the fallback in the docs) and introduce async cleanup jobs that delete telemetry/policy records older than the 24-hour window mentioned in the docs. Tie these jobs to the health checks or cron runner described elsewhere so retention is enforceable.
  - Goal: Honor the proclaimed 24h retention policy and keep hashed secrets aligned with the enterprise-grade security posture.

- **Team management coverage**
  - Reference: `workflows/user-device-registration.md`, backend docs/models/api, and `backend/src/services/team-service.ts` plus the relevant routes.
  - Task: Confirm the TeamService/route layer implements the full CRUD surface (create/list/update/delete) the admin UI expects, ensure database relationships (teams→users/devices) are enforced, and tighten auth middleware so only the correct team context can mutate resources.
  - Goal: Match documentation + user-device registration workflow so future agents can rely on these endpoints without manually revalidating behavior.

- **Multi-factor enforcement documentation**
  - Reference: README authentication summary (README.md:5-60) and `backend/docs/workflows.md` (Authentication workflows, supervisor overrides).
  - Task: Document the complete MFA enforcement chain—device validation, user code lookup, PIN verification with rate limiting/lockout, supervisor override tokens, policy issuance, and JWT/session plumbing (AuthService, RateLimiter, SupervisorPinService, JWTService). Spell out how each factor is enforced today, what invariants must hold, and how the policy issuance ties into it.
  - Goal: Provide a single, accurate reference so future work on MFA or launcher parsing doesn’t have to infer the existing implementation from the codebase.

Each section should link back to the concrete code/docs so that agents can rapidly gather requirements, implement changes, and leave a consistent trail for the next handoff.
