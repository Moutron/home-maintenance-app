# Before You Commit / Push – No Secrets

Before pushing to GitHub (or any remote), ensure **no secrets or API keys** are committed.

---

## What Must Never Be Committed

- **`.env`** – Local env with real keys (Clerk, DB, OpenAI, etc.)
- **`.env.local`** – Local overrides, often contains real `DATABASE_URL`, keys
- **`.env.backup`** – Backups of env (may contain real secrets)
- **Any file** containing:
  - Real connection strings (e.g. `postgresql://user:password@...` with real password)
  - Real API keys (`pk_live_`, `sk_live_`, `sk-...` OpenAI, `re_...` Resend, etc.)
  - Tokens, passwords, or signing secrets

**Safe to commit:** `.env.example` only (placeholders like `pk_test_...`, `postgresql://user:password@localhost:...`).

---

## .gitignore

The repo **.gitignore** is set so that:

- `.env`, `.env.local`, `.env.backup`, `.env.*.local` are **ignored** (never committed).
- **`.env.example`** is **not** ignored so you can commit the template.

Do not remove or change these lines in **.gitignore**.

---

## Quick Check Before First Push

Run these in the project root:

```bash
# 1. See what’s staged and tracked
git status

# 2. Confirm .env and .env.local are ignored (should print "ignored")
git check-ignore -v .env .env.local

# 3. Ensure no env file with secrets is staged
git diff --cached --name-only | grep -E '^\.env$|\.env\.local$|\.env\.backup$' && echo "WARNING: env file is staged!" || echo "OK: no secret env files staged"
```

If any of `.env`, `.env.local`, or `.env.backup` appear under **Changes to be committed**, **unstage** them and do not commit:

```bash
git restore --staged .env .env.local .env.backup
```

(Or remove them from the commit and keep the files only locally.)

---

## If You Already Committed Secrets

1. **Remove the file from the last commit** (if not pushed yet):
   - `git restore --staged .env` (or the file you added)
   - `git commit --amend` (no new changes) or make a new commit without that file.
2. **If you already pushed:** the secret is in history. Remove the file from tracking (`git rm --cached .env`), commit that change, and **rotate all keys** that were in that file (Clerk, Neon password, OpenAI, etc.) and update them in Vercel/local env.

---

## Summary

- **.gitignore** keeps `.env`, `.env.local`, `.env.backup` (and other `.env.*.local`) out of the repo.
- **Only `.env.example`** (placeholders, no real keys) is intended to be committed.
- Before your first push, run the **Quick Check** above and fix anything that’s staged by mistake.
