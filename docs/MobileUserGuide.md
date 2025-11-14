# Mobile User Guide

## Purpose
This guide conveys the mobile user experience expectations encoded in the backend flows, so app developers and mobile QA teams can confirm the launcher behaves correctly under authentication, policy enforcement, telemetry uploads, and supervisor overrides.

## Authentication Flow (User Perspective)
- **Login**: Users authenticate with device ID, user code, and PIN (`AuthService.login`). The system verifies the device is active, ensures the user belongs to the same team, verifies the PIN, enforces rate limits, and creates a session plus access/refresh tokens (`workflows/device-authentication.md`, `README.md:5-60`).
- **Session Lifecycle**: Access tokens expire (~20 min) and are refreshed via `POST /api/v1/auth/refresh`. Sessions persist in the backend (sessions table) with override windows; the launcher must send tokens in the `Authorization` header for protected APIs.
- **Lockout/Overrides**: After repeated PIN failures an account is locked (5 attempts + cooldown) enforced by `PinLockoutService`; supervisor overrides (PIN/login via `/api/v1/supervisor/override/login`) issue short-lived override tokens the launcher can use to extend sessions or unblock the user.

## Policy Enforcement
- **Policy Fetching**: Launcher hits `GET /api/v1/policy/:deviceId` with the device JWT. The backend issues a signed Ed25519 policy that describes time windows, grace periods, GPS/telemetry requirements, UI messages, and retry limits (`workflows/policy-distribution.md`, `backend/src/services/policy-service.ts`).
- **Policy Structure**: Policies include allowed days/times (Mon–Fri 08:00–19:30, Sat 09:00–15:00), grace minutes (10), supervisor override duration (120), GPS interval/accuracy/age, telemetry settings (heartbeat/telemetry batch + retry/upload parameters), and the blocked-message text shown when access is denied.
- **Validation Expectations**: Launcher must verify JWS signatures, check server time (±180s), enforce policy expiry (24h TTL), and respect GPS/time windows plus UI instructions.

## Telemetry Uploads
- **Event Types**: Send heartbeat, GPS, app usage, screen time, battery, network, and error events in batches of up to 50 (`workflows/telemetry-collection.md`).
- **Validation**: Backend rejects events if timestamps are >24h old or >5min future, GPS coordinates are invalid, or required fields missing (TelemetryService logs invalid events with reasons). Successful ingestion updates device lastSeen/lastGps.
- **Batch Response**: Launcher receives `{ ok, accepted, dropped }` to adjust retry logic (dropped counts include both overflow and invalid events).

## Supervisor Access (Mobile Perspective)
- **Trigger**: When the user cannot login due to policy lock or needs override, the launcher prompts for a supervisor PIN.
- **Override Lifecycle**: `/api/v1/supervisor/override/login` verifies the PIN via `SupervisorPinService` and issues override token (valid 2 hours). Override revocation happens via `/api/v1/supervisor/override/revoke`.
- **Audit Trail**: Override usage is logged for compliance, so the launcher must capture and include request IDs if available.

## Troubleshooting Notes
- **Rate Limit Errors**: Backend returns `429` with `retry-after` when login rate limits trigger; launcher should show user-friendly messages and wait before retrying.
- **Policy Errors**: If the backend cannot issue a policy (device missing/inactive), inform the user to contact the admin team and log the request ID.
- **Telemetry Drops**: Use the `error` object in telemetry responses to detect invalid events and adjust batching/local validation accordingly.

## References
- Backend workflows: `workflows/device-authentication.md`, `workflows/policy-distribution.md`, `workflows/telemetry-collection.md`
- Backend services: `backend/src/services/auth-service.ts`, `backend/src/services/policy-service.ts`, `backend/src/services/telemetry-service.ts`, `backend/src/services/supervisor-pin-service.ts`
