# QA & Test Guide

## Purpose
Provide quality engineers with the explicit test strategy, commands, and targets for validating SurveyLauncher’s backend features—drawn from the detailed testing guide and workflow docs.

## Testing Strategy Summary
- **Dual approach**: Unit tests for crypto/auth/utility logic, integration tests with a live PostgreSQL DB for end-to-end flows (`backend/docs/testing-guide.md`).
- **Security emphasis**: Focused verification of authentication, rate limiting, and policy issuance with real cryptography and JWT handling.
- **Production realism**: Integration tests run against real DB constraints, providing high confidence compared to purely mocked suites.

## Key Test Suites
- **Unit tests**: `tests/unit/crypto.test.ts`, `auth-service.test.ts`, `policy-service.test.ts`, `telemetry-service.test.ts`—validate hashing, JWT, policy creation, telemetry validation.
- **Integration tests**: `tests/integration/api.test.ts`, `auth.test.ts`, `supervisor-override.test.ts`, `security-rate-limiting.test.ts`—cover REST endpoints, MFA flows, supervisor overrides, telemetry ingestion.
- **Gaps**: Team/user/device/supervisor PIN management tests exist as placeholders; writing these should be a priority for QA (`backend/docs/testing-guide.md` indicates missing tests).

## Running Tests
- **Environment**: Use `NODE_ENV=test`, `DATABASE_URL` pointing to a test Postgres (per testing guide). Ensure JWT and policy signing secrets are 32+ chars when running tests.
- **Commands**:
  - `npm run test` (all)
  - `npm run test:unit`, `npm run test:integration`
  - `npm run test -- --coverage` for coverage reports
  - Targeted runs: `npm run test tests/integration/api.test.ts` etc.

## QA Checklist
1. **Bearer flows**: Validate login/logout/refresh endpoints with valid and invalid credentials; ensure rate limit responses include `retry-after`.
2. **Policy issuance**: Hit `GET /api/v1/policy/:deviceId`, inspect JWS, and confirm payload matches `workflows/policy-distribution.md`.
3. **Telemetry ingestion**: Send batches containing valid/invalid events; expect `accepted/dropped` counts and DB inserts.
4. **Supervisor overrides**: Exercise override login/revoke endpoints; confirm tokens honor 2-hour TTL and logs capture overrides.
5. **Team/user/device CRUD**: Use admin APIs (matching `workflows/user-device-registration.md`) to add/remove resources — check rate limits/audit logs.
6. **Cleanup/retention**: Simulate older telemetry/policy entries and run cleanup scripts once implemented; verify eventual deletion.

## References
- `backend/docs/testing-guide.md` (test catalog + commands)
- `workflows/device-authentication.md`, `policy-distribution.md`, `telemetry-collection.md` (QA scenarios)
- API documentation: `backend/docs/api.md` for payload details
