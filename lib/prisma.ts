import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure DATABASE_URL is set and valid for PostgreSQL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== "string") {
  throw new Error(
    "DATABASE_URL is not set. Add it in .env (local) or Vercel → Settings → Environment Variables (production).\n" +
    "Example: postgresql://user:password@host:5432/database?sslmode=require"
  );
}
const trimmed = databaseUrl.trim();
if (!trimmed.startsWith("postgresql://") && !trimmed.startsWith("postgres://")) {
  throw new Error(
    "DATABASE_URL must start with postgresql:// or postgres://. Check for typos, extra quotes, or wrong variable. Current value length: " + databaseUrl.length
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

