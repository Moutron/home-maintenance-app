# Production Readiness Checklist

This document outlines what’s in place and what’s recommended before going to production. Use it as a runbook and prioritization guide.

---

## 1. Security

| Item | Status | Notes |
|------|--------|--------|
| **Auth (Clerk)** | ✅ Done | Middleware protects routes; public: `/`, sign-in, sign-up, `/api/webhooks/*` |
| **Cron protection** | ✅ Done | `CRON_SECRET` + `Authorization: Bearer <secret>` on warranties/check-expiring, budget/alerts POST, notifications/push/send. Set `CRON_SECRET` in prod; Vercel Crons send it automatically when configured. |
| **Env validation** | ✅ Done | `lib/prisma.ts` throws if `DATABASE_URL` missing at startup |
| **Security headers** | ✅ Done | Next.js config adds X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| **No secrets in logs** | ⚠️ Review | Many `console.log` in API routes (e.g. homes, tasks/generate). Avoid logging request bodies or tokens; consider stripping in prod or using a logger that redacts |
| **Rate limiting** | ✅ Done | In-memory per-IP in middleware: 60 req/min (configurable via `RATE_LIMIT_*`); excludes health, webhooks, cron; zero cost; set `RATE_LIMIT_DISABLED=1` in E2E/CI if needed |
| **CORS** | ✅ Default | Next.js same-origin by default; expand only if you add a separate API domain |
| **Input validation** | ✅ Done | Zod schemas on homes, tasks, inventory, etc. |
| **Clerk production keys** | ⚠️ Manual | Use Clerk production instance and `pk_live_` / `sk_live_` in production env. Walkthrough: [docs/CLERK_PRODUCTION_KEYS.md](CLERK_PRODUCTION_KEYS.md) |

**Recommended before launch:**  
- Switch Clerk to production keys.  
- Rate limiting is on for all `/api/*` except health, webhooks, and cron; tune `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_MS` if needed. For global limits across instances, consider Upstash Redis later.  
- Audit and reduce `console.log` in API routes (or use a logger that redacts PII/secrets).

---

## 2. Infrastructure & Deployment

| Item | Status | Notes |
|------|--------|--------|
| **Next.js production build** | ✅ Done | `output: 'standalone'` in production for Docker |
| **Dockerfile** | ✅ Done | Multi-stage; non-root user; Prisma client + migrations dir copied |
| **Docker Compose (prod)** | ✅ Done | `docker-compose.prod.yml`: app + Postgres, healthcheck on DB, env list |
| **Vercel** | ✅ Ready | `vercel.json` with cron for warranties; set env vars in dashboard |
| **Database** | ⚠️ Manual | Use managed PostgreSQL (Vercel Postgres, Neon, RDS, etc.) in prod; connection string in `DATABASE_URL`. Free-to-start guide: [docs/MANAGED_POSTGRES.md](MANAGED_POSTGRES.md) |
| **Migrations** | ✅ Done | Prisma migrations in repo; run `prisma migrate deploy` in release pipeline or post-deploy |
| **DB connection pooling** | ⚠️ Optional | For serverless, consider PgBouncer or provider pooling (e.g. Neon serverless driver) if you hit connection limits |
| **Backups** | ❌ Manual | Enable automated backups on your managed Postgres; document restore process |
| **Health check** | ✅ Done | `GET /api/health` returns 200 and DB status (optional) for load balancers/K8s |

**Recommended before launch:**  
- Point `DATABASE_URL` to managed Postgres with backups.  
- Run `prisma migrate deploy` as part of deploy (CI or release job).  
- Document backup/restore and rollback steps.

---

## 3. Monitoring & Observability

