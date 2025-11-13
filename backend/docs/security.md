# SurveyLauncher Backend – Security Issues & Hardening Notes

These notes surface security concerns inferred from the current repository layout and documentation. They should guide mitigations, automated checks, and roadmap decisions.

## Secret Management
- **Environment file leakage** – `.env.example` is a convenient template but sensitive values (JWT secrets, Ed25519 keys) can easily be copied into version control or shared in developer chats. Enforce `.env` exclusion, add `pre-commit` hooks to block secrets, and recommend secure storage (Vault, AWS Secrets Manager) with short-lived credentials instead of static env entries.
- **Key rotation configuration gaps** – the current rotation guide requires manually keeping old/new keys in the same `.env`. If either secret is accidentally blank, the authentication middleware may throw or reject all tokens. Validate on startup that both pre/post secrets are present and log warnings when rotation fields exist without values.

## Authentication & Token Handling
- **Lack of HTTPS enforcement in dev** – auth flows (login, token refresh, telemetry) run at `http://localhost:3000` by default. Without TLS in production (HTTPS redirect or HSTS), access/refresh tokens could be intercepted. Add a middleware or loadbalancer rule that rejects plain HTTP traffic in non-development environments and document TLS requirements.
- **Refresh token reuse window** – refresh tokens may not be single-use, and there is no obvious nonce or sliding window. A stolen refresh token may remain valid until expiry (7 days). Consider storing refresh token IDs in the database and rotating on each refresh to enforce single-use semantics.
- **Session revocation race** – logout marks the session and adds JWT to revocation table, but there may be a small window when the token is rebroadcast before the DB write completes. Add atomic operations or queue writes via `deferred` to ensure revoke records exist before logout response is sent.

## Policy Signing & Validation
- **Key exposure risk** – private Ed25519 keys must never be committed or logged. Yet the docs instruct copying base64 values between systems. Implement automated scans (e.g., `git-secrets`, `detect-secrets`) against the repo to ensure base64 key patterns are flagged before merge.
- **Unsigned policy fallback** – if the signing service (`POLICY_SIGN_PRIVATE_BASE64`) is not configured, the policy endpoint may still respond with `success: true` but without signatures, or worst-case, throw. Add startup-time guard that refuses to start without a valid key and returns a clear error code when a signed policy cannot be produced.

## Rate Limiting & Abuse Protection
- **Device/IP rate limit bypass** – rate limits tied to device IDs (`deviceId`) can be spoofed or reset by crafting new IDs. Supplement with IP-based limits and anomaly detection (e.g., more than `RATE_LIMIT_MAX_REQUESTS / min` from one IP) before allowing sensitive endpoints.
- **Telemetry endpoint DoS** – the telemetry ingestion endpoint accepts up to `TELEMETRY_BATCH_MAX` items, which may cause heavy DB work if unbounded batches are sent. Ensure there are both size and processing time guards, and log samples of oversized batches for investigation.

## Logging & Observability
- **Sensitive info in structured logs** – structured JSON logging is great, but ensure values such as `pin`, `pinHash`, JWTs, or Ed25519 secrets are never serialized. Add a sanitizer in `logger.ts` and audit the log schema regularly.
- **Request ID propagation** – errors mention `request_id`, yet there is no guarantee that every error path attaches it (especially in middleware). Audit middleware to ensure request IDs are generated/forwarded early and included in every error response for incident triage.

## Operational & Deployment
- **Health endpoint not verifying downstream dependencies** – `/health` simply responds 200 even if DB, key signing, or telemetry queue is down. Extend it to run lightweight checks (e.g., ping DB, verify signing key) and return 503 when critical dependencies fail.
- **Permission defaults for DB access** – Postgres connection pooling uses a single connection string. If that user is human-level (superuser), any SQL injection could escalate. Document the need for least-privilege database roles and configure migrations to run with a higher privilege only.

## Documentation & Testing Gaps
- **Mock mode bypasses security checks** – `npm run dev:mock` returns deterministic data without JWT verification or rate limiting. Teams may test login/telemetry flows there and miss security regressions. Flag mock mode prominently, and add automated smoke tests against the full dev server to catch issues.
