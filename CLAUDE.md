# SurveyLauncher — Complete Mobile Device Management System

 - Last-Updated: 2025-11-13 23:05:00Z
 - AGENTS.md is a symbolic link to CLAUDE.md

**System Status**: Backend ✅ Complete | Admin Frontend ✅ Complete | Android App 🔄 In Development

---

## 🎯 **System Overview**
SurveyLauncher is a comprehensive mobile device management (MDM) platform with three integrated components:

1. **Backend Service** (Complete) - SvelteKit API with authentication, policy management, and telemetry
2. **Admin Frontend** (Complete) - SvelteKit 5 web interface for device and user management
3. **Android Launcher App** (Planned) - Custom kiosk launcher with GPS telemetry and policy enforcement

---

## 🔗 **Detailed Implementation Workflows**

For comprehensive implementation documentation, see the individual workflow files in the [`workflows/`](./workflows/) directory:

### **Core System Workflows**
- **[User & Device Registration](./workflows/user-device-registration.md)** - Complete admin setup and user onboarding
- **[Device Authentication](./workflows/device-authentication.md)** - Multi-factor authentication with JWT session management
- **[Policy Distribution](./workflows/policy-distribution.md)** - Cryptographic policy signing and device enforcement
- **[Telemetry Collection](./workflows/telemetry-collection.md)** - Real-time GPS tracking and data processing
- **[Supervisor Override](./workflows/supervisor-override.md)** - Emergency access system with audit compliance
- **[Data Flow Architecture](./workflows/data-flow-architecture.md)** - Complete system data flow and integration patterns

Each workflow includes:
- Complete Mermaid diagrams with dark/light mode compatibility
- Step-by-step implementation with code examples
- API specifications and database schemas
- Security implementations and performance optimization
- Error handling and testing guidelines

---

## 📱 **Android Prototype Implementation Plan** (Original)

### Mode: Option A (Headwind stock + SurveyLauncher logic)
### Scope: Android launcher app with daily login, time windows, supervisor override, GPS telemetry, and policy verification/cache.

## Base Repository
- Primary: https://github.com/h-mdm/hmdm-android
- Alternative (AOSP-style, no MDM bindings): https://github.com/GrapheneOS/Launcher

## High-Level Requirements
- Daily user login (team_code + user_code + pin) via /v1/auth/login
- Time-window enforcement (policy.json, JWS-verified) with supervisor override
- Foreground GPS service (3 min, >= 50m) while session active
- Heartbeat every 10 min
- Telemetry batching to /v1/telemetry
- Kiosk-safe: run as Headwind “Content App” in Single-App Kiosk
- Offline policy cache up to 24h

## Modules to Implement
- PolicyManager (pull/verify JWS, cache, expiry)
- AuthManager (login/logout/refresh; token storage)
- SessionManager (session lifecycle; stop GPS on expiry)
- TimeGate (evaluate allowed_windows; manage override_until)
- GpsForegroundService (location loop, enqueue telemetry)
- TelemetryClient (batch POSTs)
- UI: LoginActivity, BlockerActivity, DashboardActivity, SupervisorDialog

## Android Tech Stack
- Kotlin, minSdk 30, target 34
- Retrofit2 + OkHttp3 (TLS; optional CertificatePinner)
- WorkManager (heartbeat, policy refresh)
- FusedLocationProviderClient (foreground service)
- EncryptedSharedPreferences + Room (telemetry buffer)
- Ed25519 signature verification for policy (libsodium-jni or equivalent)

## API Endpoints - need to be implemented in paralle in a Sveltekit based service
- GET /v1/policy/:deviceId  -> returns JWS-signed policy JSON
- POST /v1/auth/login       -> { session, access_token, refresh_token? }
- POST /v1/auth/logout      -> end session
- POST /v1/auth/refresh     -> new access token
- GET  /v1/auth/whoami      -> current user/session
- POST /v1/supervisor/override/login  -> { override_until, token }
- POST /v1/telemetry        -> batched events (heartbeat, gps, gate.blocked, pin.verify)

