/**
 * Test Database Configuration
 * Utilities for managing test database state
 */

import { PrismaClient } from "@prisma/client";

const testDatabaseUrl = process.env.TEST_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgresql://test:test@localhost:5432/test_db";

/**
 * Create a test Prisma client
 */
export function createTestPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });
}

/**
 * Reset test database (truncate all tables)
 * Note: This should be used carefully and only in test environments
 */
export async function resetTestDatabase(prisma: PrismaClient) {
  // Disable foreign key checks temporarily
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);
  // Note: In production, you'd want to truncate all tables in the correct order
  // This is a simplified version for testing
}

/**
 * Seed test database with minimal data
 */
export async function seedTestDatabase(prisma: PrismaClient) {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { clerkId: "clerk_test123" },
    update: {},
    create: {
      clerkId: "clerk_test123",
      email: "test@example.com",
      subscriptionTier: "FREE",
    },
  });

  // Create a test home
  const home = await prisma.home.upsert({
    where: { id: "home_test123" },
    update: {},
    create: {
      id: "home_test123",
      userId: user.id,
      address: "123 Test St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      yearBuilt: 1980,
      squareFootage: 2000,
      lotSize: 0.25,
      homeType: "single-family",
    },
  });

  return { user, home };
}
