# SurveyLauncher Backend – Edge Cases

This document captures notable edge and boundary scenarios inferred from the current backend implementation so we can keep them in mind while testing, hardening, or extending the system.

## Authentication & Session Management
- **Concurrent login attempts under rate limits** – the `LOGIN_RATE_LIMIT_MAX`/`PIN_RATE_LIMIT_MAX` counters are per device or user, but simultaneous retries (e.g., two endpoints hitting `auth/login`) may both pass the initial counter check before the increment is persisted, leading to a burst of accepted requests. Tests should simulate concurrent POSTs to `/auth/login` with the same payload to ensure the limiter ultimately holds.
- **Session override windows** – when a supervisor override is issued the `overrideUntil` timestamp extends beyond the session expiration. If a client refreshes tokens while `overrideUntil` is still in the future but the underlying session has been terminated in the DB (e.g., logout triggered by another device), the refresh logic may issue new tokens for a closed session. Include regression tests for issuing refresh tokens after forced logout plus override.
- **Token refresh during key rotation grace periods** – the env schema allows `jwtAccessSecretNew`/`Old`. If a refresh token was minted with the soon-to-be-rotated secret while a client requests refresh after deployment, the verification path needs to try both secrets sequentially. Edge cases arise when the new secret is `null` or misconfigured; add tests verifying refresh still works when only the old secret is present.
- **Device lifecycle anomalies** – removing or archiving a device while active sessions exist may leave orphaned sessions. A client may still call telemetry/policy endpoints because the JWT is valid even though the device is disabled. Ensure policy/telemetry middleware re-checks device `isActive` state before processing.
- **Team reassignment while session remains** – users can be moved between teams (or teams deleted) while JWTs referencing the former team still exist. The middleware should handle `teamId` lookups returning `null` gracefully and revoke the session immediately instead of panicking.

## Policy Issuance & Signing
- **Stale policy versions** – the policy endpoint responds with `policyVersion`. Clients failing to refresh after the version increments could operate under outdated operational constraints. Introduce telemetry that compares `policyVersion` in use vs. latest to flag drift.
- **Key rotation overlap** – during Ed25519 key rotation, clients could receive policies signed by the new key before public keys are distributed. Make sure both keys are temporarily accepted and that the response contains metadata (e.g., key version or timestamp) so clients know which public key to use.
- **Policy generation with missing metadata** – policies combine device, user, and team information. If one of the tables is missing crucial data (timezone, stateId), the generated policy may silently omit fields. Document this as an edge case and add validation to fail-fast when critical policy attributes are `null`.

## Telemetry Pipeline
- **Out-of-order telemetry batches** – telemetry ingestion is batched (`TELEMETRY_BATCH_MAX`), but if devices resend previous batches (due to retries) the ingestion logic should deduplicate or detect overlapping `deviceTimestamp` ranges to avoid corrupt rollups.
- **Heartbeat gaps vs GPS interval** – the backend expects telemetry at regular `HEARTBEAT_MINUTES` and `GPS_FIX_INTERVAL_MINUTES`. If the device falls asleep (e.g., airplane mode) and sends a large gap, policy logic may mistakenly consider it offline. Flag heartbeats that exceed twice the configured interval for staff review.
- **Telemetry with missing auth context** – telemetry can arrive from devices that lose JWTs due to clock drift. The `/telemetry` endpoint should handle expired tokens gracefully rather than returning misleading 401 responses (for example, accept a grace period or return the new standard error code).

## Deployment & Operations
- **Mock vs production inconsistencies** – `npm run dev:mock` bypasses PostgreSQL entirely. Ensure that behavior (e.g., supervisor override tokens, telemetry batch responses) matches production semantics, especially error codes. Edge cases can slip through if frontend teams test only against mock mode.
- **Database migration gaps** – new schema changes may leave optional columns null. If `sessions.overrideUntil` or `devices.androidId` is missing, certain queries may fail with `NULL` predicate errors. Add schema-level defaults or handle `null` gracefully.

## Documentation & Testing
- **Missing error code coverage** – doc lists standard error codes (e.g., `DEVICE_NOT_FOUND`, `POLICY_ERROR`) but not every endpoint returns them. Run automated checks that ensure each documented error path is exercised by tests to surface hidden cases.
- **Health check vs actual readiness** – the `/health` endpoint simply responds `200`. In edge environments (e.g., database down), the endpoint may still succeed even though the app is unusable. Consider expanding it to validate DB connectivity and policy signing key availability before returning ok.
