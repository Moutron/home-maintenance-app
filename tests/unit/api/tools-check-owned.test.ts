/**
 * Tests for Tools Check Owned API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/tools/check-owned/route";
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

describe("Tools Check Owned API", () => {
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

  describe("POST /api/tools/check-owned", () => {
    it("should check which tools are owned", async () => {
      const ownedTool = {
        id: "tool_123",
        name: "Cordless Drill",
        userId: testData.user.id,
      };

      mockPrisma.toolInventory.findMany.mockResolvedValue([ownedTool]);

      const request = new NextRequest("http://localhost:3000/api/tools/check-owned", {
        method: "POST",
        body: JSON.stringify({
          toolNames: ["Cordless Drill", "Hammer", "Screwdriver"],
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        toolNames: ["Cordless Drill", "Hammer", "Screwdriver"],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.toolOwnership).toBeDefined();
      expect(data.toolOwnership).toHaveLength(3);
      expect(data.toolOwnership[0].toolName).toBe("Cordless Drill");
      expect(data.toolOwnership[0].isOwned).toBe(true);
      expect(data.toolOwnership[0].toolId).toBe("tool_123");
      expect(data.toolOwnership[1].isOwned).toBe(false);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tools/check-owned", {
        method: "POST",
        body: JSON.stringify({
          toolNames: ["Hammer"],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when toolNames is not an array", async () => {
      const request = new NextRequest("http://localhost:3000/api/tools/check-owned", {
        method: "POST",
        body: JSON.stringify({
          toolNames: "not an array",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        toolNames: "not an array",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("toolNames must be an array");
    });

    it("should return 400 when user email not found", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        emailAddresses: [],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/tools/check-owned", {
        method: "POST",
        body: JSON.stringify({
          toolNames: ["Hammer"],
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        toolNames: ["Hammer"],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User email not found");
    });

    it("should handle empty tool list", async () => {
      mockPrisma.toolInventory.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/tools/check-owned", {
        method: "POST",
        body: JSON.stringify({
          toolNames: [],
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        toolNames: [],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.toolOwnership).toEqual([]);
    });

    it("should handle database errors", async () => {
      mockPrisma.toolInventory.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/tools/check-owned", {
        method: "POST",
        body: JSON.stringify({
          toolNames: ["Hammer"],
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        toolNames: ["Hammer"],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check tool ownership");
    });
  });
});
