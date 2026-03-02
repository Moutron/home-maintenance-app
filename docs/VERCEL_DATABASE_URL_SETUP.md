# Setting DATABASE_URL in Vercel (Step-by-Step)

If your Vercel build fails with **"Missing required environment variable: DATABASE_URL"**, the build doesn’t see `DATABASE_URL`. Follow these steps to fix it.

---

## 1. Get your connection string first

You need a **PostgreSQL** connection string. Common options:

- **Neon** (good for Vercel): [neon.tech](https://neon.tech) → create a project → use the **pooled** connection string (not “direct”).
- **Vercel Postgres**: Vercel dashboard → Storage → Create Database → Postgres → copy the `POSTGRES_URL` (that’s your `DATABASE_URL`).
- **Other (Supabase, Railway, etc.)**: Use the connection string they give you; for serverless, prefer a **pooled** URL if they offer one.

Format looks like:
```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

**Neon:** Use the URL that says **“Pooled connection”** (often has `-pooler` in the host).  
**Do not** use the “Direct connection” URL for Vercel.

Copy the **entire** string. Don’t add spaces or line breaks.

---

## 2. Open Vercel Environment Variables

1. Go to **[vercel.com/dashboard](https://vercel.com/dashboard)**.
2. Click your project (**home-maintenance-app** or whatever it’s named).
3. Click the **Settings** tab at the top.
4. In the left sidebar, click **Environment Variables**.

You should see a list of variables (maybe empty) and an **“Add New”** or **“Add”** button.

---

## 3. Add DATABASE_URL

1. Click **Add New** (or **Add**).
2. **Key (name):**
   - Type exactly: `DATABASE_URL`
   - All caps, underscore in the middle, no space before or after.
   - Common mistakes: `Database_URL`, `DATABASE_URL ` (trailing space), `DB_URL` (wrong name).
3. **Value:**
   - Paste your **full** connection string.
   - No quotes around it in Vercel (unless your provider’s docs say to use quotes).
   - No leading/trailing spaces.
   - Don’t split it across lines.
4. **Environments (where it’s available):**
   - Check **Production** (required for production deploys).
   - If you use branch/PR previews, also check **Preview** so those builds get it too.
5. Click **Save**.

---

## 4. Common mistakes

| Mistake | Fix |
|--------|-----|
| Variable only in “Preview” or “Development” | Also check **Production** so the main deploy sees it. |
| Typo in key | Must be exactly `DATABASE_URL`. |
| Wrong project | Ensure you’re in **Settings → Environment Variables** for the **home-maintenance-app** project, not another project or team. |
| Forgot to save | After pasting, click **Save**. |
| Old deploy | New env vars apply only to **new** builds. Redeploy after adding (see below). |

---

## 5. Redeploy so the build uses it

Environment variables are applied on the **next** build, not to builds that already ran.

1. Go to the **Deployments** tab.
2. Find the latest deployment.
3. Open the **⋯** (three dots) menu on the right.
4. Click **Redeploy**.
5. Leave “Use existing Build Cache” **unchecked** if you want a clean build (recommended when fixing env).
6. Confirm **Redeploy**.

Watch the new build log. It should get past `prisma generate` without the “Missing required environment variable: DATABASE_URL” error.

---

## 6. Verify it’s present (optional)

- In **Settings → Environment Variables**, you should see `DATABASE_URL` with **Production** (and optionally **Preview**) checked. The value is hidden for security.
- If you’re unsure which project you’re in, check the project name at the top of the dashboard and in the URL (e.g. `vercel.com/your-team/home-maintenance-app`).

---

## 7. Still failing?

- **Error still says DATABASE_URL missing**
  - Confirm you’re redeploying **after** saving the variable.
  - Confirm **Production** is checked for the deployment you’re watching (e.g. production branch like `main`).
- **Build fails with a different DB error** (e.g. connection refused, SSL, timeout)
  - Use a **pooled** connection string (Neon: “Pooled connection”).
  - Ensure the URL includes `?sslmode=require` (or whatever your provider requires).
  - Ensure the database allows connections from the internet (Vercel’s IPs), or use a provider that does (Neon, Vercel Postgres, etc.).

---

## Quick checklist

- [ ] Connection string is **PostgreSQL** and **pooled** (for Neon/serverless).
- [ ] In Vercel: **Project → Settings → Environment Variables**.
- [ ] Added **Key:** `DATABASE_URL`, **Value:** full URL, **Production** (and **Preview** if needed) checked, then **Save**.
- [ ] **Deployments → ⋯ → Redeploy** (without cache if you want a clean build).

After that, the build should have access to `DATABASE_URL` and get past the Prisma step.
