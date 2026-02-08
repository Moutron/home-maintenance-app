/**
 * Tests for Budget Plans API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/budget/plans/route";
import { GET as GET_PLAN, PATCH, DELETE } from "@/app/api/budget/plans/[id]/route";
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

describe("Budget Plans API", () => {
  let mockPrisma: any;

  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_test123",
      clerkId: "user_test123",
      email: "test@example.com",
    });
  });

  describe("GET /api/budget/plans", () => {
    it("should return budget plans for authenticated user", async () => {
      mockPrisma.budgetPlan.findMany.mockResolvedValue([testData.budgetPlan]);

      const request = new NextRequest("http://localhost:3000/api/budget/plans");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgetPlans).toBeInstanceOf(Array);
      expect(data.budgetPlans).toHaveLength(1);
      expect(mockPrisma.budgetPlan.findMany).toHaveBeenCalled();
    });

    it("should filter budget plans by period", async () => {
      mockPrisma.budgetPlan.findMany.mockResolvedValue([testData.budgetPlan]);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans?period=MONTHLY"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.budgetPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            period: "MONTHLY",
          }),
        })
      );
    });

    it("should filter budget plans by isActive", async () => {
      mockPrisma.budgetPlan.findMany.mockResolvedValue([testData.budgetPlan]);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans?isActive=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.budgetPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it("should return empty array when no budget plans exist", async () => {
      mockPrisma.budgetPlan.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/budget/plans");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgetPlans).toEqual([]);
    });

    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/budget/plans");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/budget/plans", () => {
    it("should create a new budget plan", async () => {
      const newPlan = {
        ...testData.budgetPlan,
        id: "budget_new123",
      };
      mockPrisma.budgetPlan.create.mockResolvedValue(newPlan);

      const request = new NextRequest("http://localhost:3000/api/budget/plans", {
        method: "POST",
        body: JSON.stringify({
          name: "2024 Home Maintenance Budget",
          period: "MONTHLY",
          amount: 1000,
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.budgetPlan).toBeDefined();
      expect(data.budgetPlan.name).toBe("2024 Home Maintenance Budget");
      expect(mockPrisma.budgetPlan.create).toHaveBeenCalled();
    });

    it("should create budget plan with category filter", async () => {
      const newPlan = {
        ...testData.budgetPlan,
        category: "HVAC",
      };
      mockPrisma.budgetPlan.create.mockResolvedValue(newPlan);

      const request = new NextRequest("http://localhost:3000/api/budget/plans", {
        method: "POST",
        body: JSON.stringify({
          name: "HVAC Budget",
          period: "MONTHLY",
          amount: 500,
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          category: "HVAC",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.budgetPlan.category).toBe("HVAC");
    });

    it("should create budget plan with home filter", async () => {
      const newPlan = {
        ...testData.budgetPlan,
        homeId: "home_test123",
      };
      mockPrisma.budgetPlan.create.mockResolvedValue(newPlan);

      const request = new NextRequest("http://localhost:3000/api/budget/plans", {
        method: "POST",
        body: JSON.stringify({
          name: "Home Budget",
          period: "MONTHLY",
          amount: 500,
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          homeId: "home_test123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.budgetPlan.homeId).toBe("home_test123");
    });

    it("should return 400 when required fields are missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/budget/plans", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Budget",
          // Missing period, amount, dates
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/budget/plans", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Budget",
          period: "MONTHLY",
          amount: 1000,
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/budget/plans/[id]", () => {
    it("should return a specific budget plan with spending data", async () => {
      const planWithSpending = {
        ...testData.budgetPlan,
        spending: {
          totalSpent: 500,
          remaining: 500,
          percentUsed: 50,
          taskSpending: 300,
          projectSpending: 200,
          completedTasks: 5,
          diyProjects: 2,
        },
      };

      mockPrisma.budgetPlan.findFirst.mockResolvedValue(testData.budgetPlan);
      mockPrisma.home.findMany.mockResolvedValue([{ id: "home_test123" }]);
      mockPrisma.completedTask.findMany.mockResolvedValue([
        { actualCost: 100 },
        { actualCost: 200 },
      ]);
      mockPrisma.diyProject.findMany.mockResolvedValue([
        { actualCost: 200 },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans/budget_test123"
      );
      const response = await GET_PLAN(request, {
        params: { id: "budget_test123" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("budget_test123");
      expect(data.spending).toBeDefined();
      expect(data.spending.totalSpent).toBeGreaterThanOrEqual(0);
    });

    it("should return 404 when budget plan not found", async () => {
      mockPrisma.budgetPlan.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans/nonexistent"
      );
      const response = await GET_PLAN(request, {
        params: { id: "nonexistent" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Budget plan not found");
    });
  });

  describe("PATCH /api/budget/plans/[id]", () => {
    it("should update a budget plan", async () => {
      const updatedPlan = {
        ...testData.budgetPlan,
        name: "Updated Budget Name",
        amount: 1500,
      };

      mockPrisma.budgetPlan.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.budgetPlan.findUnique.mockResolvedValue(updatedPlan);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans/budget_test123",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Budget Name",
            amount: 1500,
          }),
        }
      );

      const response = await PATCH(request, {
        params: { id: "budget_test123" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgetPlan.name).toBe("Updated Budget Name");
      expect(data.budgetPlan.amount).toBe(1500);
    });

    it("should update isActive status", async () => {
      const updatedPlan = {
        ...testData.budgetPlan,
        isActive: false,
      };

      mockPrisma.budgetPlan.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.budgetPlan.findUnique.mockResolvedValue(updatedPlan);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans/budget_test123",
        {
          method: "PATCH",
          body: JSON.stringify({
            isActive: false,
          }),
        }
      );

      const response = await PATCH(request, {
        params: { id: "budget_test123" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgetPlan.isActive).toBe(false);
    });

    it("should return 404 when budget plan not found", async () => {
      mockPrisma.budgetPlan.updateMany.mockResolvedValue({ count: 0 });

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans/nonexistent",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Name",
          }),
        }
      );

      const response = await PATCH(request, {
        params: { id: "nonexistent" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Budget plan not found");
    });
  });

  describe("DELETE /api/budget/plans/[id]", () => {
    it("should delete a budget plan", async () => {
      mockPrisma.budgetPlan.deleteMany.mockResolvedValue({ count: 1 });

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans/budget_test123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: { id: "budget_test123" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.budgetPlan.deleteMany).toHaveBeenCalled();
    });

    it("should return 404 when budget plan not found", async () => {
      mockPrisma.budgetPlan.deleteMany.mockResolvedValue({ count: 0 });

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans/nonexistent",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: { id: "nonexistent" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Budget plan not found");
    });
  });
});

