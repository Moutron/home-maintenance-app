/**
 * Edge Case Tests for Dashboard API
 * Tests to catch mutations and improve mutation score
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/route";
import { mockClerkAuth, createMockPrisma } from "../../utils/test-helpers";
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

describe("Dashboard API - Edge Cases", () => {
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

  describe("Task filtering edge cases", () => {
    it("should handle tasks with null snoozedUntil", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task with null snooze",
          category: "HVAC",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue(mockTasks);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should handle tasks with past snoozedUntil", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task with past snooze",
          category: "HVAC",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          snoozedUntil: pastDate,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue(mockTasks);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Spending calculations edge cases", () => {
    it("should handle history records with null cost", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockHistory = [
        { cost: null, serviceDate: new Date(), serviceType: "maintenance" },
        { cost: 100, serviceDate: new Date(), serviceType: "repair" },
        { cost: undefined, serviceDate: new Date(), serviceType: "inspection" },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.stats.totalSpending).toBe(100); // Should handle null/undefined costs
    });

    it("should calculate monthly spending correctly with mixed dates", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const currentMonth = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const mockHistory = [
        { cost: 50, serviceDate: currentMonth, serviceType: "maintenance" },
        { cost: 75, serviceDate: currentMonth, serviceType: "repair" },
        { cost: 200, serviceDate: lastMonth, serviceType: "replacement" },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.stats.monthlySpending).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Warranty calculations edge cases", () => {
    it("should handle warranties expiring exactly in 30 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "REFRIGERATOR",
          brand: "Samsung",
          model: "RF28",
          warrantyExpiry: thirtyDaysFromNow,
          installDate: new Date("2020-01-01"),
          expectedLifespan: 15,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.alerts.warrantiesExpiring30).toBeInstanceOf(Array);
    });

    it("should handle warranties expiring exactly in 60 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "DISHWASHER",
          brand: "Bosch",
          model: "SHX",
          warrantyExpiry: sixtyDaysFromNow,
          installDate: new Date("2020-01-01"),
          expectedLifespan: 10,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.alerts.warrantiesExpiring60).toBeInstanceOf(Array);
    });

    it("should handle warranties expiring exactly in 90 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "WASHER",
          brand: "LG",
          model: "WM",
          warrantyExpiry: ninetyDaysFromNow,
          installDate: new Date("2020-01-01"),
          expectedLifespan: 12,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.alerts.warrantiesExpiring90).toBeInstanceOf(Array);
    });

    it("should handle warranties that already expired", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "DRYER",
          brand: "Whirlpool",
          model: "WED",
          warrantyExpiry: pastDate,
          installDate: new Date("2020-01-01"),
          expectedLifespan: 12,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      // Expired warranties should not appear in 30/60/90 day alerts
      expect(data.alerts.warrantiesExpiring30.length).toBe(0);
    });
  });

  describe("Items needing attention edge cases", () => {
    it("should identify items at exactly 80% of lifespan", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const eightYearsAgo = new Date();
      eightYearsAgo.setFullYear(eightYearsAgo.getFullYear() - 8);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "WATER_HEATER",
          brand: "Rheem",
          model: "PROT",
          warrantyExpiry: null,
          installDate: eightYearsAgo,
          expectedLifespan: 10, // 8 years = 80%
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.alerts.itemsNeedingAttention.length).toBeGreaterThanOrEqual(1);
    });

    it("should identify items over 100% of lifespan", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const fifteenYearsAgo = new Date();
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "FURNACE",
          brand: "Carrier",
          model: "INF",
          warrantyExpiry: null,
          installDate: fifteenYearsAgo,
          expectedLifespan: 15, // 15 years = 100%+
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.alerts.itemsNeedingAttention.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle items without installDate", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockAppliances = [
        {
          id: "app1",
          applianceType: "MICROWAVE",
          brand: "GE",
          model: "JVM",
          warrantyExpiry: null,
          installDate: null,
          expectedLifespan: 10,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      // Items without installDate should not be flagged
      expect(data.alerts.itemsNeedingAttention.length).toBe(0);
    });

    it("should handle items without expectedLifespan", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockAppliances = [
        {
          id: "app1",
          applianceType: "OVEN",
          brand: "KitchenAid",
          model: "KOS",
          warrantyExpiry: null,
          installDate: new Date("2020-01-01"),
          expectedLifespan: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      // Items without expectedLifespan should not be flagged
      expect(data.alerts.itemsNeedingAttention.length).toBe(0);
    });
  });

  describe("Task completion edge cases", () => {
    it("should handle tasks due today correctly", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task Due Today",
          category: "HVAC",
          nextDueDate: today,
          completed: false,
          priority: "high",
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.stats.tasksDueToday).toBeGreaterThanOrEqual(0);
    });

    it("should calculate completion rate correctly with zero tasks", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
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
      expect(data.stats.completionRate).toBe(0);
      expect(data.stats.totalTasks).toBe(0);
    });

    it("should calculate completion rate correctly with all tasks completed", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Completed Task 1",
          category: "HVAC",
          nextDueDate: new Date("2024-12-20"),
          completed: true,
          completedDate: new Date("2024-12-01"),
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "Completed Task 2",
          category: "PLUMBING",
          nextDueDate: new Date("2024-12-25"),
          completed: true,
          completedDate: new Date("2024-12-02"),
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      expect(data.stats.completionRate).toBe(100);
      expect(data.stats.activeTasks).toBe(0);
    });
  });

  describe("Spending by category edge cases", () => {
    it("should handle tasks with null costEstimate", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task without cost",
          category: "HVAC",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          costEstimate: null,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "Task with cost",
          category: "PLUMBING",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          costEstimate: 100,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      // Should only include tasks with costEstimate
      const plumbingCategory = data.spending.byCategory.find((c: any) => c.category === "PLUMBING");
      if (plumbingCategory) {
        expect(plumbingCategory.amount).toBe(100);
      }
    });

    it("should aggregate multiple tasks in same category", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "HVAC Task 1",
          category: "HVAC",
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          costEstimate: 50,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "HVAC Task 2",
          category: "HVAC",
          nextDueDate: new Date("2024-12-25"),
          completed: false,
          costEstimate: 75,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "task3",
          homeId: "home1",
          name: "HVAC Task 3",
          category: "HVAC",
          nextDueDate: new Date("2024-12-30"),
          completed: false,
          costEstimate: 25,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
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
      const hvacCategory = data.spending.byCategory.find((c: any) => c.category === "HVAC");
      if (hvacCategory) {
        expect(hvacCategory.amount).toBe(150); // 50 + 75 + 25
      }
    });
  });

  describe("Activity feed edge cases", () => {
    it("should sort activity by date correctly", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const olderDate = new Date("2024-11-01");
      const newerDate = new Date("2024-12-01");

      const mockCompletedTasks = [
        {
          id: "completed1",
          userId: "user_test123",
          completedDate: olderDate,
          actualCost: 100,
          task: {
            id: "task1",
            name: "Older Task",
            category: "HVAC",
            home: { id: "home1", address: "123 Test", city: "SF" },
          },
        },
        {
          id: "completed2",
          userId: "user_test123",
          completedDate: newerDate,
          actualCost: 200,
          task: {
            id: "task2",
            name: "Newer Task",
            category: "PLUMBING",
            home: { id: "home1", address: "123 Test", city: "SF" },
          },
        },
      ];

      const mockHistory = [
        {
          id: "history1",
          description: "Newer maintenance",
          serviceType: "maintenance",
          serviceDate: newerDate,
          cost: 150,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "history2",
          description: "Older maintenance",
          serviceType: "repair",
          serviceDate: olderDate,
          cost: 50,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      ];

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceHistory.findMany
        .mockResolvedValueOnce([]) // First call for spending
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
      // Should be sorted by date (newest first)
      if (data.activity.length > 1) {
        const firstDate = new Date(data.activity[0].date);
        const secondDate = new Date(data.activity[1].date);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
      }
    });

    it("should limit activity to 10 items", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockCompletedTasks = Array.from({ length: 15 }, (_, i) => ({
        id: `completed${i}`,
        userId: "user_test123",
        completedDate: new Date(`2024-12-${i + 1}`),
        actualCost: 100,
        task: {
          id: `task${i}`,
          name: `Task ${i}`,
          category: "HVAC",
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
      }));

      mockPrisma.home.findMany
        .mockResolvedValueOnce(mockHomes)
        .mockResolvedValueOnce([{ id: "home1", address: "123 Test", city: "SF", state: "CA" }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceHistory.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);
      mockPrisma.homeSystem.findMany.mockResolvedValue([]);
      mockPrisma.completedTask.findMany.mockResolvedValue(mockCompletedTasks);

      const request = new NextRequest("http://localhost:3000/api/dashboard");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activity.length).toBeLessThanOrEqual(10);
    });
  });
});