## Telemetry Event Examples
{{ "t": "heartbeat", "ts": "2025-11-12T10:00:00Z", "battery": 0.85 }}
{{ "t": "gps", "ts": "2025-11-12T10:03:00Z", "lat": 28.56, "lon": 77.20, "acc_m": 6.8 }}
{{ "t": "gate.blocked", "ts": "...", "reason": "out_of_hours" }}
{{ "t": "pin.verify", "ts": "...", "result": "success" }}

## Task List (Atomic)
1. Fork hmdm-android repo to local folder `surveylauncher` and create new app module.
2. Replace stock MainActivity with:
   - LoginActivity (team_code, user_code, pin)
   - BlockerActivity (out-of-hours screen with SupervisorDialog)
   - DashboardActivity (session info, GPS indicator)
3. Implement PolicyManager (GET /v1/policy/:deviceId, Ed25519 verify, 24h cache).
4. Implement AuthManager + SessionManager (login/logout/refresh; EncryptedSharedPreferences store).
5. Implement TimeGate (allowed_windows, grace_minutes, override_until).
6. Implement GpsForegroundService (3 min interval, >= 50m displacement; stop when session ends).
7. Implement TelemetryClient (batching; retries with backoff).
8. WorkManager jobs: HeartbeatWorker (10 min), PolicyWorker (6h), TelemetryUploader (on demand).
9. Integrate Headwind content-app intents/receivers; ensure kiosk safety.
10. Add JSON structured logging (include request_id, session_id).
11. Instrumentation tests: login, blocker timing, GPS start/stop, offline cache expiry.
12. Create build variant `pilotRelease` with shrinker/obfuscation enabled.

## Acceptance Criteria (Prototype)
- Login succeeds with server; session maintained; refresh token flow works.
- Blocker shows outside allowed windows; Supervisor override extends window.
- GPS telemetry collected at 3 min cadence while session active; heartbeats at 10 min.
- Offline policy cache works ≤ 24h; blocks after expiry until refreshed.
- Runs as Headwind content app; no unauthorized exit paths.

## Dev Notes (Code Hints)
- Manifest permissions: ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, FOREGROUND_SERVICE, INTERNET, RECEIVE_BOOT_COMPLETED
- Foreground notification channel: "SurveyLauncher GPS"
- OkHttp Interceptors: Authorization (Bearer), Request-Id (UUID)
- Certificate pinning (optional): OkHttp CertificatePinner for api host
- Policy time-anchor: compare device UTC to policy.server_now_utc; reject skew > 180s
- Store no PIN at rest; only tokens & non-sensitive session metadata

## Quick Start (Commands)
```bash
git clone https://github.com/h-mdm/hmdm-android surveylauncher
cd surveylauncher
# add app module org.aiims.surveylauncher and wire as content app entry
# add dependencies:
#  - retrofit2:2.11.0
#  - okhttp:4.12.0
#  - work-runtime-ktx:2.9.0
#  - play-services-location:21.3.0
#  - libsodium-jni (or Ed25519 verify lib)
./gradlew assembleDebug
```

## Deliverables
- Android Studio project with modules and code for the above features
- APK build (pilotRelease) for Headwind deployment
- README with provisioning steps (set as Single-App Kiosk content app)









# BACKEDN SERVICE
# SurveyLauncher — Codex Implementation Plan (FULL, with Backend Details)
_Last updated: 2025-10-18 13:53:12Z_

This document is optimized for `codex-cli` / LLM agents to scaffold and implement the **entire backend** required for Option A (Headwind stock + SurveyLauncher app logic).

---

## 0) TL;DR Targets

- **Routes (v1)**: policy, telemetry, PIN (supervisor), auth (device-user daily login), supervisor override, health.
- **DB**: device, team, user, user_pin, session, pin (supervisor), telemetry_event, policy_issue, jwt_revocation.
- **Security**: JWS-signed policies, Argon2id verifiers, JWT access/refresh + JTI revocation, TLS, structured audit logs (RFC-5424-ish).
- **Ops**: env validation (Zod), request-id logging, rate limits, pagination, retention jobs, seed scripts.

