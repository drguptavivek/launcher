# Roles Progress Review
**Timestamp (UTC): 2025-11-16 12:05**

## Resolved Since Last Update
1. **Mobile login now enforces role rules** – `AuthService.login` rejects any user whose role is not one of the three hybrid/mobile roles, logs the attempt, and the login route returns HTTP 403 with `APP_ACCESS_DENIED` (`backend/src/services/auth-service.ts:120-220`, `backend/src/routes/api/auth.ts:1-120`). Added an integration test to guard the regression (`backend/tests/integration/auth.test.ts`).
2. **Sessions + telemetry schema match runtime usage** – Added nullable `ip_address` and `user_agent` columns to `sessions` plus optional `user_id` for `telemetry_events`, via Drizzle migration `0006_dual_auth_columns` (`backend/src/lib/db/schema.ts:176-210`, `backend/drizzle/0006_dual_auth_columns.sql`). Session inserts no longer fail when capturing metadata, and telemetry batching can persist user metadata as intended.
3. **API-created users now share the same PIN hashing as login** – `UserService` and `SupervisorPinService` now rely on the shared `hashPassword`/`verifyPassword` helpers (`backend/src/services/user-service.ts`, `backend/src/services/supervisor-pin-service.ts`), removing the scrypt mismatch that made API-created users impossible to authenticate. Added an integration test that creates a user via `UserService` and confirms `/auth/login` succeeds (`backend/tests/integration/auth.test.ts`).
4. **Logout + refresh flows aligned with tests** – `/api/v1/auth/logout` now returns `ended_at`, and `/api/v1/auth/refresh` no longer requires an access token guard, so the integration suite passes end-to-end (`backend/src/routes/api/auth.ts`, `backend/src/services/auth-service.ts`, `backend/src/services/jwt-service.ts`).

## Alignment Highlights
- **Dual data model exists**: The Drizzle schema separates field `users` from `web_admin_users` and preserves the nine-role enum described in `backend/docs/role-differentiation.md`/`docs/roles.md` (`backend/src/lib/db/schema.ts:120-210`). This matches the dual-interface plan in the docs.
- **Web admin workflow implemented**: `web-admin/auth` exposes login/whoami/logout plus guarded admin creation, with lockouts, role validation, and JWT issuance (`backend/src/routes/api/web-admin-auth.ts:11-205`, `backend/src/services/web-admin-auth-service.ts:88-214`). TEAM_MEMBER logins are blocked on the web tier per the guide.
- **Mobile auth hardening underway**: Device/team binding, rate limiting, PIN lockouts, and policy version hand-off are wired in `AuthService.login` (`backend/src/services/auth-service.ts:90-301`) and the Express route stack (`backend/src/routes/api/auth.ts:1-200`).
- **Security middleware + docs**: The Express host enforces request IDs, rate limits, Helmet, and Swagger (`backend/src/server.ts:1-140`). Documentation in `backend/docs/models.md` and `backend/docs/role-differentiation.md` stays up to date with current schema and flow diagrams.
- **Testing scaffolding**: Integration suites cover login/route protection using deterministic fixtures from `scripts/seed-fixed-users.ts` (`backend/tests/integration/auth.test.ts`, `backend/tests/integration/route-protection.test.ts`), keeping regressions visible.

## Critical Gaps / Edge Cases
1. **Web-admin cookies never honored**  
   Login sets HTTP-only `access_token` and `refresh_token` cookies (`backend/src/routes/api/web-admin-auth.ts:52-75`), but `authenticateWebAdmin` only checks the Authorization header and returns `MISSING_TOKEN` when it is absent (`backend/src/middleware/auth.ts:888-905`). Cookie-based sessions therefore cannot be used despite the documented flow.
2. **Telemetry ingestion / authorization mismatches**  
   Endpoint authorization checks for `Action.READ` instead of `Action.CREATE`, so write intent is mislabeled and the RBAC matrix cannot restrict uploads correctly (`backend/src/routes/api/telemetry.ts:9-34`).
3. **Supervisor override permissions reference a non-existent resource**  
   The route wraps `requirePermission(Resource.SUPERVISOR, Action.OVERRIDE)` (`backend/src/routes/api/supervisor.ts:11-65`), but `Resource` only defines `SUPERVISOR_PINS`. This TypeScript/authorization mismatch breaks compilation or leaves the route unprotected when emitted JS is used.
4. **Project "my" endpoint unusable**  
   `/api/v1/projects/my` never calls `authenticateToken`, yet it expects `req.user` from that middleware (`backend/src/routes/api/projects.ts:191-224`). Every request fails with `UNAUTHENTICATED`, so users cannot list their assigned projects despite the feature being listed in the docs.
5. **Policy history uses missing column name**  
   `PolicyService.getRecentPolicyIssues` selects `policyIssues.policyVersion` (`backend/src/services/policy-service.ts:259-276`), but the table only contains `version` (`backend/src/lib/db/schema.ts:210-220`). Any call to this helper throws, and dashboards auditing policy issuance cannot be powered.
6. **Refresh/signature edge cases undocumented**  
    Although `docs/role-differentiation.md` and `docs/understanding-your-role.md` describe PIN/POLICY enforcement, there is no structured logging or test covering supervisor overrides, policy-cache expiry, or GPS heartbeats yet (`backend/src/routes/api/auth.ts:200-260`, `backend/src/services/policy-service.ts:118-220`). These are critical acceptance criteria in the Android launcher plan.

## Additional Observations
- Integration tests assert some auth flows but don't cover the regression points above (e.g., no coverage for `/auth/refresh` without access tokens or telemetry writes), so adding targeted cases in `backend/tests/integration` would prevent regressions.
- Postgres is expected to run via Docker per the README; the seed scripts (`backend/src/lib/seed.ts`, `scripts/seed-fixed-users.ts`) already create both app and web users, but they currently bypass the `UserService` hashing path, which is why manual testing might still pass even though the API cannot create usable users.
- The security middleware and rate limiter scaffolding (`backend/src/server.ts`, `backend/src/services/rate-limiter.ts`) are solid foundations—once the role/permission bugs are resolved, they're ready to guard the dual-auth surface described in `backend/docs/role-differentiation.md`.
