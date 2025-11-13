# Backend Mock API Priorities (Android Unblocker)

Goal: deliver the minimum backend surface so the Android launcher can integrate immediately. For this sprint, every route returns deterministic mock data (no DB), but matches final payload shapes from `Agent.md`. Use SvelteKit endpoints (or a lightweight Express adapter) with in-memory fixtures.

## Priority Order

1. **Auth Login (`POST /api/v1/auth/login`)**
   - Unblocks LoginActivity and session bootstrap.
   - Mock: accept any payload; return canned session/access token, policy version, override null.
2. **Policy Fetch (`GET /api/v1/policy/:deviceId`)**
   - Required for PolicyManager + TimeGate.
   - Mock: always return same signed-looking JSON (skip JWS for now, but wrap in `application/json` with `mock_jws` field).
3. **Telemetry Batch (`POST /api/v1/telemetry`)**
   - Needed so GPS + heartbeat batching can POST without errors.
   - Mock: validate array presence, cap accepted count to `Math.min(len, 50)` and echo it.
4. **WhoAmI (`GET /api/v1/auth/whoami`)**
   - Allows dashboard refresh and token verification flows.
   - Mock: return same session/user snapshot as login, irrespective of Authorization header.
5. **Supervisor Override (`POST /api/v1/supervisor/override/login`)**
   - Unblocks BlockerActivity override UI.
   - Mock: respond with fixed `override_until` (now+120m) and `token: "override-mock"`.

## Mock Payload Templates

### `POST /api/v1/auth/login`
```json
{
  "ok": true,
  "session": {
    "session_id": "sess-mock-001",
    "user_id": "user-mock-001",
    "started_at": "2025-11-12T10:00:00Z",
    "expires_at": "2025-11-12T18:00:00Z",
    "override_until": null
  },
  "access_token": "mock-access-token",
  "refresh_token": "mock-refresh-token",
  "policy_version": 3
}
```

### `GET /api/v1/policy/:deviceId`
```json
{
  "mock_jws": true,
  "payload": {
    "version": 3,
    "device_id": "dev-mock-001",
    "team_id": "t_012",
    "tz": "Asia/Kolkata",
    "time_anchor": {
      "server_now_utc": "2025-11-12T10:00:00Z",
      "max_clock_skew_sec": 180,
      "max_policy_age_sec": 86400
    },
    "session": {
      "allowed_windows": [
        { "days": ["Mon","Tue","Wed","Thu","Fri"], "start": "08:00", "end": "19:30" },
        { "days": ["Sat"], "start": "09:00", "end": "15:00" }
      ],
      "grace_minutes": 10,
      "supervisor_override_minutes": 120
    },
    "pin": { "mode": "server_verify", "min_length": 6, "retry_limit": 5, "cooldown_seconds": 300 },
    "gps": { "active_fix_interval_minutes": 3, "min_displacement_m": 50 },
    "telemetry": { "heartbeat_minutes": 10, "batch_max": 50 },
    "meta": { "issued_at": "2025-11-12T10:00:00Z", "expires_at": "2025-11-13T10:00:00Z" }
  }
}
```

### `POST /api/v1/telemetry`
```json
{
  "accepted": 3,
  "dropped": 0
}
```

### `GET /api/v1/auth/whoami`
```json
{
  "user": { "id": "user-mock-001", "code": "u001", "team_id": "t_012", "display_name": "Mock User" },
  "session": {
    "session_id": "sess-mock-001",
    "device_id": "dev-mock-001",
    "expires_at": "2025-11-12T18:00:00Z",
    "override_until": null
  },
  "policy_version": 3
}
```

### `POST /api/v1/supervisor/override/login`
```json
{
  "ok": true,
  "override_until": "2025-11-12T21:00:00Z",
  "token": "override-mock"
}
```

## Implementation Notes
- Keep all fixtures in `src/lib/mockData.ts` to centralize future edits.
- Add `MOCK_API=true` feature flag in `.env` to guard these routes; later switch to real services while retaining mock mode for local dev.
- Include `x-request-id` header even in mock responses so Android logging stays stable.
- For telemetry/login rate limits, simply log to console now but structure handler to accept limiter later.

## Testing Hooks
- Provide `npm run dev:mock` script that sets `MOCK_API=true` and starts SvelteKit dev server.
- Add lightweight contract tests (Vitest) asserting status codes + JSON structure so mocks don’t drift from final schema.