| Item | Status | Notes |
|------|--------|--------|
| **Health endpoint** | ✅ Done | `GET /api/health` for uptime checks |
| **Structured logging** | ❌ Not done | API routes use `console.log`/`console.error`. Consider Pino/Winston and JSON logs; redact PII and secrets |
| **Error tracking** | ✅ Done | Sentry (`@sentry/nextjs`): client/server/edge init; `instrumentation.ts` + `onRequestError`; optional when DSN unset |
| **APM / performance** | ❌ Optional | Vercel Analytics or Datadog/New Relic for front-end and API latency |
| **Uptime monitoring** | ❌ Manual | Use UptimeRobot, Better Uptime, or provider alerts on `/api/health` |
| **Alerts** | ❌ Manual | Configure alerts on error rate, latency, and DB/Redis (if added) |

**Recommended before launch:**  
- Set `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` (and `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for releases) in production; connect Sentry to GitHub/issues.  
- Reduce or standardize `console.*` in API routes; avoid logging full request bodies.  
- Set up uptime checks and basic alerts on health and 5xx rate.

---

## 4. CI/CD & Testing

| Item | Status | Notes |
|------|--------|--------|
| **Unit / API / component tests** | ✅ Done | Vitest; run in CI |
| **E2E tests** | ✅ Done | Playwright; smoke and critical flows in CI; some workflows `continue-on-error: true` |
| **CI workflow** | ✅ Done | `.github/workflows/test.yml`: Postgres service, migrate, unit, API, component, coverage, E2E |
| **Deploy pipeline** | ⚠️ Platform | Vercel: connect repo and auto-deploy. Step-by-step: [docs/VERCEL_SETUP.md](VERCEL_SETUP.md). For Docker: add a job that builds and pushes image, then deploy to your host |
| **Secrets in CI** | ⚠️ Manual | Store `DATABASE_URL`, Clerk, OpenAI, etc. in GitHub Secrets (or Vercel env) for E2E/deploy; never commit |
| **Migrations in deploy** | ⚠️ Manual | Run `npx prisma migrate deploy` in deploy step or a dedicated release job |

**Recommended before launch:**  
- Harden E2E: fix or remove `continue-on-error` where possible; run against staging.  
- Document deploy steps (including migrations and env vars).  
- Add a simple “deploy” or “release” job if not using Vercel (e.g. build Docker image and deploy).

---

## 5. Performance

| Item | Status | Notes |
|------|--------|--------|
| **DB indexes** | ✅ Done | Prisma schema has `@@index` on common filters (userId, homeId, nextDueDate, etc.) |
| **Caching** | ✅ Done | PropertyCache (30d), ZipCodeCache (90d) to limit external API calls |
| **Image optimization** | ✅ Done | Next.js Image component available; upload route supports Sharp |
| **Bundle size** | ⚠️ Optional | Run `@next/bundle-analyzer` occasionally; lazy-load heavy UI if needed |
| **Connection pooling** | ⚠️ Optional | Use provider pooling or PgBouncer if you see “too many connections” in serverless |

**Recommended before launch:**  
- Load test critical paths (e.g. dashboard, task list, create home).  
- Optionally add caching headers or CDN for static assets and public API responses where appropriate.

---

## 6. Reliability & Resilience

| Item | Status | Notes |
|------|--------|--------|
| **Graceful degradation** | ✅ Partial | Property/climate routes handle missing API keys; email/push check for config before sending |
| **Retries** | ⚠️ Partial | No global retry for external APIs; implement in property-enrichment, Resend, etc. if needed |
| **Error boundaries** | ✅ Done | `app/global-error.tsx` catches unhandled React errors; reports to Sentry when DSN set |
| **Circuit breaker** | ❌ Not done | Optional for external APIs (RentCast, OpenAI) to avoid cascading failures |
| **Idempotency** | ⚠️ Review | Home create is upsert; task/inventory create is not idempotent; add idempotency keys if you need safe retries |

**Recommended before launch:**  
- Ensure all third-party calls (OpenAI, Resend, property/climate) handle timeouts and failures without crashing the process.  
- Add retries with backoff for critical external calls (e.g. Resend, OpenAI).

---

## 7. Configuration & Environment

| Item | Status | Notes |
|------|--------|--------|
| **.env.example** | ✅ Done | Documents required and optional vars |
| **Required env at startup** | ✅ Done | `DATABASE_URL` validated in `lib/prisma.ts` |
| **Optional env** | ✅ Handled | Routes check for RESEND_API_KEY, OPENAI_API_KEY, etc. before using |
| **Production env** | ⚠️ Manual | Set all production values in Vercel (or host) env; use production Clerk, Stripe, and API keys |
| **Secrets rotation** | ❌ Manual | Document how to rotate DATABASE_URL, Clerk, OpenAI, CRON_SECRET, etc. |

**Recommended before launch:**  
- Align production env with README and .env.example.  
- Use different Clerk and Stripe apps (or keys) for staging vs production.

---

## 8. Legal & Compliance

| Item | Status | Notes |
|------|--------|--------|
| **Privacy policy** | ✅ Placeholder | `/privacy` page and footer links; replace placeholder text before launch |
| **Terms of service** | ✅ Placeholder | `/terms` page and footer links; sign-up requires accepting terms; replace placeholder text before launch |
| **Cookie consent** | ⚠️ Optional | Clerk and analytics may set cookies; add banner if targeting EU or required by policy |
| **Data retention** | ⚠️ Review | Define how long to keep tasks, history, and logs; implement deletion/export if needed (GDPR) |

**Recommended before launch:**  
- Publish privacy policy and terms; link from app and sign-up.  
- Decide retention and deletion policy; implement user data export/delete if required.

---

## 9. Documentation & Runbooks

| Item | Status | Notes |
|------|--------|--------|
| **README** | ✅ Done | Requirements, how to run, features, API overview |
| **Architecture** | ✅ Done | `docs/ARCHITECTURE.md` with Mermaid (APIs, flow, DB) |
| **Production checklist** | ✅ Done | This document |
| **Deploy runbook** | ✅ Done | [docs/DEPLOY.md](DEPLOY.md): Vercel and Docker steps, env checklist, migrations, health check, rollback, where logs/errors live |
| **Incident runbook** | ❌ Optional | How to check logs, DB, and third-party status; who to escalate to |

**Recommended before launch:**  
- Deploy runbook is in [docs/DEPLOY.md](DEPLOY.md); link it from README if desired.  
- Add an incident runbook (how to check logs, DB, third-party status; escalation) if the team needs it.

---

## 10. Quick Wins Implemented

- **`GET /api/health`** – Returns `{ ok: true }` or `{ ok: false, error }` if DB check fails; no auth. Use for load balancers and uptime checks.
- **Security headers** – Set in `next.config.ts`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Error tracking (Sentry)** – Client/server/edge init; `instrumentation.ts` with `onRequestError`; `global-error.tsx` boundary. Enable by setting `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` (see `.env.example`).
- **Rate limiting** – In-memory per-IP in middleware (`lib/rate-limit.ts`): 60 requests per minute for `/api/*` (excludes health, webhooks, cron). Configurable via `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_MS`; set `RATE_LIMIT_DISABLED=1` to disable (e.g. E2E). Zero cost; for strict global limits use Upstash Redis later.
- **Deploy runbook** – [docs/DEPLOY.md](DEPLOY.md): Vercel and Docker steps, env checklist, migrations, health check, rollback, where logs and errors live.

---

## Summary: Must-Have Before Production

1. **Security:** Production Clerk (and Stripe) keys; set `CRON_SECRET`; audit logs for secrets/PII.  
2. **Infrastructure:** Managed PostgreSQL with backups; run migrations on deploy.  
3. **Monitoring:** Health checks and alerts; error tracking (Sentry) in place—set DSN in prod.  
4. **CI/CD:** Migrations in deploy; secrets in GitHub/Vercel; E2E against staging if possible.  
5. **Legal:** Privacy policy and terms linked from the app.  
6. **Docs:** Deploy/rollback runbook and env list (README + this checklist).

Use this checklist as a living doc: update status as you complete items and add new rows for provider-specific steps (e.g. Vercel, AWS).
