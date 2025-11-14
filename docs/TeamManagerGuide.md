# Team Manager Guide

## Purpose
This guide frames the functional responsibilities of team managers who oversee administrators, field users, and devices. It focuses on workflows and system expectations so managers can align operations with the backend’s capabilities.

## Team Onboarding & Configuration
- **Team Creation**: Managers use the admin UI or `POST /api/v1/teams` to create teams with geographic/state metadata; the backend stores teams in the `teams` table (`workflows/user-device-registration.md`).
- **User Assignment**: Register field users (`POST /api/v1/users`) within the team, assigning roles (TEAM_MEMBER, SUPERVISOR, ADMIN) and hashed PINs (`userPins` table). Unique user codes per team are required.
- **Device Binding**: Devices are registered via `POST /api/v1/devices`, linked to teams, and kept active/inactive through the API; supervisors must keep device Android IDs unique per workspace.
- **Supervisor PINs**: Team-level supervisor PINs are managed via `/api/v1/supervisor/pins` endpoints (create, rotate, deactivate). Each team may have one active PIN to authorize overrides.

## Policy Oversight
- **Policy Configuration**: Managers coordinate with admins to define working windows, GPS requirements, telemetry intervals, and UI messaging; these settings are encoded in the JWS policy served to devices.
- **Policy Distribution**: Devices call `GET /api/v1/policy/:deviceId`, so ensure every device has a matching team assignment and timezone so policies make sense for field schedules (`workflows/policy-distribution.md`).
- **Monitoring**: Track `policyIssues` via backend monitoring (or future dashboards) to ensure policies are reissued hourly and expire as expected.

## Telemetry & Field Visibility
- **Event Coverage**: Ensure devices send GPS, heartbeat, battery, and network events as specified (`workflows/telemetry-collection.md`); monitors should look for dropped events or devices with stale telemetry.
- **Last Seen Tracking**: Device records update `lastSeenAt`/`lastGpsAt`; investigate devices missing updates for more than one policy TTL (24h).
- **Retention Compliance**: Telemetry data is retained for 24 hours as described in README, so managers should export or react to alerts before older data purges.

## Security & Incident Response
- **MFA Enforcement**: Device ID + user code + PIN (with rate limits/lockouts) protect each session; supervisors may authorize overrides if necessary (`backend/docs/workflows.md:42-120`).
- **Logging & Auditing**: Request IDs accompany every change; use structured logs (RFC-5424) to trace policy issuance, login failures, override usage, and telemetry ingestion errors.
- **Lockout Handling**: After consecutive PIN failures, users are locked out and must wait or request supervisor overrides (`RateLimiter`, `PinLockoutService`). Managers should coach teams on retry behavior to avoid repeated lockouts.

## Operational Metrics
- **Health Checks**: Use `GET /health` to ensure backend availability.
- **Rate Limit Monitoring**: Track rate limit warnings in logs (login/pin/telemetry) to spot abuse or misconfigured automation.
- **Policy/Telemetry Cleanup**: Plan/verify scheduled jobs (as outlined in docs) to keep retention claims valid; escalate configuration gaps if these jobs aren’t running.

## References
- Team/user/device APIs: `workflows/user-device-registration.md`, `user-device-registration-gaps.md`
- Policy workflows: `workflows/policy-distribution.md`, `docs/AdministratorsGuide.md`
- Telemetry workflows: `workflows/telemetry-collection.md`
- Backend services: `backend/src/services/team-service.ts`, `backend/src/services/supervisor-pin-service.ts`, `backend/src/services/policy-service.ts`, `backend/src/services/telemetry-service.ts`