---

## 1) Project Layout (SvelteKit + Drizzle)

```
src/
  lib/
    config/
      env.ts                    # Zod-verified environment
    server/
      db/
        schema.ts               # Drizzle schema
        migrations/             # Generated SQL migrations
        index.ts                # Drizzle client
      utils/
        logger.ts               # RFC-5424 line logger, request-id, audit helper
        crypto.ts               # Argon2id, JWS (Ed25519), AEAD helpers
        auth.ts                 # JWT issue/verify, JTI revoke, guards
        rateLimit.ts            # IP/device rate limits
      services/
        policy.service.ts
        pin.service.ts
        user.service.ts
        session.service.ts
        telemetry.service.ts
      validators/
        policy.zod.ts
        auth.zod.ts
        telemetry.zod.ts
  routes/
    api/
      v1/
        health/+server.ts
        policy/[deviceId]/+server.ts
        telemetry/+server.ts
        pin/
          verify/+server.ts
        auth/
          login/+server.ts
          logout/+server.ts
          refresh/+server.ts
          whoami/+server.ts
          heartbeat/+server.ts
          session/
            end/+server.ts
        supervisor/
          override/
            login/+server.ts
            revoke/+server.ts
```

---

## 2) Environment Variables (`.env.example`)

```
# Server
PUBLIC_BASE_URL=https://api.aiims.app
PORT=3000
NODE_ENV=production

# Database (PostgreSQL)
DATABASE_URL=postgres://user:pass@host:5432/surveylauncher

# JWS (Policy signing) — Ed25519
POLICY_SIGN_PUBLIC_BASE64=
POLICY_SIGN_PRIVATE_BASE64=

# JWT (Access/Refresh)
JWT_ACCESS_SECRET_BASE64=
JWT_REFRESH_SECRET_BASE64=
JWT_ISS=surveylauncher
JWT_AUD=device
JWT_ACCESS_TTL_MIN=20
JWT_REFRESH_TTL_HR=12

# Rate Limits
RL_PIN_VERIFY_PER_10M=10
RL_LOGIN_PER_10M=10
RL_TELEMETRY_PER_MIN=120

# Logging
LOG_LEVEL=info
LOG_FACILITY=10
ORG_ID=aiims
APP_ID=surveylauncher-api

# CORS
CORS_ALLOWED_ORIGINS=https://survey.aiims.app
```

---

## 3) Drizzle Schema (PostgreSQL)

