# Security & Compliance Guide

## Purpose
This guide gathers the Security/Compliance perspective so infosec reviewers, auditors, and security-focused engineers have a concise view of the backend’s mitigations, outstanding hardening notes, and reference links.

## Key Security Controls
- **Secrets management**: JWT secrets and Ed25519 keys live in `.env` (see `backend/.env.example`). Keep `.env` out of repo, rotate keys frequently, and prefer vault storage (per `backend/docs/security.md`).
- **Authentication hardening**: Multi-factor login (deviceId + userCode + PIN) with Argon2/scrypt hashing, 5-attempt lockouts, rate limiting (device/IP/PIN) enforced in `AuthService` and `rate-limiter.ts` (`backend/docs/workflows.md:42-120`, `backend/docs/security.md`).
- **JWT & policy signing**: Access/refresh/override tokens include JTIs stored in `jwt_revocations`. Policies are signed with Ed25519 and validated on devices; missing keys now prevent startup and issuance (`backend/src/services/jwt-service.ts`, `policy-service.ts`, `backend/docs/security.md`).
- **Data protection**: Zod schemas validate requests, Drizzle ORM prevents SQL injection, structured JSON logs avoid sensitive fields, and telemetry batches reject invalid coordinates/timestamps (`backend/src/services/telemetry-service.ts`, `backend/docs/security.md`).

## Compliance Considerations
- **Audit trails**: Every critical action (login, policy issuance, supervisor override) logs RFC-5424 structured messages with request IDs (`logger.ts`, README).
- **Retention & cleanup**: Documented 24-hour retention for telemetry/policy data must be enforced via cleanup jobs; plan scheduled deletes or TTL caches (not yet implemented—see `docs/TopLevelNextTasks.md`).
- **Rate limiting & anomaly detection**: Device and IP rate limits (see `rate-limiter.ts`) reduce brute-force opportunities; monitor logs for repeated `RATE_LIMITED` or `ACCOUNT_LOCKED` responses.
- **Incident response**: Health endpoint, structured logs, and request IDs enable quick triage; ensure tokens/policy revocations are audited via `jwt_revocations` and `policyIssues` tables.

## Outstanding Hardening Notes
- Enforce TLS in production so tokens/policies aren’t exposed (`backend/docs/security.md`).
- Consider single-use refresh tokens stored in DB to guard against replay.
- Implement telemetry/policy deletion jobs to honor the retention claim and avoid data accumulation.
- Monitor for secrets leaked in logs or commits; integrate `detect-secrets`/`git-secret` in CI.

## Useful References
- Hardening notes: `backend/docs/security.md`
- Policy signing: `backend/src/services/policy-service.ts`
- Authentication flows: `backend/docs/workflows.md` and `README.md`
- Rate limiting & PIN lockout: `backend/src/services/rate-limiter.ts`, `backend/src/services/auth-service.ts`
