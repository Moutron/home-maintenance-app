# Vercel Setup – Step-by-Step

This guide walks you through connecting Home Maintenance Pro to Vercel and getting your first production deploy live.

---

## Before You Start

- Your code is in a **Git** repo (GitHub, GitLab, or Bitbucket). If it’s only on your machine, push it to GitHub first.
- **No secrets in the repo:** Ensure `.env`, `.env.local`, and `.env.backup` are never committed. See [docs/COMMIT_SAFETY.md](COMMIT_SAFETY.md) for a quick check before your first push.
- You have your **Neon** `DATABASE_URL` (pooled connection string).
- You have **Clerk** keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) — development keys are fine for now.
- You have an **OpenAI** API key.

---

## Step 1: Sign in to Vercel

1. Go to **[https://vercel.com](https://vercel.com)**.
2. Click **Sign Up** or **Log In**.
3. Choose **Continue with GitHub** (or GitLab/Bitbucket) so Vercel can access your repos.
4. Authorize Vercel when prompted.

---

## Step 2: Import Your Project

1. On the Vercel dashboard, click **Add New…** → **Project** (or **Import Project**).
2. You’ll see a list of repositories from your connected Git account. Find **home-maintenance-app** (or whatever your repo is named) and click **Import** next to it.
   - If you don’t see it, click **Adjust GitHub App Permissions** and grant Vercel access to the org or account that owns the repo, then try again.
3. You’ll land on the **Configure Project** screen. Leave this open; we’ll set env vars in the next step before deploying.

---

## Step 3: Configure the Project (Build Settings)

On the **Configure Project** page:

1. **Framework Preset** – Should be **Next.js**. If not, select it.
2. **Root Directory** – Leave as **.** (project root). Only change if your app lives in a subfolder.
3. **Build Command** – Leave default (`next build`) unless you’ve changed it.
4. **Output Directory** – Leave default (Next.js sets this).
5. **Install Command** – Leave default (`npm install` or `yarn install`).

Don’t click **Deploy** yet; add environment variables first.

---

## Step 4: Add Environment Variables

Still on the Configure Project page (or go to **Settings → Environment Variables** after the project is created):

1. Find the **Environment Variables** section.
2. For each variable below, click **Add** (or **Add Another**), enter the **Name**, paste the **Value**, and choose **Production** (and **Preview** if you want preview deploys to use the same values).

Add these **required** variables:

| Name | Value | Where to get it |
|------|--------|------------------|
| `DATABASE_URL` | Your Neon pooled connection string | Neon dashboard → Connection string (pooled). Same as in your `.env.local`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Clerk Dashboard → API Keys → Publishable key. |
| `CLERK_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Clerk Dashboard → API Keys → Secret key. |
| `OPENAI_API_KEY` | `sk-...` | [platform.openai.com](https://platform.openai.com) → API keys. |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | **Use your Vercel URL.** After the first deploy, Vercel shows it (e.g. `https://home-maintenance-app-xxx.vercel.app`). You can add this before deploy with a placeholder, then edit it after the first deploy to the real URL. |

**Optional but recommended:**

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry DSN URL | Sentry project → Settings → Client Keys (DSN). |
| `SENTRY_DSN` | Same DSN URL | Same as above (server-side errors). |
| `CRON_SECRET` | A long random string (e.g. 32+ chars) | Generate one (e.g. `openssl rand -hex 32`). Needed if you use Vercel Crons for warranties/budget. |

3. For each variable, make sure **Production** is checked. Save as you go.
4. Don’t commit secrets; they only live in Vercel.

**Tip:** If you’re not sure of `NEXT_PUBLIC_APP_URL` yet, use a placeholder like `https://placeholder.vercel.app`, deploy once, then go to **Settings → Environment Variables**, edit `NEXT_PUBLIC_APP_URL` to your real URL (e.g. `https://your-project.vercel.app`), and redeploy.

---

## Step 5: Deploy

1. Click **Deploy** at the bottom of the Configure Project page (or, if you skipped env vars, add them in **Settings → Environment Variables** and then go to **Deployments** → **Redeploy**).
2. Vercel will clone the repo, run `npm install` and `next build`, and deploy. This usually takes 1–3 minutes.
3. When it finishes, you’ll see a **Visit** link (e.g. `https://home-maintenance-app-abc123.vercel.app`). Click it to open the app.

---

## Step 6: Set the Real App URL (If You Used a Placeholder)

1. Copy the URL Vercel gave you (e.g. `https://home-maintenance-app-xyz.vercel.app`).
2. In Vercel: **Project → Settings → Environment Variables**.
3. Find `NEXT_PUBLIC_APP_URL` and click **Edit**.
4. Set the value to that URL (with `https://`), save.
5. Go to **Deployments** → open the **⋯** menu on the latest deployment → **Redeploy** so the new value is used.

---

## Step 7: Run Database Migrations (One-Time)

Vercel does **not** run Prisma migrations for you. Run them once against your production DB:

1. On your machine (or in a secure script), set `DATABASE_URL` to your **Neon** connection string and run:

   ```bash
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-pooler.region.azure.neon.tech/neondb?sslmode=require&channel_binding=require" npx prisma migrate deploy
   ```

   Or, if `DATABASE_URL` is already in your `.env.local`, run:

   ```bash
   npx prisma migrate deploy
   ```

   (Use the same DB as production so the schema matches what the app expects.)

2. After this runs successfully, your Vercel app and Neon database are in sync.

---

## Step 8: Enable the Cron (Optional)

Your app has a cron in `vercel.json` for `/api/warranties/check-expiring` (daily at 9:00 UTC).

1. In Vercel: **Project → Settings → Crons** (or **Functions** depending on plan).
2. Ensure the cron from `vercel.json` is **enabled**.
3. You must set **CRON_SECRET** in Environment Variables (Step 4). Vercel Crons can send this header automatically when configured; see [Vercel Cron docs](https://vercel.com/docs/cron-jobs) for your plan.

---

## Step 9: Verify the Deploy

1. **Health check**  
   Open: `https://your-app.vercel.app/api/health`  
   You should see something like: `{"ok":true,"timestamp":"..."}`. If you see `ok: false` and a DB error, check `DATABASE_URL` and that migrations ran.

2. **Home page**  
   Open: `https://your-app.vercel.app`  
   The landing page should load.

3. **Sign-in / sign-up**  
   Use **Sign In** or **Get Started**. You should hit Clerk (dev or prod). After signing in, you should be able to reach the dashboard or onboarding.

4. **Protected route**  
   Go to e.g. `https://your-app.vercel.app/dashboard`. If you’re not signed in, you should be redirected to sign-in.

If anything fails, check **Deployments** → latest deployment → **Building** / **Functions** logs, and **Settings → Environment Variables** to confirm names and values (no extra spaces, correct URLs).

---

## Summary Checklist

- [ ] Code pushed to GitHub (or GitLab/Bitbucket).
- [ ] Signed in to Vercel and imported the project.
- [ ] Framework set to Next.js, root directory `.`.
- [ ] `DATABASE_URL`, Clerk keys, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL` set in Production env.
- [ ] Optional: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `CRON_SECRET` set.
- [ ] First deploy completed and **Visit** link works.
- [ ] `NEXT_PUBLIC_APP_URL` updated to the real Vercel URL and redeployed.
- [ ] `npx prisma migrate deploy` run once against Neon (production DB).
- [ ] `/api/health` returns `ok: true`.
- [ ] Sign-in and a protected route (e.g. dashboard) tested.

---

## Why Vercel Build Can Fail (and How to Avoid It)

Vercel runs **strict TypeScript** during `npm run build`. If any callback parameter is inferred as `any` (e.g. in `.map((h) => ...)` or `.reduce((sum, x) => ...)`), the build fails with "Parameter 'x' implicitly has an 'any' type."

**Catch it before pushing:**

1. **Run the same build locally:**  
   `npm run build`  
   If it passes locally, it should pass on Vercel.

2. **Fix implicit `any` in API routes:**  
   Add explicit types to callback parameters, e.g.  
   `homes.map((h) => h.id)` → `homes.map((h: { id: string }) => h.id)`  
   `arr.reduce((sum, x) => sum + x.cost, 0)` → `arr.reduce((sum: number, x: { cost: number | null }) => sum + (x.cost || 0), 0)`.

3. **CI:**  
   The repo’s GitHub Actions workflow runs `npm run build` on push/PR; if that job passes, Vercel’s build should too.

---

## What Happens Next

- **Every push** to the connected branch (e.g. `main`) will trigger a new deploy.
- To add or change env vars: **Settings → Environment Variables** → edit → **Redeploy** from the Deployments tab so the new values are used.
- For rollback, deploy steps, and where to find logs, see [docs/DEPLOY.md](DEPLOY.md).