```ts
// src/lib/server/db/schema.ts
import { pgTable, uuid, varchar, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";

export const team = pgTable("team", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  stateId: varchar("state_id", { length: 16 }).notNull()
});

export const device = pgTable("device", {
  id: uuid("id").defaultRandom().primaryKey(),
  androidId: varchar("android_id", { length: 64 }).notNull(),
  teamId: uuid("team_id").notNull().references(() => team.id),
  lastSeenAt: timestamp("last_seen_at"),
  lastGpsAt: timestamp("last_gps_at"),
  appVersion: varchar("app_version", { length: 32 })
}, (t) => ({
  androidIdx: index("idx_device_android").on(t.androidId)
}));

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => team.id),
  code: varchar("code", { length: 32 }).notNull(),     // short login code
  displayName: varchar("display_name", { length: 120 }).notNull(),
  role: varchar("role", { length: 24 }).notNull().default("TEAM_MEMBER"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
}, (t) => ({
  userCodeUnique: index("u_user_code_team").on(t.code, t.teamId)
}));

export const userPin = pgTable("user_pin", {
  userId: uuid("user_id").primaryKey().references(() => user.id),
  verifierHash: varchar("verifier_hash", { length: 255 }).notNull(), // Argon2id PHC
  rotatedAt: timestamp("rotated_at").defaultNow(),
  active: boolean("active").notNull().default(true)
});

export const pin = pgTable("pin", {  // supervisor/team PIN
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => team.id),
  verifierHash: varchar("verifier_hash", { length: 255 }).notNull(),
  rotatedAt: timestamp("rotated_at").defaultNow(),
  active: boolean("active").notNull().default(true)
});

export const session = pgTable("session", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => user.id),
  teamId: uuid("team_id").notNull().references(() => team.id),
  deviceId: uuid("device_id").notNull().references(() => device.id),
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 16 }).notNull().default("open"),
  overrideUntil: timestamp("override_until"),
  tokenJti: varchar("token_jti", { length: 64 })
}, (t) => ({
  userStartedIdx: index("idx_session_user_started").on(t.userId, t.startedAt)
}));

export const telemetryEvent = pgTable("telemetry_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: uuid("device_id").notNull().references(() => device.id),
  sessionId: uuid("session_id").references(() => session.id),
  ts: timestamp("ts").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  payloadJson: jsonb("payload_json").notNull()
}, (t) => ({
  devTsIdx: index("idx_telem_device_ts").on(t.deviceId, t.ts),
  sessTsIdx: index("idx_telem_session_ts").on(t.sessionId, t.ts)
}));

export const policyIssue = pgTable("policy_issue", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: uuid("device_id").notNull().references(() => device.id),
  version: varchar("version", { length: 16 }).notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  jwsKid: varchar("jws_kid", { length: 64 }).notNull()
});

export const jwtRevocation = pgTable("jwt_revocation", {
  jti: varchar("jti", { length: 64 }).primaryKey(),
  revokedAt: timestamp("revoked_at").defaultNow(),
  reason: varchar("reason", { length: 64 })
});
```

**Retention**: raw `telemetry_event` retained 90 days; nightly job aggregates or archives.

---

## 4) Validators (Zod)

```ts
// src/lib/server/validators/auth.zod.ts
import { z } from "zod";

export const LoginReq = z.object({
  device_id: z.string(),
  team_id: z.string(),
  user_code: z.string(),
  pin: z.string().min(4),
  app_version: z.string().optional(),
  ts: z.string().datetime().optional()
});

export const LoginResp = z.object({
  ok: z.literal(true),
  session: z.object({
    session_id: z.string(),
    user_id: z.string(),
    started_at: z.string(),
    expires_at: z.string(),
    override_until: z.string().nullable()
  }),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  policy_version: z.number()
});

export const TelemetryBatch = z.object({
  device_id: z.string(),
  session_id: z.string().optional(),
  events: z.array(z.object({
    t: z.string(),
    ts: z.string(),
    // plus arbitrary payload
  }))
});
```

```ts
// src/lib/server/validators/policy.zod.ts
export const PolicySchema = z.object({
  version: z.number(),
  device_id: z.string(),
  team_id: z.string(),
  tz: z.string(),
  time_anchor: z.object({
    server_now_utc: z.string().datetime(),
    max_clock_skew_sec: z.number(),
    max_policy_age_sec: z.number()
  }),
  session: z.object({
    allowed_windows: z.array(z.object({
      days: z.array(z.string()), start: z.string(), end: z.string()
    })),
    grace_minutes: z.number(),
    supervisor_override_minutes: z.number()
  }),
  pin: z.object({
    mode: z.enum(["server_verify","sealed_local"]).default("server_verify"),
    min_length: z.number().default(6),
    retry_limit: z.number().default(5),
    cooldown_seconds: z.number().default(300)
  }),
  gps: z.object({
    active_fix_interval_minutes: z.number(),
    min_displacement_m: z.number()
  }),
  telemetry: z.object({
    heartbeat_minutes: z.number(),
    batch_max: z.number()
  }),
  ui: z.object({
    blocked_message: z.string().optional()
  }).optional(),
  meta: z.object({
    issued_at: z.string(), expires_at: z.string()
  })
});
```

