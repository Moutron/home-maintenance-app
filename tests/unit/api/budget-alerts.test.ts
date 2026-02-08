/**
 * Tests for Budget Alerts API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/budget/alerts/route";
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

// Mock budget alerts service
vi.mock("@/lib/budget/alerts", () => ({
  checkBudgetAlerts: vi.fn().mockResolvedValue({
    alertsChecked: 10,
    alertsCreated: 2,
    alertsSent: 1,
  }),
}));

describe("Budget Alerts API", () => {
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

  describe("GET /api/budget/alerts", () => {
    it("should return budget alerts for authenticated user", async () => {
      mockPrisma.budgetAlert.findMany.mockResolvedValue([
        {
          id: "alert1",
          userId: testData.user.id,
          alertType: "APPROACHING_LIMIT",
          status: "PENDING",
          message: "Budget approaching limit",
          budgetPlan: {
            name: "Test Budget",
            amount: 1000,
            period: "MONTHLY",
          },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/budget/alerts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.alerts).toBeInstanceOf(Array);
      expect(data.alerts).toHaveLength(1);
    });

    it("should filter alerts by status", async () => {
      mockPrisma.budgetAlert.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/budget/alerts?status=PENDING");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.budgetAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testData.user.id,
            status: "PENDING",
          }),
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/budget/alerts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle database errors", async () => {
      mockPrisma.budgetAlert.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/budget/alerts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch budget alerts");
    });
  });

  describe("POST /api/budget/alerts", () => {
    it("should check budget alerts when authenticated", async () => {
      const { checkBudgetAlerts } = await import("@/lib/budget/alerts");

      const request = new NextRequest("http://localhost:3000/api/budget/alerts", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alertsChecked).toBeDefined();
      expect(checkBudgetAlerts).toHaveBeenCalled();
    });

    it("should check budget alerts with cron secret", async () => {
      process.env.CRON_SECRET = "test-secret";
      const { checkBudgetAlerts } = await import("@/lib/budget/alerts");

      const request = new NextRequest("http://localhost:3000/api/budget/alerts", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(checkBudgetAlerts).toHaveBeenCalled();

      delete process.env.CRON_SECRET;
    });

    it("should return 401 when cron secret is wrong", async () => {
      process.env.CRON_SECRET = "test-secret";

      const request = new NextRequest("http://localhost:3000/api/budget/alerts", {
        method: "POST",
        headers: {
          authorization: "Bearer wrong-secret",
        },
      });

      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");

      delete process.env.CRON_SECRET;
    });

    it("should handle errors when checking alerts", async () => {
      const { checkBudgetAlerts } = await import("@/lib/budget/alerts");
      vi.mocked(checkBudgetAlerts).mockRejectedValue(new Error("Check failed"));

      const request = new NextRequest("http://localhost:3000/api/budget/alerts", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check budget alerts");
    });
  });
});
