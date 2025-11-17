# Roles Progress Review
**Timestamp (UTC): 2025-11-17 05:45**

## Resolved Since Last Update
1. **Mobile login now enforces role rules** – `AuthService.login` rejects any user whose role is not one of the three hybrid/mobile roles, logs the attempt, and the login route returns HTTP 403 with `APP_ACCESS_DENIED` (`backend/src/services/auth-service.ts:120-220`, `backend/src/routes/api/auth.ts:1-120`). Added an integration test to guard the regression (`backend/tests/integration/auth.test.ts`).
2. **Sessions + telemetry schema match runtime usage** – Added nullable `ip_address` and `user_agent` columns to `sessions` plus optional `user_id` for `telemetry_events`, via Drizzle migration `0006_dual_auth_columns` (`backend/src/lib/db/schema.ts:176-210`, `backend/drizzle/0006_dual_auth_columns.sql`). Session inserts no longer fail when capturing metadata, and telemetry batching can persist user metadata as intended.
3. **API-created users now share the same PIN hashing as login** – `UserService` and `SupervisorPinService` now rely on the shared `hashPassword`/`verifyPassword` helpers (`backend/src/services/user-service.ts`, `backend/src/services/supervisor-pin-service.ts`), removing the scrypt mismatch that made API-created users impossible to authenticate. Added an integration test that creates a user via `UserService` and confirms `/auth/login` succeeds (`backend/tests/integration/auth.test.ts`).
4. **Logout + refresh flows aligned with tests** – `/api/v1/auth/logout` now returns `ended_at`, and `/api/v1/auth/refresh` no longer requires an access token guard, so the integration suite passes end-to-end (`backend/src/routes/api/auth.ts`, `backend/src/services/auth-service.ts`, `backend/src/services/jwt-service.ts`).
5. **Telemetry ingestion RBAC corrected + legacy fallback** – `/api/v1/telemetry` now checks `Action.CREATE` (write intent) and the static RBAC matrix grants create/manage rights to field roles; `requirePermission` falls back to that matrix when dynamic role assignments are missing so integration tests keep working on fresh databases (`backend/src/routes/api/telemetry.ts`, `backend/src/middleware/auth.ts:115-190, 620-690`). Added a guard test to ensure the route keeps requiring create (`backend/tests/unit/routes/telemetry-route.test.ts`).
6. **Supervisor override route references valid RBAC constants** – The override login endpoint now calls `requirePermission(Resource.SUPERVISOR_PINS, Action.EXECUTE)` instead of the non-existent `SUPERVISOR/OVERRIDE` pair, restoring compilation/runtime protection and matching the RBAC plan. Added a unit test to lock the permission wiring (`backend/src/routes/api/supervisor.ts`, `backend/tests/unit/routes/supervisor-route.test.ts`).
7. **`/projects/my` now authenticates + passes integration test** – The projects router applies `authenticateToken` before any RBAC checks, so `req.user` is populated and `GET /api/v1/projects/my` no longer returns `UNAUTHENTICATED` for valid sessions. Added a focused integration test that seeds a user/org/project on the fly and asserts the endpoint returns the assigned project (`backend/src/routes/api/projects.ts`, `backend/tests/integration/projects.test.ts`).
8. **Query validation no longer mutates Express getters** – The projects router stores Zod-validated query params under an internal symbol instead of overwriting `req.query`, fixing the Express 5 “getter-only” TypeError that broke `/projects/my` and the list route. Both handlers now pull options via `getValidatedQuery`, and the integration suite passes end-to-end (`backend/src/routes/api/projects.ts`, `backend/tests/integration/projects.test.ts`).
9. **User-project lookups dedupe and log cleanly** – `ProjectService.getUserProjects` now filters out null/duplicate assignment IDs, reuses `getProjectWithDetails`, and wraps the whole flow in structured logging so inconsistent seed data can’t crash `/projects/my`. The integration test continues to verify assigned projects show up despite the added safety checks (`backend/src/services/project-service.ts`, `backend/tests/integration/projects.test.ts`).
10. **Policy history feed returns numeric versions** – `PolicyService.getRecentPolicyIssues` now reads `policyIssues.version`, coerces it to a number, and the admin dashboard docs spell out the payload so the UI no longer crashes when rendering policy history. Added a regression test that inserts a manual issue row to ensure the service returns `policyVersion` as a number (`backend/src/services/policy-service.ts`, `backend/tests/unit/policy-service.test.ts`, `backend/docs/api.md`).
11. **Seeded RBAC now mirrors production grants** – `scripts/seed-fixed-users.ts` links each fixed test user to the canonical `roles` entries via `user_role_assignments`, ensuring `/projects/*` routes find active roles instead of falling back to the legacy permission matrix. The cleanup path also removes those assignments so repeated seeds stay deterministic (`backend/scripts/seed-fixed-users.ts`).
12. **QA seeds exercise supervisor overrides** – The fixed-user seed now provisions deterministic QA accounts (`test010` Field Supervisor, `test011` System Admin) plus canonical devices/PINs pulled from `backend/docs/role-differentiation.md`, so API tests can log in with a role that holds `SUPERVISOR_PINS:EXECUTE`. The script marks supervisor PIN rows active and reuses their UUIDs, which also unblocks manual override testing (`backend/scripts/seed-fixed-users.ts`).
13. **Supervisor override suite reuses production-like data** – `tests/integration/supervisor-override.test.ts` logs in as the seeded QA Field Supervisor, reuses the canonical device, spies on the in-memory rate limiter, and asserts structured logs (`supervisor_override_granted`, `policy_issued`). Cleanup only clears sessions/PIN state, so runs no longer fight FK churn or reseeding (`backend/tests/integration/supervisor-override.test.ts`, `backend/src/services/rate-limiter.ts`).