---

## 5) Security Building Blocks

- **Argon2id** for all PIN verifiers (`$argon2id$v=19$m=...$...`), tuned for server CPU.
- **JWS (Ed25519)** for policies. Publish `POLICY_SIGN_PUBLIC_BASE64` to devices; keep private key secure.
- **JWT (HS256/EdDSA)** for access/refresh tokens; include `jti`; store revocations in `jwt_revocation`.
- **Rate limits**: PIN verify & login per device/IP; telemetry per device.
- **Request-Id**: generate UUID per request; include in logs and responses (header `x-request-id`).

**Error envelope** (consistent JSON):
```json
{
  "ok": false,
  "error": {
    "code": "invalid_credentials",
    "message": "PIN incorrect",
    "request_id": "d3f..."
  }
}
```

---

## 6) Route Contracts (Back-End)

### `GET /api/v1/health`
- 200: `{ "ok": true, "ts": "..." }`

### `GET /api/v1/policy/:deviceId`
- Auth: device JWT or mTLS (TBD)
- Resp: `application/jose` (JWS detached or compact) containing PolicySchema JSON
- Logs: `AUDIT action="policy.issue" deviceId=... version=... exp=...`

### `POST /api/v1/pin/verify` (Supervisor PIN)
- Body: `{ "device_id","team_id","pin" }`
- 200: `{ "ok": true, "ttl_min": 120 }` or cooldown
- Rate limit: RL_PIN_VERIFY_PER_10M
- Logs: `AUDIT action="pin.verify" result=success|fail teamId=... deviceId=...`

### `POST /api/v1/telemetry`
- Body: TelemetryBatch
- 200: `{ "accepted": N }`
- Notes: silently drop malformed items; cap to `batch_max`
- Logs: `AUDIT action="telemetry.ingest" count=N deviceId=... sessionId=?`

### `POST /api/v1/auth/login`
- Body: LoginReq
- Validations:
  - device-team binding exists
  - user active, team matches
  - verify user PIN (Argon2id)
  - compute session window from Policy; set `expiresAt` = min(window end, policy expiry)
- 200: LoginResp
- 401/403/423/409 per prior plan
- Logs: `AUDIT action="user.login" result=... userCode=... deviceId=...`

### `POST /api/v1/auth/logout`
- Body: `{ "device_id","session_id" }`
- 200: `{ "ok": true, "ended_at": "..." }`
- Logs: `AUDIT action="user.logout"`

### `POST /api/v1/auth/refresh`
- Body: `{ "device_id","session_id","refresh_token" }`
- 200: `{ "ok": true, "access_token": "..." }`
- 403: session ended/expired
- Logs: `AUDIT action="token.refresh"`

### `GET /api/v1/auth/whoami`
- Auth: access token
- 200: `{ "user": {...}, "session": {...}, "policy_version": N }`

### `POST /api/v1/auth/heartbeat`
- Body: `{ "device_id","session_id","ts","battery" }`
- 200: `{ "ok": true }`
- Side effects: upsert `telemetry_event(session.heartbeat)` and update `device.last_seen_at`

### `POST /api/v1/auth/session/end`
- Body: `{ "device_id","session_id" }`
- 200: `{ "ok": true, "ended_at":"...", "reason":"out_of_hours|admin" }`
- Side effects: mark session closed, revoke JTI

### `POST /api/v1/supervisor/override/login`
- Body: `{ "device_id","team_id","pin","reason" }`
- 200: `{ "ok": true, "override_until":"...", "token":"ovr...." }`
- Logs: `AUDIT action="supervisor.override.login"`

### `POST /api/v1/supervisor/override/revoke`
- Body: `{ "device_id","session_id" }`
- 200: `{ "ok": true }`

---

## 7) Logger (RFC-5424-like)

Format:
```
<PRI>1 {ISO8601} {host} {APP_ID} - AUDIT [audit@32473 action="pin.verify" result="success" userId="u_123" teamId="t_001" deviceId="dev_001" requestId="{uuid}" latency_ms="42"]
```

