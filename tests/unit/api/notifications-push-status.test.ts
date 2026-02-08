/**
 * Tests for Notifications Push Status API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/notifications/push/status/route";
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

describe("Notifications Push Status API", () => {
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
      email: testData.user.email,
    });
    mockPrisma.user.create.mockResolvedValue(testData.user);
  });

  describe("GET /api/notifications/push/status", () => {
    it("should return push notification subscription status", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/push/status");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subscribed).toBeDefined();
      expect(typeof data.subscribed).toBe("boolean");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/notifications/push/status");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when user email not found", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        emailAddresses: [],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/notifications/push/status");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User email not found");
    });

    it("should handle database errors", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/notifications/push/status");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check push notification status");
    });
  });
});
