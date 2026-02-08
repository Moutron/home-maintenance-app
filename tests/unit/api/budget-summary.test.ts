/**
 * Tests for Budget Summary API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/budget/route";
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

describe("Budget Summary API", () => {
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

  describe("GET /api/budget", () => {
    it("should return budget summary for authenticated user", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/budget");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalSpent).toBeDefined();
      expect(data.totalEstimated).toBeDefined();
      expect(data.completedTasks).toBeInstanceOf(Array);
      expect(data.upcomingTasks).toBeInstanceOf(Array);
      expect(data.monthlySpending).toBeInstanceOf(Array);
    });

    it("should return empty data when user has no homes", async () => {
      mockPrisma.home.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/budget");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalSpent).toBe(0);
      expect(data.totalEstimated).toBe(0);
      expect(data.completedTasks).toEqual([]);
      expect(data.upcomingTasks).toEqual([]);
      expect(data.monthlySpending).toEqual([]);
    });

    it("should calculate total spent from completed tasks", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.completedTask.findMany.mockResolvedValue([
        {
          id: "completed1",
          completedDate: new Date(),
          actualCost: 100,
          task: {
            home: {
              address: "123 Test St",
              city: "San Francisco",
              state: "CA",
            },
          },
        },
        {
          id: "completed2",
          completedDate: new Date(),
          actualCost: 200,
          task: {
            home: {
              address: "123 Test St",
              city: "San Francisco",
              state: "CA",
            },
          },
        },
      ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/budget");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalSpent).toBe(300);
    });

    it("should calculate total estimated from upcoming tasks", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([
        {
          id: "task1",
          costEstimate: 150,
          nextDueDate: new Date(),
          home: {
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        },
        {
          id: "task2",
          costEstimate: 250,
          nextDueDate: new Date(),
          home: {
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/budget");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalEstimated).toBe(400);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/budget");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle database errors", async () => {
      mockPrisma.home.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/budget");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch budget data");
    });
  });
});
