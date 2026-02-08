/**
 * Tests for Tools Inventory API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/tools/inventory/route";
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

describe("Tools Inventory API", () => {
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

  describe("GET /api/tools/inventory", () => {
    it("should return user's tool inventory", async () => {
      const mockTools = [
        {
          id: "tool_1",
          name: "Cordless Drill",
          category: "Power Tools",
          userId: testData.user.id,
        },
        {
          id: "tool_2",
          name: "Hammer",
          category: "Hand Tools",
          userId: testData.user.id,
        },
      ];

      mockPrisma.toolInventory.findMany.mockResolvedValue(mockTools);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tools).toBeDefined();
      expect(data.tools).toHaveLength(2);
      expect(mockPrisma.toolInventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testData.user.id },
        })
      );
    });

    it("should filter tools by category", async () => {
      const mockTools = [
        {
          id: "tool_1",
          name: "Cordless Drill",
          category: "Power Tools",
          userId: testData.user.id,
        },
      ];

      mockPrisma.toolInventory.findMany.mockResolvedValue(mockTools);

      const request = new NextRequest(
        "http://localhost:3000/api/tools/inventory?category=Power Tools"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tools).toHaveLength(1);
      expect(mockPrisma.toolInventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "Power Tools",
          }),
        })
      );
    });

    it("should search tools by name", async () => {
      const mockTools = [
        {
          id: "tool_1",
          name: "Cordless Drill",
          category: "Power Tools",
          userId: testData.user.id,
        },
      ];

      mockPrisma.toolInventory.findMany.mockResolvedValue(mockTools);

      const request = new NextRequest(
        "http://localhost:3000/api/tools/inventory?search=drill"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tools).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when user email not found", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        emailAddresses: [],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User email not found");
    });

    it("should handle database errors", async () => {
      mockPrisma.toolInventory.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/tools/inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch tool inventory");
    });
  });

  describe("POST /api/tools/inventory", () => {
    it("should create a new tool in inventory", async () => {
      const newTool = {
        id: "tool_new",
        name: "Screwdriver",
        category: "Hand Tools",
        userId: testData.user.id,
      };

      mockPrisma.toolInventory.create.mockResolvedValue(newTool);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: "Screwdriver",
          category: "Hand Tools",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        name: "Screwdriver",
        category: "Hand Tools",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tool).toBeDefined();
      expect(data.tool.name).toBe("Screwdriver");
      expect(mockPrisma.toolInventory.create).toHaveBeenCalled();
    });

    it("should return 400 when tool name is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/tools/inventory", {
        method: "POST",
        body: JSON.stringify({
          category: "Hand Tools",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        category: "Hand Tools",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: "Screwdriver",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle database errors during creation", async () => {
      mockPrisma.toolInventory.create.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/tools/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: "Screwdriver",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        name: "Screwdriver",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });
  });
});