## Alignment Highlights
- **Dual data model exists**: The Drizzle schema separates field `users` from `web_admin_users` and preserves the nine-role enum described in `backend/docs/role-differentiation.md`/`docs/roles.md` (`backend/src/lib/db/schema.ts:120-210`). This matches the dual-interface plan in the docs.
- **Web admin workflow implemented**: `web-admin/auth` exposes login/whoami/logout plus guarded admin creation, with lockouts, role validation, and JWT issuance (`backend/src/routes/api/web-admin-auth.ts:11-205`, `backend/src/services/web-admin-auth-service.ts:88-214`). TEAM_MEMBER logins are blocked on the web tier per the guide.
- **Mobile auth hardening underway**: Device/team binding, rate limiting, PIN lockouts, and policy version hand-off are wired in `AuthService.login` (`backend/src/services/auth-service.ts:90-301`) and the Express route stack (`backend/src/routes/api/auth.ts:1-200`).
- **Security middleware + docs**: The Express host enforces request IDs, rate limits, Helmet, and Swagger (`backend/src/server.ts:1-140`). Documentation in `backend/docs/models.md` and `backend/docs/role-differentiation.md` stays up to date with current schema and flow diagrams.
- **Testing scaffolding**: Integration suites cover login/route protection using deterministic fixtures from `scripts/seed-fixed-users.ts` (`backend/tests/integration/auth.test.ts`, `backend/tests/integration/route-protection.test.ts`), keeping regressions visible.

## Critical Gaps / Edge Cases
1. **Web-admin dual-mode auth incomplete**  
   The API issues both JSON tokens and HttpOnly cookies at web-admin login, but the middleware only honors Bearer headers and ignores cookies due to the lack of `cookie-parser` and cookie fallback logic (`backend/src/middleware/auth.ts:888-905`). For token-based SPAs (like the Svelte UI) this is acceptable, but browsers cannot rely solely on the provided cookies for CSRF-hardened sessions until the server parses them and enforces SameSite/CSRF defenses.
2. **Policy/GPS telemetry still lacks end-to-end coverage**  
    Supervisor override logging is now validated, but policy cache expiry, GPS heartbeats, and override revocation remain untested at the API boundary (`backend/src/routes/api/auth.ts:200-260`, `backend/src/services/policy-service.ts:118-220`). Android acceptance criteria demand those flows plus rate-limit observability beyond the current in-memory spy hooks.

## Next Step
- Extend the deterministic seeds to include mocked policy windows and telemetry cadence, then add integration coverage for policy refresh + GPS heartbeat ingestion so Android launcher requirements (time gates, telemetry batching) are verifiable without ad-hoc fixtures.

## Additional Observations
- Integration tests assert some auth flows but don't cover the regression points above (e.g., no coverage for `/auth/refresh` without access tokens or telemetry writes), so adding targeted cases in `backend/tests/integration` would prevent regressions.
- Postgres is expected to run via Docker per the README; the seed scripts (`backend/src/lib/seed.ts`, `scripts/seed-fixed-users.ts`) already create both app and web users, but they currently bypass the `UserService` hashing path, which is why manual testing might still pass even though the API cannot create usable users.
- The security middleware and rate limiter scaffolding (`backend/src/server.ts`, `backend/src/services/rate-limiter.ts`) are solid foundations—once the role/permission bugs are resolved, they're ready to guard the dual-auth surface described in `backend/docs/role-differentiation.md`.





### TESTS
npx tsx scripts/seed-default-roles.ts clear
npx tsx scripts/seed-default-roles.ts seed
npx tsx scripts/seed-default-roles.ts verify

npx tsx scripts/seed-fixed-users.ts clear
npx tsx scripts/seed-fixed-users.ts seed

npm run test -- tests/integration/api.test.ts

npm run test -- tests/unit/routes/telemetry-route.test.ts
npm run test -- tests/integration/authorization-security.test.ts
npm run test -- tests/unit/routes/supervisor-route.test.ts
npm run test -- tests/integration/projects.test.ts 
npm run test -- tests/unit/policy-service.test.ts
npm run test -- tests/integration/supervisor-override.test.ts
