/**
 * Ensures DATABASE_URL is set before prisma generate so builds (e.g. Vercel) can run
 * without a real DB. Runtime still uses the real DATABASE_URL from the environment.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://build:build@localhost:5432/build?schema=public";
}

const { execSync } = require("child_process");
execSync("npx prisma generate", { stdio: "inherit", env: process.env });
