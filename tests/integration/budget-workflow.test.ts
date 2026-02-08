/**
 * Integration Tests for Budget Workflow
 * Tests the complete flow of budget planning, tracking, and alerts
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as CREATE_PLAN } from "@/app/api/budget/plans/route";
import { GET as GET_PROJECTS } from "@/app/api/budget/projects/route";
import { POST as CHECK_ALERTS } from "@/app/api/budget/alerts/route";
import { mockClerkAuth, testData, createMockPrisma } from "../utils/test-helpers";
import { auth, currentUser } from "@clerk/nextjs/server";

// Mock Prisma
vi.mock("@/lib/prisma", async () => {
  const { vi } = await import("vitest");
  const { createMockPrisma } = await import("../utils/test-helpers");
  return {
    prisma: createMockPrisma(),
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs/server");

// Mock notification services
vi.mock("@/lib/notifications/push", () => ({
  sendPushNotificationToUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/budget-emails", () => ({
  sendBudgetAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock budget alerts service
vi.mock("@/lib/budget/alerts", () => ({
  checkBudgetAlerts: vi.fn().mockResolvedValue({
    alertsChecked: 1,
    alertsCreated: 1,
    alertsSent: 1,
  }),
}));

describe("Budget Workflow Integration", () => {
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

  describe("Complete Budget Workflow", () => {
    it("should create budget plan, track projects, and generate alerts", async () => {
      // Step 1: Create a budget plan
      const budgetPlan = {
        ...testData.budgetPlan,
        id: "budget_new123",
      };
      mockPrisma.budgetPlan.create.mockResolvedValue(budgetPlan);

      const createRequest = new NextRequest(
        "http://localhost:3000/api/budget/plans",
        {
          method: "POST",
          body: JSON.stringify({
            name: "2024 Home Maintenance Budget",
            period: "MONTHLY",
            amount: 1000,
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          }),
        }
      );

      const createResponse = await CREATE_PLAN(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.budgetPlan).toBeDefined();
      expect(createData.budgetPlan.name).toBe("2024 Home Maintenance Budget");

      // Step 2: Get project budgets (omit actualCost so API computes from materials = 400)
      const project = {
        ...testData.diyProject,
        budget: 500,
        actualCost: undefined,
        home: {
          address: "123 Test St",
          city: "San Francisco",
          state: "CA",
        },
        materials: [
          { purchased: true, totalPrice: 400 },
        ],
        tools: [],
      };

      mockPrisma.diyProject.findMany.mockResolvedValue([project]);

      const projectsRequest = new NextRequest(
        "http://localhost:3000/api/budget/projects"
      );
      const projectsResponse = await GET_PROJECTS(projectsRequest);
      const projectsData = await projectsResponse.json();

      expect(projectsResponse.status).toBe(200);
      expect(projectsData.projects).toHaveLength(1);
      expect(projectsData.projects[0].budget).toBe(500);
      expect(projectsData.projects[0].actualCost).toBe(400);

      // Step 3: Check for alerts
      const { checkBudgetAlerts } = await import("@/lib/budget/alerts");

      const alertsRequest = new NextRequest(
        "http://localhost:3000/api/budget/alerts",
        {
          method: "POST",
        }
      );

      const alertsResponse = await CHECK_ALERTS(alertsRequest);
      const alertsData = await alertsResponse.json();

      expect(alertsResponse.status).toBe(200);
      expect(alertsData.success).toBe(true);
      expect(checkBudgetAlerts).toHaveBeenCalled();
    });

    it("should track spending across multiple projects and calculate totals", async () => {
      const projects = [
        {
          ...testData.diyProject,
          id: "project_1",
          budget: 500,
          actualCost: 300,
          home: { address: "123 Test St", city: "SF", state: "CA" },
          materials: [{ purchased: true, totalPrice: 300 }],
          tools: [],
        },
        {
          ...testData.diyProject,
          id: "project_2",
          budget: 1000,
          actualCost: 800,
          home: { address: "456 Test St", city: "SF", state: "CA" },
          materials: [{ purchased: true, totalPrice: 800 }],
          tools: [],
        },
        {
          ...testData.diyProject,
          id: "project_3",
          budget: 300,
          actualCost: 400, // Over budget
          home: { address: "789 Test St", city: "SF", state: "CA" },
          materials: [{ purchased: true, totalPrice: 400 }],
          tools: [],
        },
      ];

      mockPrisma.diyProject.findMany.mockResolvedValue(projects);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/projects"
      );
      const response = await GET_PROJECTS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalProjects).toBe(3);
      expect(data.summary.totalBudget).toBe(1800); // 500 + 1000 + 300
      expect(data.summary.totalSpent).toBe(1500); // 300 + 800 + 400
      expect(data.summary.totalRemaining).toBe(300); // 1800 - 1500
      expect(data.summary.projectsOverBudget).toBe(1); // project_3
    });

    it("should handle budget plan with category filtering", async () => {
      const hvacBudgetPlan = {
        ...testData.budgetPlan,
        category: "HVAC",
        period: "QUARTERLY",
      };
      mockPrisma.budgetPlan.create.mockResolvedValue(hvacBudgetPlan);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans",
        {
          method: "POST",
          body: JSON.stringify({
            name: "HVAC Budget 2024",
            period: "QUARTERLY",
            amount: 2000,
            startDate: "2024-01-01",
            endDate: "2024-03-31",
            category: "HVAC",
          }),
        }
      );

      const response = await CREATE_PLAN(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.budgetPlan.category).toBe("HVAC");
      expect(data.budgetPlan.period).toBe("QUARTERLY");
    });

    it("should handle annual budget planning", async () => {
      const annualBudgetPlan = {
        ...testData.budgetPlan,
        period: "ANNUAL",
        amount: 12000,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      };
      mockPrisma.budgetPlan.create.mockResolvedValue(annualBudgetPlan);

      const request = new NextRequest(
        "http://localhost:3000/api/budget/plans",
        {
          method: "POST",
          body: JSON.stringify({
            name: "2024 Annual Budget",
            period: "ANNUAL",
            amount: 12000,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
          }),
        }
      );

      const response = await CREATE_PLAN(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.budgetPlan.period).toBe("ANNUAL");
      expect(data.budgetPlan.amount).toBe(12000);
    });
  });
});

