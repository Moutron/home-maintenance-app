/**
 * Tests for Budget Projects API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/budget/projects/route";
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

describe("Budget Projects API", () => {
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

  describe("GET /api/budget/projects", () => {
    it("should return budget projects for authenticated user", async () => {
      mockPrisma.diyProject.findMany.mockResolvedValue([
        {
          ...testData.diyProject,
          materials: [],
          tools: [],
          home: {
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/budget/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toBeInstanceOf(Array);
      expect(data.summary).toBeDefined();
      expect(data.summary.totalProjects).toBe(1);
    });

    it("should calculate project costs from materials and tools", async () => {
      mockPrisma.diyProject.findMany.mockResolvedValue([
        {
          ...testData.diyProject,
          materials: [
            { purchased: true, totalPrice: 100 },
            { purchased: true, totalPrice: 50 },
          ],
          tools: [
            { owned: false, purchased: true, purchaseCost: 75 },
            { owned: true, purchased: false },
          ],
          home: {
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/budget/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects[0].actualCost).toBeGreaterThan(0);
    });

    it("should calculate over-budget status", async () => {
      mockPrisma.diyProject.findMany.mockResolvedValue([
        {
          ...testData.diyProject,
          budget: 100,
          actualCost: 150,
          materials: [],
          tools: [],
          home: {
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/budget/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects[0].isOverBudget).toBe(true);
      expect(data.summary.projectsOverBudget).toBe(1);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/budget/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return empty array when no projects exist", async () => {
      mockPrisma.diyProject.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/budget/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toEqual([]);
      expect(data.summary.totalProjects).toBe(0);
    });

    it("should handle database errors", async () => {
      mockPrisma.diyProject.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/budget/projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch project budgets");
    });
  });
});
