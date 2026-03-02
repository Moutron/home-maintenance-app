# Vercel Environment Variables Checklist

Set these in **Vercel → Your Project → Settings → Environment Variables**. For each variable, choose **Production** (and **Preview** if you use branch/PR deploys), then **Save**. Redeploy after adding or changing variables.

---

## Required (app won’t build or core features break without these)

| Variable | Purpose | Where to get it |
|----------|---------|------------------|
| **`DATABASE_URL`** | Postgres connection (build + runtime). Build fails if missing. | Neon → Connection string (pooled), or Vercel Storage → Postgres, or your DB provider. See [VERCEL_DATABASE_URL_SETUP.md](VERCEL_DATABASE_URL_SETUP.md). |
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** | Clerk auth (client). | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys → Publishable key (`pk_test_...` or `pk_live_...`). |
| **`CLERK_SECRET_KEY`** | Clerk auth (server). | Clerk Dashboard → API Keys → Secret key (`sk_test_...` or `sk_live_...`). |
| **`NEXT_PUBLIC_APP_URL`** | Base URL for links (emails, redirects). | Your Vercel URL, e.g. `https://your-project.vercel.app`. Use a placeholder for first deploy, then set to the real URL and redeploy. |

---

## Strongly recommended (needed for main features)

| Variable | Purpose | Where to get it |
|----------|---------|------------------|
| **`ANTHROPIC_API_KEY`** | AI task generation, DIY plan generation, photo analysis (Claude). Routes throw if missing. | [Anthropic API keys](https://console.anthropic.com/) (Claude). |
| **`RESEND_API_KEY`** | Sending emails (task reminders, warranty alerts, budget alerts). Emails are skipped if missing. | [Resend](https://resend.com) → API Keys. |
| **`RESEND_FROM_EMAIL`** | Sender address for emails. | A verified domain in Resend, e.g. `Home Maintenance <noreply@yourdomain.com>`. Optional; falls back to a placeholder if unset. |
| **`CRON_SECRET`** | Protects cron endpoints (warranty check, budget alerts, push send). Set so only Vercel Crons can call them. | Generate a long random string, e.g. `openssl rand -hex 32`. Add in Vercel; Vercel Crons can send it in a header. |

---

## Optional (only if you use that feature)

| Variable | Purpose |
|----------|---------|
| **`NEXT_PUBLIC_SENTRY_DSN`** / **`SENTRY_DSN`** | Sentry error tracking (client/server). |
| **`SENTRY_ORG`**, **`SENTRY_PROJECT`**, **`SENTRY_AUTH_TOKEN`** | Sentry release upload & source maps (optional). |
| **`BLOB_READ_WRITE_TOKEN`** | Vercel Blob storage for file uploads. |
| **`CLOUDINARY_URL`**, **`CLOUDINARY_UPLOAD_PRESET`** | Cloudinary for image uploads (alternative to Blob). |
| **`ONESIGNAL_APP_ID`**, **`ONESIGNAL_REST_API_KEY`**, **`NEXT_PUBLIC_ONESIGNAL_APP_ID`** | OneSignal push notifications. |
| **`NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`** | Address autocomplete (Google Places). |
| **`RENTCAST_API_KEY`**, **`CENSUS_API_KEY`**, **`USPS_API_KEY`** | Property enrichment / lookup. |
| **`RAPIDAPI_KEY`**, **`ENABLE_WEB_SCRAPING`** | Property lookup (RapidAPI + optional scraping). |
| **`OPENWEATHER_API_KEY`** | Climate data. |
| **`VISUAL_CROSSING_API_KEY`** | Historical weather. |
| **`RATE_LIMIT_REQUESTS`**, **`RATE_LIMIT_WINDOW_MS`**, **`RATE_LIMIT_DISABLED`** | Rate limiting (defaults exist; override if needed). |

---

## Quick checklist for “just get it working”

- [ ] **DATABASE_URL** – Postgres connection string (pooled).
- [ ] **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** – Clerk publishable key.
- [ ] **CLERK_SECRET_KEY** – Clerk secret key.
- [ ] **NEXT_PUBLIC_APP_URL** – `https://your-app.vercel.app` (or placeholder, then fix after first deploy).
- [ ] **ANTHROPIC_API_KEY** – If you use AI features (Claude).
- [ ] **RESEND_API_KEY** – If you want email (reminders, warranty/budget alerts).
- [ ] **CRON_SECRET** – If you use the cron jobs (warranties, budget alerts, push).

After adding or editing, go to **Deployments → ⋯ → Redeploy** so the new values are used.