- `PRI = facility*8 + severity` (use facility from env, severity Notice=5)
- Include `requestId`, `clientIp`, `userAgent` when available.
- Write to stdout; rotate at container layer.

---

## 8) Rate Limiting & Abuse Controls

- PIN verify: `RL_PIN_VERIFY_PER_10M` per deviceId + IP.
- Login: `RL_LOGIN_PER_10M` per deviceId + IP.
- Telemetry: cap batches; per-minute count.
- Exponential backoff headers: `Retry-After` on 429.

---

## 9) Migrations & Seeding

- Generate Drizzle SQL migrations; include indices as above.
- Seed helper script:
  - create team, device (bind android_id), a few users with PINs (argon2id)
  - seed supervisor `pin` per team
  - print policy signing public key (base64) for app config

---

## 10) Testing

- **Unit**: crypto (argon2id, JWS), zod validators, policy window math.
- **Integration**: login→token→whoami→refresh; pin.verify cooldown path; telemetry ingest.
- **E2E (stub)**: seed device+user, run happy-path session, verify heartbeats + GPS stored.

---

## 11) Deployment & Ops

- Run behind reverse proxy with TLS; set `Strict-Transport-Security`.
- Enable CORS for app domain.
- Health check `/api/v1/health` for load balancer.
- Observability dashboards: active sessions, last heartbeat, last GPS, overrides/day, 4xx/5xx rates.

---

## 12) Codex Tasks (atomic)

1. Scaffold project layout and env validator.
2. Implement Drizzle schema + migrations; seed script.
3. Implement `crypto.ts` (argon2id, ed25519 JWS, random JTI).
4. Implement `auth.ts` (JWT issue/verify, revocation, guards).
5. Implement `logger.ts` (request-id middleware + audit).
6. Implement validators (policy/auth/telemetry).
7. Implement routes (policy, pin, telemetry, auth suite, supervisor override, health).
8. Add rate limits and common error envelope.
9. Add tests (unit/integration) and CI steps.
10. Package Postman/OpenAPI spec (optional) for QA.

---

## 13) Example Policy JSON (signed JWS payload)

```json
{
  "version": 3,
  "device_id": "dev_001",
  "team_id": "t_012",
  "tz": "Asia/Kolkata",
  "time_anchor": { "server_now_utc":"2025-10-18T12:00:00Z","max_clock_skew_sec":180,"max_policy_age_sec":86400 },
  "session": {
    "allowed_windows": [
      {"days":["Mon","Tue","Wed","Thu","Fri"], "start":"08:00", "end":"19:30"},
      {"days":["Sat"], "start":"09:00", "end":"15:00"}
    ],
    "grace_minutes": 10,
    "supervisor_override_minutes": 120
  },
  "pin": { "mode":"server_verify","min_length":6,"retry_limit":5,"cooldown_seconds":300 },
  "gps": { "active_fix_interval_minutes":3, "min_displacement_m":50 },
  "telemetry": { "heartbeat_minutes":10, "batch_max":50 },
  "ui": { "blocked_message":"Out of working hours." },
  "meta": { "issued_at":"2025-10-18T12:00:00Z","expires_at":"2025-10-19T12:00:00Z" }
}
```

---

## 14) Command Hints

```
# Generate
codex generate backend --from ./SurveyLauncher_CodexPlan_FULL.md --target sveltekit

# Run migrations
npm run db:generate && npm run db:migrate

# Dev
npm run dev

# Test
npm run test

# Seed
npm run seed
```

---

## 15) Acceptance Criteria (Pilot)

- Login works within allowed windows; session expires at window end or by admin end.
- Telemetry accepts and stores heartbeats/GPS; dashboards show liveness map.
- Supervisor PIN override extends access with TTL; all actions audit-logged.
- Rate limits protect PIN/login; consistent error envelopes; 95% requests < 150ms P95.


