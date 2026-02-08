import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please add it to your .env file.\n" +
    "Example: DATABASE_URL=\"postgresql://user:password@localhost:5432/database\""
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

