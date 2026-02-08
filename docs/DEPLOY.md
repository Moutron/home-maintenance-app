# Deploy Runbook

This runbook covers how to deploy Home Maintenance Pro to production, verify the deployment, roll back if needed, and where to find logs and errors.

---

## Prerequisites

Before deploying:

1. **Managed PostgreSQL** – Use a hosted database (Vercel Postgres, Neon, AWS RDS, etc.). Set `DATABASE_URL` to the production connection string. Enable automated backups. For a free-to-start option, see [docs/MANAGED_POSTGRES.md](MANAGED_POSTGRES.md).
2. **Environment variables** – All required and optional vars for your deployment target (see [Environment checklist](#environment-checklist) below).
3. **Clerk** – Production instance with `pk_live_` / `sk_live_` keys for production.
4. **Sentry** (optional) – Create a project at [sentry.io](https://sentry.io) and set `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` for error tracking.

---

## Deploying to Vercel

For a full step-by-step walkthrough (import project, env vars, first deploy, migrations), see **[docs/VERCEL_SETUP.md](VERCEL_SETUP.md)**.

### 1. Connect the repo

- In [Vercel](https://vercel.com), import the Git repository.
- Set the **Framework Preset** to Next.js (auto-detected).
- **Root Directory** stays as `.` unless the app lives in a subdirectory.

### 2. Set environment variables

In the Vercel project **Settings → Environment Variables**, add at least:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Production PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (production) |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (production) |
| `OPENAI_API_KEY` | Yes | For AI task generation and photo analysis |
| `NEXT_PUBLIC_APP_URL` | Yes | Production URL, e.g. `https://your-app.vercel.app` |
| `CRON_SECRET` | Yes if using crons | Secret for cron endpoints; Vercel Crons send it when configured |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Optional | Error tracking |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Optional | For source maps and releases |

Add any optional vars you use (Resend, Stripe, Google Maps, RentCast, etc.) from [.env.example](../.env.example).

Scope variables to **Production** (and **Preview** if you want staging to use them).

### 3. Run migrations

Vercel does not run Prisma migrations automatically. Do one of the following:

**Option A – Run before deploy (recommended)**  
From your machine or CI, against the **production** database:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Then deploy from Vercel (git push or “Redeploy”).

**Option B – Vercel Build Command**  
To run migrations during the build (use only if your DB allows connections from Vercel’s build network):

- **Build Command:** `npx prisma migrate deploy && next build`  
- Ensure `DATABASE_URL` is set for the build environment.

**Option C – Post-deploy script**  
Use a separate job (GitHub Action, cron, or manual) that runs `npx prisma migrate deploy` with production `DATABASE_URL` after each deploy.

### 4. Configure crons (optional)

The app uses [vercel.json](../vercel.json) for cron. In Vercel:

- **Settings → Crons** – Ensure the cron for `/api/warranties/check-expiring` is enabled.
- Set **CRON_SECRET** in env and configure the cron to send `Authorization: Bearer <CRON_SECRET>` (Vercel may do this automatically for Vercel Crons).

### 5. Deploy

- **Git:** Push to the connected branch (e.g. `main`). Vercel builds and deploys automatically.
- **Manual:** Vercel dashboard → **Deployments** → **Redeploy** for the latest commit.

---

## Deploying with Docker

### 1. Build the image

From the repo root:

```bash
docker build -t home-maintenance-app:latest .
```

### 2. Database and env

Ensure Postgres is running (e.g. via `docker-compose.prod.yml` or your own DB). Create a `.env` (or export env) with at least:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL` (e.g. `https://your-domain.com`)
- `CRON_SECRET` if you call cron endpoints

See [docker-compose.prod.yml](../docker-compose.prod.yml) for the list of env vars the app container expects.

### 3. Run migrations

Against the **production** database:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Or run the same command inside the app container after it’s up, if it has network access to the DB.

### 4. Start the app

**Using Docker Compose (app + Postgres):**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Standalone container (external DB):**

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..." \
  -e CLERK_SECRET_KEY="..." \
  -e OPENAI_API_KEY="..." \
  -e NEXT_PUBLIC_APP_URL="https://..." \
  --name home-maintenance-app \
  home-maintenance-app:latest
```

---

## Post-deploy verification

### Health check

```bash
curl -s https://your-app-url/api/health
```

Expected:

- **200:** `{"ok":true,"timestamp":"..."}` – App and DB are reachable.
- **503:** `{"ok":false,"error":"Database unreachable",...}` – DB connection issue.

Use this URL in load balancers, uptime checks (e.g. UptimeRobot, Better Uptime), and runbooks.

### Smoke checks

- Open the app URL and sign in (Clerk).
- Load dashboard and a key page (e.g. tasks, homes).
- Optionally trigger an API that uses the DB (e.g. create a task) to confirm writes.

---

## Rollback

### Vercel

1. **Deployments** → find the last known-good deployment.
2. Click **⋯** → **Promote to Production** (or **Redeploy** with that commit).
3. If a bad migration was applied, fix or revert the migration and run `prisma migrate deploy` again against the production DB (or restore DB from backup first).

### Docker

1. Redeploy the previous image tag, e.g.:

   ```bash
   docker stop home-maintenance-app
   docker run -d ... home-maintenance-app:previous-tag
   ```

2. If the DB was migrated, restore from backup or run a reverted migration as needed.

### Database migrations

- **Avoid** editing or deleting applied migrations in production. Prefer adding a new migration to fix state.
- If you must revert, restore the database from a backup taken before the bad deploy, then redeploy the previous app version.

---

## Where logs and errors live

| Source | Where to look |
|--------|----------------|
| **Vercel** | **Project → Deployments → [deployment] → Logs** (runtime and build). **Settings → Functions** for serverless logs. |
| **Sentry** | [sentry.io](https://sentry.io) → your project. Uncaught errors and API 5xx (when `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set). |
| **Docker** | `docker logs home-maintenance-app-prod` (or your container name). For Compose: `docker-compose -f docker-compose.prod.yml logs -f app`. |

Use the health endpoint and Sentry (if enabled) for alerts; use Vercel or Docker logs for request-level debugging.

---

## Environment checklist

Use this list with [.env.example](../.env.example) to ensure production env is complete.

**Required**

- [ ] `DATABASE_URL` – Production PostgreSQL
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` – Clerk production
- [ ] `CLERK_SECRET_KEY` – Clerk production
- [ ] `OPENAI_API_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` – Full production URL

**Required if using crons**

- [ ] `CRON_SECRET` – Same value used by your cron caller (e.g. Vercel Crons)

**Optional**

- [ ] `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` – Error tracking
- [ ] `RESEND_API_KEY` / `RESEND_FROM_EMAIL` – Email
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` – Maps/Places
- [ ] `STRIPE_*` – Billing
- [ ] `BLOB_READ_WRITE_TOKEN` or Cloudinary – Uploads
- [ ] `RENTCAST_API_KEY`, `OPENWEATHER_API_KEY`, etc. – Per-feature APIs
- [ ] `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_MS` – Override defaults (default: 60/min)

---

## Quick reference

| Action | Command / location |
|--------|--------------------|
| Health check | `GET /api/health` |
| Migrate (prod DB) | `DATABASE_URL="..." npx prisma migrate deploy` |
| Build (local) | `npm run build` |
| Run prod (local) | `npm run start` |
| Docker build | `docker build -t home-maintenance-app:latest .` |
| Docker Compose prod | `docker-compose -f docker-compose.prod.yml up -d` |
| Production checklist | [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) |
