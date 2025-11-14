# Operations & DevOps Guide

## Purpose
This guide summarizes the deployment, configuration, and operational responsibilities for running the SurveyLauncher backend reliably. It consolidates envvar guidance, health checks, migrations, and cleanup expectations for operators.

## Environment & Configuration
- **Env vars**: Use `backend/.env.example` as the template. Key values include JWT secrets, Ed25519 policy signing key, telemetry/policy tuning knobs, rate limits, and Argon2 hashing parameters (`backend/src/lib/config.ts`).
- **Secrets**: Store secrets in a secure vault or use service-managed secrets; never commit `.env` contents or base64 keys (`backend/docs/security.md`).
- **Database URLs**: Development can use SQLite (`sqlite:./dev.db`), production should point to PostgreSQL with a least-privilege user (`backend/README.md`).

## Deployment & Runtime
- **Start command**: `npm run dev` for development with hot reload, `npm run build` + `npm start` for production. Use `npm run db:seed` and `npm run db:studio` as needed for migrations and inspection.
- **Health checks**: `/health` endpoint reports availability; integrate with load balancers or platform health probes (`backend/README.md`).
- **Logging**: Structured RFC-5424 logs with request IDs (set via `x-request-id`) should stream to your observability stack; ensure log sinks strip sensitive fields (`logger.ts`).
- **Rate limiting visibility**: Rate limiter writes warnings when limits are exceeded; consider exporting counters (device/IP/PIN/telemetry) to Prometheus or Datadog.

## Maintenance Tasks
- **Database migrations**: Manage schema via Drizzle ORM migrations referenced in `backend/lib/db/schema.ts`. Run migrations before deployments.
- **Policy/telemetry cleanup**: Enforce the documented 24-hour retention by scheduling cleanup jobs (see `docs/TopLevelNextTasks.md`). Use DB scripts or cron to delete expired `telemetryEvents` and `policyIssues`.
- **JWT revocation pruning**: Periodically cleanse `jwt_revocations` entries older than their expiry to keep the table manageable (`backend/src/services/jwt-service.ts` mentions cleanup stub).
- **Key rotation**: Rotate JWT and Ed25519 keys by updating `.env` and restart/redeploy; ensure new keys exist before removing old ones to avoid auth failures.

## Monitoring & Alerts
- **Health metrics**: Monitor uptime, DB connectivity, policy signing success rate, login failures, telemetry ingestion rates, and override usage.
- **Alerts**: Trigger alerts on repeated `POLICY_ERROR`, `RATE_LIMITED`, or telemetry ingestion errors, especially when `dropped` counts spike.
- **Audit trails**: Track overrides, PIN lockouts, and policy issuance via logs (request IDs, user/team context).

## References
- Deployment/config summary: `backend/README.md`
- Environment validation: `backend/src/lib/config.ts`
- Database schema/migrations: `backend/lib/db/schema.ts`
- Operational backlog: `docs/TopLevelNextTasks.md`
