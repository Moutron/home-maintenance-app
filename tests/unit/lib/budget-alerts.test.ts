/**
 * Tests for Budget Alerts Service
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { checkBudgetAlerts } from "@/lib/budget/alerts";
import { prisma } from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", async () => {
  const { vi } = await import("vitest");
  const { createMockPrisma } = await import("../../utils/test-helpers");
  return {
    prisma: createMockPrisma(),
  };
});

// Mock notification services
vi.mock("@/lib/notifications/push", () => ({
  sendPushNotificationToUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/budget-emails", () => ({
  sendBudgetAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Budget Alerts Service", () => {
  let mockPrisma: any;

  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkBudgetAlerts", () => {
    it("should check active budget plans and create alerts at 80% threshold", async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const budgetPlan = {
        id: "budget_test123",
        userId: "user_test123",
        name: "Test Budget",
        period: "MONTHLY",
        amount: 1000,
        startDate,
        endDate,
        category: null,
        homeId: null,
        isActive: true,
        user: {
          id: "user_test123",
          email: "test@example.com",
          pushSubscriptions: [
            { playerId: "player_test123", isActive: true },
          ],
        },
      };

      mockPrisma.budgetPlan.findMany.mockResolvedValue([budgetPlan]);
      mockPrisma.home.findMany.mockResolvedValue([{ id: "home_test123" }]);
      mockPrisma.completedTask.findMany.mockResolvedValue([
        { actualCost: 800 }, // 80% of budget
      ]);
      mockPrisma.diyProject.findMany.mockResolvedValue([]);
      mockPrisma.budgetAlert.findFirst.mockResolvedValue(null); // No existing alert
      mockPrisma.budgetAlert.create.mockResolvedValue({
        id: "alert_test123",
        alertType: "APPROACHING_LIMIT",
      });

      const result = await checkBudgetAlerts();

      expect(result.alertsChecked).toBeGreaterThan(0);
      expect(mockPrisma.budgetPlan.findMany).toHaveBeenCalled();
      expect(mockPrisma.budgetAlert.findFirst).toHaveBeenCalled();
    });

    it("should create exceeded limit alert at 100% threshold", async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const budgetPlan = {
        id: "budget_test123",
        userId: "user_test123",
        name: "Test Budget",
        period: "MONTHLY",
        amount: 1000,
        startDate,
        endDate,
        category: null,
        homeId: null,
        isActive: true,
        user: {
          id: "user_test123",
          email: "test@example.com",
          pushSubscriptions: [
            { playerId: "player_test123", isActive: true },
          ],
        },
      };

      mockPrisma.budgetPlan.findMany.mockResolvedValue([budgetPlan]);
      mockPrisma.home.findMany.mockResolvedValue([{ id: "home_test123" }]);
      mockPrisma.completedTask.findMany.mockResolvedValue([
        { actualCost: 1100 }, // Exceeds budget
      ]);
      mockPrisma.diyProject.findMany.mockResolvedValue([]);
      mockPrisma.budgetAlert.findFirst.mockResolvedValue(null);
      mockPrisma.budgetAlert.create.mockResolvedValue({
        id: "alert_test123",
        alertType: "EXCEEDED_LIMIT",
      });

      const result = await checkBudgetAlerts();

      expect(result.alertsChecked).toBeGreaterThan(0);
      expect(mockPrisma.budgetAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alertType: "EXCEEDED_LIMIT",
          }),
        })
      );
    });

    it("should not create duplicate alerts", async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const budgetPlan = {
        id: "budget_test123",
        userId: "user_test123",
        name: "Test Budget",
        period: "MONTHLY",
        amount: 1000,
        startDate,
        endDate,
        category: null,
        homeId: null,
        isActive: true,
        user: {
          id: "user_test123",
          email: "test@example.com",
          pushSubscriptions: [],
        },
      };

      mockPrisma.budgetPlan.findMany.mockResolvedValue([budgetPlan]);
      mockPrisma.home.findMany.mockResolvedValue([{ id: "home_test123" }]);
      mockPrisma.completedTask.findMany.mockResolvedValue([
        { actualCost: 800 },
      ]);
      mockPrisma.diyProject.findMany.mockResolvedValue([]);
      // Existing alert found
      mockPrisma.budgetAlert.findFirst.mockResolvedValue({
        id: "existing_alert",
        alertType: "APPROACHING_LIMIT",
      });

      const result = await checkBudgetAlerts();

      expect(result.alertsChecked).toBeGreaterThan(0);
      // Should not create new alert
      expect(mockPrisma.budgetAlert.create).not.toHaveBeenCalled();
    });

    it("should check projects over budget", async () => {
      const project = {
        id: "project_test123",
        userId: "user_test123",
        name: "Test Project",
        budget: 500,
        status: "IN_PROGRESS",
        user: {
          id: "user_test123",
          email: "test@example.com",
          pushSubscriptions: [
            { playerId: "player_test123", isActive: true },
          ],
        },
        materials: [{ purchased: true, totalPrice: 600 }], // Over budget
        tools: [],
      };

      mockPrisma.budgetPlan.findMany.mockResolvedValue([]);
      mockPrisma.diyProject.findMany.mockResolvedValue([project]);
      mockPrisma.budgetAlert.findFirst.mockResolvedValue(null);
      mockPrisma.budgetAlert.create.mockResolvedValue({
        id: "alert_test123",
        alertType: "PROJECT_OVER_BUDGET",
      });

      const result = await checkBudgetAlerts();

      expect(result.alertsChecked).toBeGreaterThanOrEqual(0);
      expect(mockPrisma.diyProject.findMany).toHaveBeenCalled();
      expect(mockPrisma.budgetAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alertType: "PROJECT_OVER_BUDGET",
            projectId: "project_test123",
          }),
        })
      );
    });

    it("should handle projects with no budget", async () => {
      const project = {
        id: "project_test123",
        userId: "user_test123",
        name: "Test Project",
        budget: null, // No budget set
        status: "IN_PROGRESS",
        user: {
          id: "user_test123",
          email: "test@example.com",
          pushSubscriptions: [],
        },
        materials: [{ purchased: true, totalPrice: 600 }],
        tools: [],
      };

      mockPrisma.budgetPlan.findMany.mockResolvedValue([]);
      mockPrisma.diyProject.findMany.mockResolvedValue([project]);

      const result = await checkBudgetAlerts();

      expect(result.alertsChecked).toBeGreaterThanOrEqual(0);
      // Should not create alert for project without budget
      expect(mockPrisma.budgetAlert.create).not.toHaveBeenCalled();
    });

    it("should return summary of alerts checked and created", async () => {
      mockPrisma.budgetPlan.findMany.mockResolvedValue([]);
      mockPrisma.diyProject.findMany.mockResolvedValue([]);

      const result = await checkBudgetAlerts();

      expect(result).toHaveProperty("alertsChecked");
      expect(result).toHaveProperty("alertsCreated");
      expect(result).toHaveProperty("alertsSent");
      expect(typeof result.alertsChecked).toBe("number");
      expect(typeof result.alertsCreated).toBe("number");
      expect(typeof result.alertsSent).toBe("number");
    });
  });
});

