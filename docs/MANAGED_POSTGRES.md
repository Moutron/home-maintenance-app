# Managed PostgreSQL – Cost-Efficient / Free Setup

For production you need a **managed PostgreSQL** database. Here are the most cost-efficient options, with **Neon** as the recommended free-to-start choice.

---

## Recommendation: Neon (free tier)

**Neon** is serverless Postgres with a generous free tier and works very well with Next.js and Vercel.

| | Free tier |
|--|--|
| **Storage** | 0.5 GB |
| **Compute** | ~190 hours/month (scales to zero when idle) |
| **Projects** | Up to 10 |
| **Branches** | Up to 10 per project |
| **Credit card** | Not required |

- **Good for:** Next.js, Vercel, Prisma, serverless (connection pooler built-in).
- **Sign up:** [neon.tech](https://neon.tech) → Create account (GitHub/email).

---

## Quick setup: Neon

### 1. Create account and project

1. Go to **[https://neon.tech](https://neon.tech)** and sign up (GitHub or email).
2. Click **Create a project**.
3. Pick a **project name** (e.g. `home-maintenance-prod`) and **region** (choose one close to your app, e.g. US East if you deploy on Vercel).
4. Click **Create project**.

### 2. Get the connection string

1. On the project **Dashboard**, you’ll see a **Connection string** section.
2. Select **Pooled connection** (recommended for serverless/Next.js so you don’t run out of connections). It will look like:
   ```text
   postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Copy that string. You can also click **Connection details** to see:
   - **Host**
   - **Database name** (e.g. `neondb`)
   - **User** and **Password** (or use the full connection string).

### 3. Add `?schema=public` for Prisma (optional)

If you use Prisma and rely on the `public` schema (default), you can append it so Prisma is explicit:

```text
postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&schema=public
```

Your app already uses `?schema=public` in `.env.example`; keep that in the Neon URL if you use it locally.

### 4. Set in production

1. In **Vercel**: Project → **Settings → Environment Variables** → add `DATABASE_URL` with the **pooled** connection string. Scope to **Production** (and **Preview** if you want).
2. In **Docker / other hosts**: Set `DATABASE_URL` in your production env to the same pooled string.

### 5. Run migrations

Against the **production** DB (using the same `DATABASE_URL`):

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Or run this from your deploy pipeline / runbook (see [docs/DEPLOY.md](DEPLOY.md)).

### 6. Backups (free tier)

Neon’s free tier includes **point-in-time restore** for a limited retention window. For longer retention or daily backups, check Neon’s paid plans or add a separate backup job later.

---

## Other free / low-cost options

| Provider | Free tier | Notes |
|----------|-----------|--------|
| **Vercel Postgres** | Free tier (Neon-backed) | If you deploy on Vercel: add from Vercel dashboard, same connection string idea. Integrates with Vercel env. |
| **Supabase** | 500 MB DB, 2 projects | Full Postgres + auth/storage/realtime. Good if you want more than just a DB. [supabase.com](https://supabase.com) |
| **Railway** | Usage-based free credit | Postgres add-on; watch usage so you don’t exceed free credit. [railway.app](https://railway.app) |
| **ElephantSQL** | 20 MB free | Small; fine for tiny apps or trying things out. [elephantsql.com](https://www.elephantsql.com) |

- **Vercel + “just need Postgres”** → Neon or Vercel Postgres.
- **Want DB + auth/storage** → Supabase.

---

## Connection pooling (serverless)

With **serverless** (e.g. Vercel serverless functions), many short-lived connections can exhaust Postgres connection limits. Use a **pooled** connection string:

- **Neon:** Use the **“Pooled connection”** string from the dashboard (e.g. host contains `-pooler`).
- **Supabase:** Use the **“Connection pooling”** (Transaction mode) string in project Settings → Database.
- **Vercel Postgres:** Uses pooling by default.

Your app uses **Prisma**; Prisma works with a normal Postgres URL. The pooled URL from Neon (or the others) is enough; no need to switch to a special driver unless you hit connection limits and want to try Neon’s serverless driver later.

---

## Checklist

- [ ] Sign up at [neon.tech](https://neon.tech) and create a project.
- [ ] Copy the **pooled** connection string.
- [ ] Set `DATABASE_URL` in production (Vercel env or host).
- [ ] Run `npx prisma migrate deploy` against that `DATABASE_URL`.
- [ ] Redeploy the app and test (e.g. sign in, create a home/task).
- [ ] (Optional) Enable or document backups once you move past experimentation.

For deploy steps and env checklist, see [docs/DEPLOY.md](DEPLOY.md).
