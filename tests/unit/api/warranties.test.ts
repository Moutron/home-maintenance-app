/**
 * Tests for Warranties API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as POST_CHECK_EXPIRING } from "@/app/api/warranties/check-expiring/route";
import { mockClerkAuth, testData, createMockPrisma } from "../../utils/test-helpers";
import { auth, currentUser } from "@clerk/nextjs/server";

// Mock Prisma
vi.mock("@/lib/prisma", async () => {
  const { vi } = await import("vitest");
  const { createMockPrisma } = await import("../../utils/test-helpers");
  return {
    prisma: createMockPrisma(),
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs/server");

describe("Warranties API", () => {
  let mockPrisma: any;
  
  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
    mockPrisma.user.findUnique.mockResolvedValue({ 
      id: testData.user.id, 
      clerkId: testData.user.clerkId, 
      email: testData.user.email 
    });
    mockPrisma.user.create.mockResolvedValue(testData.user);
  });

  describe("POST /api/warranties/check-expiring", () => {
    it("should check for expiring warranties", async () => {
      // Mock user.findMany with nested structure that the route expects
      mockPrisma.user.findMany.mockResolvedValue([
        {
          ...testData.user,
          homes: [
            {
              ...testData.home,
              appliances: [],
              exteriorFeatures: [],
              interiorFeatures: [],
            },
          ],
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/warranties/check-expiring", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST_CHECK_EXPIRING(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      // The route uses cron secret auth, not Clerk auth
      // Set CRON_SECRET so it requires auth
      process.env.CRON_SECRET = "test-secret";
      
      const request = new NextRequest("http://localhost:3000/api/warranties/check-expiring", {
        method: "POST",
        // No authorization header
        body: JSON.stringify({}),
      });

      const response = await POST_CHECK_EXPIRING(request);
      const data = await response.json();

      // Should return 401 when CRON_SECRET is set but no auth header
      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      
      // Clean up
      delete process.env.CRON_SECRET;
    });
  });
});
