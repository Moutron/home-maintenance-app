# Clerk Production Keys – Step-by-Step Walkthrough

This guide walks you through getting **production** Clerk keys (`pk_live_` and `sk_live_`) so your app can run in production with Clerk.

---

## Before You Start

You need:

1. **A Clerk account** – [dashboard.clerk.com](https://dashboard.clerk.com) (sign up if needed).
2. **A domain you own** – e.g. `your-app.com` or `app.yourapp.com`, with access to add DNS records.
3. **HTTPS** – Production Clerk requires HTTPS. Your host (Vercel, etc.) will provide this.
4. **OAuth credentials** (if you use social sign-in) – In production you must use your own Google/GitHub/etc. OAuth apps; Clerk’s shared dev credentials are not allowed.

---

## Step 1: Open the Clerk Dashboard

1. Go to **[https://dashboard.clerk.com](https://dashboard.clerk.com)** and sign in.
2. Select your **application** (the one you use for Home Maintenance Pro).

---

## Step 2: Create a Production Instance

1. At the **top of the dashboard**, you’ll see a button that says **Development** (or your current instance name).
2. Click that button to open the **instance dropdown**.
3. Click **“Create production instance”**.
4. A modal will ask:
   - **Clone from development** – Copies most settings (paths, sign-in/sign-up options, etc.) from your dev instance. **Recommended** so you don’t reconfigure everything.
   - **Start with defaults** – Fresh production instance with Clerk defaults.
5. Choose **Clone from development** (or defaults if you prefer), then confirm.

**Note:** SSO connections, some integrations, and custom paths do **not** copy over. You’ll need to reconfigure those in the production instance if you use them.

---

## Step 3: Get Your Production API Keys

1. After the production instance is created, the dashboard will switch to the **Production** instance (you’ll see “Production” at the top).
2. Go to **API Keys** in the sidebar (or **Configure → API Keys**).
3. You’ll see:
   - **Publishable key** – starts with `pk_live_`. This is **public**; used in the browser (e.g. in `ClerkProvider`).
   - **Secret key** – starts with `sk_live_`. This is **secret**; used only on the server. Never expose it in the client or commit it to git.

4. **Copy both keys** and store them somewhere safe (e.g. password manager). You’ll add them to your production environment in Step 7.

---

## Step 4: Add Your Production Domain

1. In the Clerk Dashboard (still on **Production**), go to **Domains** (sidebar or **Configure → Domains**).
2. Add your **production domain**, e.g.:
   - `your-app.com` (root), or  
   - `app.your-app.com` (subdomain), or  
   - Your Vercel URL like `your-app.vercel.app` if you’re not using a custom domain yet.
3. Clerk will show the **DNS records** you need to add (usually a CNAME or TXT). Leave this tab open; you’ll add these in your DNS provider in the next step.

---

## Step 5: Add DNS Records (Required for Custom Domains)

If you’re using a **custom domain** (e.g. `app.your-app.com`):

1. Open your **DNS provider** (e.g. Cloudflare, Namecheap, Vercel DNS, Route53).
2. Add the records Clerk shows on the **Domains** page. Typically:
   - A **CNAME** or **TXT** for domain verification / session cookies.
3. **Propagation** can take up to 48 hours (often much less). Clerk will show when verification succeeds.

If you’re only using a **Vercel default domain** (e.g. `yourapp.vercel.app`), you may only need to add that domain in Clerk; check the Domains page for exact requirements.

**Cloudflare users:** If Clerk’s DNS check fails, set the relevant record to **“DNS only”** (grey cloud), not proxied, so Clerk can verify.

---

## Step 6: OAuth / Social Sign-In (If You Use It)

- In **development**, Clerk often provides shared OAuth credentials for Google, GitHub, etc.
- In **production**, you must use **your own** OAuth apps.

1. In the **Production** instance, go to **User & Authentication → Social connections** (or **Configure → Social connections**).
2. For each provider you use (Google, GitHub, etc.):
   - Create an OAuth app in that provider’s console (Google Cloud Console, GitHub Developer Settings, etc.).
   - Set the redirect/callback URL to what Clerk shows (e.g. `https://accounts.your-domain.com/...` or Clerk’s production callback).
   - Paste the **Client ID** and **Client Secret** into Clerk’s form for that provider.

Clerk’s docs have provider-specific guides: [OAuth / Social connections](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview).

---

## Step 7: Set Environment Variables in Production

Set these in your **production** environment (Vercel project settings, Docker env, etc.), **not** in `.env` committed to git:

| Variable | Value | Notes |
|----------|--------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | From Step 3 (Publishable key). |
| `CLERK_SECRET_KEY` | `sk_live_...` | From Step 3 (Secret key). |

**Vercel:**

1. Project → **Settings → Environment Variables**.
2. Add both variables; set **Environment** to **Production** (and Preview if you want staging to use prod Clerk).
3. **Redeploy** the app so the new env vars are used.

**Docker / other hosts:**  
Add the same two variables to your production env (e.g. `docker-compose.prod.yml` env, or your host’s UI). Then redeploy.

**Important:** Remove or override any `pk_test_` / `sk_test_` values in production; production must use `pk_live_` and `sk_live_`.

---

## Step 8: (Optional) Restrict Origins with `authorizedParties`

To reduce risk of cookie/session misuse, you can restrict which origins can use Clerk:

1. In your app, where you use Clerk (e.g. `middleware.ts` with `clerkMiddleware`), add `authorizedParties` with your production URL(s), e.g.:

   ```ts
   clerkMiddleware({
     authorizedParties: ['https://your-app.com', 'https://www.your-app.com'],
   })
   ```

2. Use your real production origin(s). Don’t add localhost here for prod builds.

(See [Clerk: authorizedParties](https://clerk.com/docs/deployments/overview#configure-authorized-parties-for-secure-request-authorization).)

---

## Step 9: Deploy Certificates (Clerk Dashboard)

1. In the Clerk Dashboard, stay on the **Production** instance.
2. Complete any remaining steps shown on the **home page** (domain, DNS, OAuth, etc.).
3. When everything is done, a **“Deploy certificates”** (or similar) button will appear.
4. Click it so Clerk can finalize TLS/certs for your production domain.

---

## Step 10: Redeploy Your App and Verify

1. **Redeploy** your app (e.g. push to main so Vercel deploys, or rebuild/restart your Docker/host) so it runs with `pk_live_` and `sk_live_`.
2. Open your **production URL** (HTTPS).
3. Test:
   - Sign up / sign in (email and, if configured, social).
   - Sign out.
   - Visit a protected route (e.g. dashboard) and confirm redirect to sign-in when not logged in.

If sign-in fails, double-check:

- Env vars in the host are exactly `pk_live_...` and `sk_live_...` (no typos, no test keys).
- Domain in Clerk **Domains** matches the URL you’re using (including www vs non-www).
- DNS has propagated (Clerk Domains page shows success).

---

## Quick Checklist

- [ ] Production instance created in Clerk Dashboard.
- [ ] Production **Publishable** key (`pk_live_...`) copied.
- [ ] Production **Secret** key (`sk_live_...`) copied.
- [ ] Production domain added in Clerk **Domains**.
- [ ] DNS records added and verified (if custom domain).
- [ ] OAuth credentials set for production (if using social sign-in).
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` set to **production** values in production env.
- [ ] App redeployed.
- [ ] Sign-in/sign-up and protected routes tested on production URL.

---

## References

- [Clerk: Deploy your app to production](https://clerk.com/docs/deployments/overview)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [OAuth / Social connections](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/overview)
