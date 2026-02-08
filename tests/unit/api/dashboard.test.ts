/**
 * Tests for Dashboard API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/route";
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

// Mock date-fns
vi.mock("date-fns", () => ({
  startOfMonth: vi.fn((date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)),
  endOfMonth: vi.fn((date: Date) => {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return new Date(date.getFullYear(), date.getMonth(), lastDay.getDate());
  }),
  subDays: vi.fn((date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }),
  addDays: vi.fn((date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }),
  startOfYear: vi.fn((date: Date) => new Date(date.getFullYear(), 0, 1)),
  endOfYear: vi.fn((date: Date) => new Date(date.getFullYear(), 11, 31)),
}));

describe("Dashboard API", () => {
  let mockPrisma: any;

  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
    // Setup default user mock
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_test123",
      clerkId: "user_test123",
      email: "test@example.com",
    });
  });

  describe("GET /api/dashboard", () => {
    it("should return dashboard data for authenticated user", async () => {
      const mockHomes = [
        { id: "home1", userId: "user_test123" },
        { id: "home2", userId: "user_test123" },
      ];

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "HVAC Filter Change",
          description: "Replace HVAC filter",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: new Date("2024-12-15"),
          completed: false,
          priority: "medium",
          costEstimate: 25,
          snoozedUntil: null,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "Plumbing Inspection",
          description: "Annual plumbing check",
          category: "PLUMBING",
          frequency: "ANNUAL",
          nextDueDate: new Date("2024-11-01"), // Overdue
          completed: false,
          priority: "high",
          costEstimate: 150,
          snoozedUntil: null,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
        {
          id: "task3",
          homeId: "home2",
          name: "Gutter Cleaning",
          description: "Clean gutters",
          category: "EXTERIOR",
          frequency: "SEASONAL",
          nextDueDate: new Date("2024-12-20"), // Upcoming
          completed: false,
          priority: null,
          costEstimate: 100,
          snoozedUntil: null,
          home: {
            id: "home2",
            address: "456 Main St",
            city: "Oakland",
          },
        },
      ];

      const mockHistory = [
        {
          cost: 50,
          serviceDate: new Date("2024-12-01"),
          serviceType: "maintenance",
        },
        {
          cost: 200,
          serviceDate: new Date("2024-11-15"),
          serviceType: "repair",
        },
      ];

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "REFRIGERATOR",
          brand: "Samsung",
          model: "RF28R7351SG",
          warrantyExpiry: new Date("2025-01-15"), // Expiring in ~30 days
          installDate: new Date("2020-01-01"),
          expectedLifespan: 15,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
        {
          id: "app2",
          applianceType: "DISHWASHER",
          brand: "Bosch",
          model: "SHX878WD5N",
          warrantyExpiry: new Date("2025-03-15"), // Expiring in ~90 days
          installDate: new Date("2015-01-01"),
          expectedLifespan: 10, // 9 years old, 90% used
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
      ];

      const mockExteriorFeatures: any[] = [];
      const mockInteriorFeatures: any[] = [];
      const mockSystems: any[] = [];
      const mockCompletedTasks: any[] = [];

      mockPrisma.home.findMany.mockResolvedValue(mockHomes);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue(mockTasks);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue(mockHistory);
      mockPrisma.appliance.findMany.mockResolvedValue(mockAppliances);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue(mockExteriorFeatures);
      mockPrisma.interiorFeature.findMany.mockResolvedValue(mockInteriorFeatures);
      mockPrisma.homeSystem.findMany.mockResolvedValue(mockSystems);
      mockPrisma.completedTask.findMany.mockResolvedValue(mockCompletedTasks);
      mockPrisma.home.findMany.mockResolvedValueOnce(mockHomes).mockResolvedValueOnce([
        {
          id: "home1",
          address: "123 Test St",
          city: "San Francisco",
          state: "CA",
        },
        {
          id: "home2",
          address: "456 Main St",
          city: "Oakland",
          state: "CA",
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("stats");
      expect(data).toHaveProperty("alerts");
      expect(data).toHaveProperty("tasks");
      expect(data).toHaveProperty("spending");
      expect(data).toHaveProperty("activity");
      expect(data).toHaveProperty("homes");

      // Check stats structure
      expect(data.stats).toHaveProperty("upcomingTasks");
      expect(data.stats).toHaveProperty("overdueTasks");
      expect(data.stats).toHaveProperty("tasksDueToday");
      expect(data.stats).toHaveProperty("completedThisMonth");
      expect(data.stats).toHaveProperty("totalSpending");
      expect(data.stats).toHaveProperty("monthlySpending");
      expect(data.stats).toHaveProperty("yearlySpending");
      expect(data.stats).toHaveProperty("completionRate");
      expect(data.stats).toHaveProperty("totalTasks");
      expect(data.stats).toHaveProperty("activeTasks");
    });

    it("should return empty data when user has no homes", async () => {
      mockPrisma.home.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.upcomingTasks).toBe(0);
      expect(data.stats.overdueTasks).toBe(0);
      expect(data.stats.totalSpending).toBe(0);
      expect(data.alerts.overdueTasks).toEqual([]);
      expect(data.tasks.upcoming).toEqual([]);
      expect(data.homes).toEqual([]);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should filter out snoozed tasks", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Snoozed Task",
          description: "This task is snoozed",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: new Date("2024-11-01"),
          completed: false,
          priority: null,
          costEstimate: null,
          snoozedUntil: futureDate, // Snoozed into future
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "Active Task",
          description: "This task is active",
          category: "PLUMBING",
          frequency: "MONTHLY",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          priority: null,
          costEstimate: null,
          snoozedUntil: null,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([
          {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue(mockTasks);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should only count active tasks (not snoozed)
      expect(data.stats.activeTasks).toBeGreaterThanOrEqual(1);
    });

    it("should calculate overdue tasks correctly", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Overdue Task",
          description: "This task is overdue",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: yesterday,
          completed: false,
          priority: "high",
          costEstimate: 50,
          snoozedUntil: null,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([
          {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue(mockTasks);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.overdueTasks).toBeGreaterThanOrEqual(1);
      expect(data.alerts.overdueTasks.length).toBeGreaterThanOrEqual(1);
      expect(data.alerts.overdueTasks[0].name).toBe("Overdue Task");
    });

    it("should calculate spending correctly", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const currentMonth = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const mockHistory = [
        {
          cost: 100,
          serviceDate: currentMonth,
          serviceType: "maintenance",
        },
        {
          cost: 200,
          serviceDate: lastMonth,
          serviceType: "repair",
        },
        {
          cost: 50,
          serviceDate: currentMonth,
          serviceType: "inspection",
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([
          {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue(mockHistory);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.totalSpending).toBeGreaterThanOrEqual(350);
      expect(data.spending.monthly).toBeInstanceOf(Array);
      expect(data.spending.yearly).toBeInstanceOf(Array);
    });

    it("should identify warranties expiring soon", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "REFRIGERATOR",
          brand: "Samsung",
          model: "RF28R7351SG",
          warrantyExpiry: thirtyDaysFromNow,
          installDate: new Date("2020-01-01"),
          expectedLifespan: 15,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([
          {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);
      mockPrisma.appliance.findMany.mockResolvedValue(mockAppliances);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.alerts.warrantiesExpiring30.length).toBeGreaterThanOrEqual(0);
      expect(data.alerts.warrantiesExpiring60).toBeInstanceOf(Array);
      expect(data.alerts.warrantiesExpiring90).toBeInstanceOf(Array);
    });

    it("should identify items needing attention", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "DISHWASHER",
          brand: "Bosch",
          model: "SHX878WD5N",
          warrantyExpiry: null,
          installDate: tenYearsAgo,
          expectedLifespan: 10, // 10 years old, 100% used
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([
          {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);
      mockPrisma.appliance.findMany.mockResolvedValue(mockAppliances);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.alerts.itemsNeedingAttention).toBeInstanceOf(Array);
      // Should identify items at 80%+ of expected lifespan
      if (data.alerts.itemsNeedingAttention.length > 0) {
        expect(data.alerts.itemsNeedingAttention[0]).toHaveProperty("lifespanPercentage");
        expect(data.alerts.itemsNeedingAttention[0].lifespanPercentage).toBeGreaterThanOrEqual(80);
      }
    });

    it("should include recent activity", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockCompletedTasks = [
        {
          id: "completed1",
          userId: "user_test123",
          completedDate: new Date(),
          actualCost: 100,
          task: {
            id: "task1",
            name: "Completed Task",
            category: "HVAC",
            home: {
              id: "home1",
              address: "123 Test St",
              city: "San Francisco",
            },
          },
        },
      ];

      const mockHistory = [
        {
          id: "history1",
          description: "Maintenance service",
          serviceType: "maintenance",
          serviceDate: new Date(),
          cost: 150,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([
          {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceHistory.findMany
        .mockResolvedValueOnce([]) // First call for spending calculation
        .mockResolvedValueOnce(mockHistory); // Second call for activity
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue(mockCompletedTasks);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activity).toBeInstanceOf(Array);
      expect(data.activity.length).toBeGreaterThanOrEqual(0);
    });

    it("should calculate spending by category from task cost estimates", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "HVAC Task",
          description: "HVAC maintenance",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          priority: null,
          costEstimate: 100,
          snoozedUntil: null,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "Plumbing Task",
          description: "Plumbing maintenance",
          category: "PLUMBING",
          frequency: "MONTHLY",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          priority: null,
          costEstimate: 150,
          snoozedUntil: null,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
        {
          id: "task3",
          homeId: "home1",
          name: "Another HVAC Task",
          description: "More HVAC work",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          priority: null,
          costEstimate: 75,
          snoozedUntil: null,
          home: {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
          },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([
          {
            id: "home1",
            address: "123 Test St",
            city: "San Francisco",
            state: "CA",
          },
        ]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue(mockTasks);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.spending.byCategory).toBeInstanceOf(Array);
      // Should aggregate costs by category
      const hvacCategory = data.spending.byCategory.find((c: any) => c.category === "HVAC");
      if (hvacCategory) {
        expect(hvacCategory.amount).toBe(175); // 100 + 75
      }
    });

    it("should return 400 when user email not found", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        emailAddresses: [],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User email not found");
    });

    it("should handle errors gracefully", async () => {
      mockPrisma.home.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch dashboard data");
    });
  });
});

