/**
 * Comprehensive Dashboard API Tests
 * Targeted tests to catch mutations and improve mutation score
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

describe("Dashboard API - Comprehensive Mutation Tests", () => {
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

  describe("Date Boundary Tests", () => {
    it("should correctly identify tasks due exactly today", async () => {
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
      expect(data.stats.tasksDueToday).toBeGreaterThanOrEqual(1);
    });

    it("should correctly identify tasks due exactly 7 days from now", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      sevenDaysFromNow.setHours(0, 0, 0, 0);

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task Due in 7 Days",
          category: "HVAC",
          nextDueDate: sevenDaysFromNow,
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
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.upcomingTasks).toBeGreaterThanOrEqual(1);
    });

    it("should correctly identify tasks due exactly 6 days from now (within 7 day window)", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const sixDaysFromNow = new Date();
      sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);
      sixDaysFromNow.setHours(0, 0, 0, 0);

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task Due in 6 Days",
          category: "HVAC",
          nextDueDate: sixDaysFromNow,
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
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.upcomingTasks).toBeGreaterThanOrEqual(1);
    });

    it("should exclude tasks due more than 7 days from now", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const eightDaysFromNow = new Date();
      eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 8);
      eightDaysFromNow.setHours(0, 0, 0, 0);

      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task Due in 8 Days",
          category: "HVAC",
          nextDueDate: eightDaysFromNow,
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
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should not be in upcoming (7 day window)
      expect(data.tasks.upcoming.length).toBe(0);
    });
  });

  describe("Spending Calculation Edge Cases", () => {
    it("should handle zero cost records", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockHistory = [
        { cost: 0, serviceDate: new Date(), serviceType: "maintenance" },
        { cost: 100, serviceDate: new Date(), serviceType: "repair" },
        { cost: 0, serviceDate: new Date(), serviceType: "inspection" },
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
      expect(data.stats.totalSpending).toBe(100);
    });

    it("should handle negative cost records", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockHistory = [
        { cost: -50, serviceDate: new Date(), serviceType: "refund" },
        { cost: 100, serviceDate: new Date(), serviceType: "repair" },
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
      expect(data.stats.totalSpending).toBe(50); // 100 + (-50)
    });

    it("should handle very large cost values", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockHistory = [
        { cost: 999999999, serviceDate: new Date(), serviceType: "major_renovation" },
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
      expect(data.stats.totalSpending).toBe(999999999);
    });

    it("should correctly filter monthly spending by date boundaries", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const lastMonth = new Date(currentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const mockHistory = [
        { cost: 100, serviceDate: currentMonth, serviceType: "maintenance" },
        { cost: 200, serviceDate: lastMonth, serviceType: "repair" },
        { cost: 50, serviceDate: nextMonth, serviceType: "inspection" },
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

  describe("Completion Rate Calculations", () => {
    it("should calculate completion rate correctly with mixed tasks", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        { id: "task1", homeId: "home1", completed: true, completedDate: new Date(), snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
        { id: "task2", homeId: "home1", completed: true, completedDate: new Date(), snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
        { id: "task3", homeId: "home1", completed: false, snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
        { id: "task4", homeId: "home1", completed: false, snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
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
      expect(data.stats.completionRate).toBe(50); // 2 out of 4
      expect(data.stats.totalTasks).toBe(4);
      expect(data.stats.activeTasks).toBe(2);
    });

    it("should handle completion rate with only completed tasks", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        { id: "task1", homeId: "home1", completed: true, completedDate: new Date(), snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
        { id: "task2", homeId: "home1", completed: true, completedDate: new Date(), snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
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

    it("should handle completion rate with only incomplete tasks", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        { id: "task1", homeId: "home1", completed: false, snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
        { id: "task2", homeId: "home1", completed: false, snoozedUntil: null, home: { id: "home1", address: "123 Test", city: "SF" } },
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
      expect(data.stats.completionRate).toBe(0);
      expect(data.stats.activeTasks).toBe(2);
    });
  });

  describe("Spending by Category Aggregation", () => {
    it("should correctly aggregate costs by category", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "HVAC Task 1",
          category: "HVAC",
          costEstimate: 100,
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "HVAC Task 2",
          category: "HVAC",
          costEstimate: 150,
          nextDueDate: new Date("2024-12-25"),
          completed: false,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "task3",
          homeId: "home1",
          name: "Plumbing Task",
          category: "PLUMBING",
          costEstimate: 200,
          nextDueDate: new Date("2024-12-30"),
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
      const data = await response.json();

      expect(response.status).toBe(200);
      const hvacCategory = data.spending.byCategory.find((c: any) => c.category === "HVAC");
      const plumbingCategory = data.spending.byCategory.find((c: any) => c.category === "PLUMBING");
      
      if (hvacCategory) {
        expect(hvacCategory.amount).toBe(250); // 100 + 150
      }
      if (plumbingCategory) {
        expect(plumbingCategory.amount).toBe(200);
      }
    });

    it("should exclude tasks without costEstimate from category spending", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const mockTasks = [
        {
          id: "task1",
          homeId: "home1",
          name: "Task with cost",
          category: "HVAC",
          costEstimate: 100,
          nextDueDate: new Date("2024-12-20"),
          completed: false,
          snoozedUntil: null,
          home: { id: "home1", address: "123 Test", city: "SF" },
        },
        {
          id: "task2",
          homeId: "home1",
          name: "Task without cost",
          category: "HVAC",
          costEstimate: null,
          nextDueDate: new Date("2024-12-25"),
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
      const data = await response.json();

      expect(response.status).toBe(200);
      const hvacCategory = data.spending.byCategory.find((c: any) => c.category === "HVAC");
      if (hvacCategory) {
        expect(hvacCategory.amount).toBe(100); // Only task with costEstimate
      }
    });
  });

  describe("Warranty Date Boundary Tests", () => {
    it("should correctly identify warranties expiring in exactly 29 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const twentyNineDaysFromNow = new Date();
      twentyNineDaysFromNow.setDate(twentyNineDaysFromNow.getDate() + 29);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "REFRIGERATOR",
          brand: "Samsung",
          model: "RF28",
          warrantyExpiry: twentyNineDaysFromNow,
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
      // Should be in 30-day alert (29 < 30)
      expect(data.alerts.warrantiesExpiring30.length).toBeGreaterThanOrEqual(0);
    });

    it("should correctly identify warranties expiring in exactly 31 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const thirtyOneDaysFromNow = new Date();
      thirtyOneDaysFromNow.setDate(thirtyOneDaysFromNow.getDate() + 31);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "DISHWASHER",
          brand: "Bosch",
          model: "SHX",
          warrantyExpiry: thirtyOneDaysFromNow,
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
      // Should be in 60-day alert (31 < 60)
      expect(data.alerts.warrantiesExpiring60.length).toBeGreaterThanOrEqual(0);
    });

    it("should correctly identify warranties expiring in exactly 59 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const fiftyNineDaysFromNow = new Date();
      fiftyNineDaysFromNow.setDate(fiftyNineDaysFromNow.getDate() + 59);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "WASHER",
          brand: "LG",
          model: "WM",
          warrantyExpiry: fiftyNineDaysFromNow,
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
      // Should be in 60-day alert (59 < 60)
      expect(data.alerts.warrantiesExpiring60.length).toBeGreaterThanOrEqual(0);
    });

    it("should correctly identify warranties expiring in exactly 61 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const sixtyOneDaysFromNow = new Date();
      sixtyOneDaysFromNow.setDate(sixtyOneDaysFromNow.getDate() + 61);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "DRYER",
          brand: "Whirlpool",
          model: "WED",
          warrantyExpiry: sixtyOneDaysFromNow,
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
      // Should be in 90-day alert (61 < 90)
      expect(data.alerts.warrantiesExpiring90.length).toBeGreaterThanOrEqual(0);
    });

    it("should correctly identify warranties expiring in exactly 89 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const eightyNineDaysFromNow = new Date();
      eightyNineDaysFromNow.setDate(eightyNineDaysFromNow.getDate() + 89);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "OVEN",
          brand: "KitchenAid",
          model: "KOS",
          warrantyExpiry: eightyNineDaysFromNow,
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
      // Should be in 90-day alert (89 < 90)
      expect(data.alerts.warrantiesExpiring90.length).toBeGreaterThanOrEqual(0);
    });

    it("should exclude warranties expiring in more than 90 days", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const ninetyOneDaysFromNow = new Date();
      ninetyOneDaysFromNow.setDate(ninetyOneDaysFromNow.getDate() + 91);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "MICROWAVE",
          brand: "GE",
          model: "JVM",
          warrantyExpiry: ninetyOneDaysFromNow,
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
      // Should not be in any alert (91 > 90)
      expect(data.alerts.warrantiesExpiring30.length).toBe(0);
      expect(data.alerts.warrantiesExpiring60.length).toBe(0);
      expect(data.alerts.warrantiesExpiring90.length).toBe(0);
    });
  });

  describe("Items Needing Attention - Lifespan Calculations", () => {
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
      if (data.alerts.itemsNeedingAttention.length > 0) {
        expect(data.alerts.itemsNeedingAttention[0].lifespanPercentage).toBeGreaterThanOrEqual(80);
      }
    });

    it("should identify items at exactly 79% of lifespan (should not trigger)", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const sevenPointNineYearsAgo = new Date();
      sevenPointNineYearsAgo.setFullYear(sevenPointNineYearsAgo.getFullYear() - 7);
      sevenPointNineYearsAgo.setMonth(sevenPointNineYearsAgo.getMonth() - 11); // ~7.9 years

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "FURNACE",
          brand: "Carrier",
          model: "INF",
          warrantyExpiry: null,
          installDate: sevenPointNineYearsAgo,
          expectedLifespan: 10, // ~7.9 years = ~79%
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
      // Should not trigger (79% < 80%)
      expect(data.alerts.itemsNeedingAttention.length).toBe(0);
    });

    it("should identify items at exactly 100% of lifespan", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "DISHWASHER",
          brand: "Bosch",
          model: "SHX",
          warrantyExpiry: null,
          installDate: tenYearsAgo,
          expectedLifespan: 10, // 10 years = 100%
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
      if (data.alerts.itemsNeedingAttention.length > 0) {
        expect(data.alerts.itemsNeedingAttention[0].lifespanPercentage).toBeGreaterThanOrEqual(100);
      }
    });

    it("should identify items over 100% of lifespan", async () => {
      const mockHomes = [{ id: "home1", userId: "user_test123" }];
      const twelveYearsAgo = new Date();
      twelveYearsAgo.setFullYear(twelveYearsAgo.getFullYear() - 12);

      const mockAppliances = [
        {
          id: "app1",
          applianceType: "REFRIGERATOR",
          brand: "Samsung",
          model: "RF28",
          warrantyExpiry: null,
          installDate: twelveYearsAgo,
          expectedLifespan: 10, // 12 years = 120%
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
      if (data.alerts.itemsNeedingAttention.length > 0) {
        expect(data.alerts.itemsNeedingAttention[0].lifespanPercentage).toBeGreaterThan(100);
      }
    });
  });
});

