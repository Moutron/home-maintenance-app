/**
 * Tests for Tasks API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH } from "@/app/api/tasks/route";
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

// Mock task recurrence utility
vi.mock("@/lib/utils/task-recurrence", () => ({
  calculateNextDueDate: vi.fn((frequency: string, baseDate: Date, customRecurrence?: any) => {
    const date = new Date(baseDate);
    if (customRecurrence) {
      switch (customRecurrence.unit) {
        case "days":
          date.setDate(date.getDate() + customRecurrence.interval);
          break;
        case "weeks":
          date.setDate(date.getDate() + (customRecurrence.interval * 7));
          break;
        case "months":
          date.setMonth(date.getMonth() + customRecurrence.interval);
          break;
      }
      return date;
    }
    // Default frequency handling
    switch (frequency) {
      case "MONTHLY":
        date.setMonth(date.getMonth() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }),
  formatRecurrence: vi.fn(),
}));

describe("Tasks API", () => {
  let mockPrisma: any;
  
  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
    // Setup default user mock for all tests
    mockPrisma.user.findUnique.mockResolvedValue({ 
      id: "user_test123", 
      clerkId: "user_test123", 
      email: "test@example.com" 
    });
  });

  describe("GET /api/tasks", () => {
    it("should return tasks for authenticated user", async () => {
      // Mock user lookup/creation
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user_test123", clerkId: "user_test123", email: "test@example.com" });
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([testData.task]);

      const request = new NextRequest("http://localhost:3000/api/tasks");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks).toBeInstanceOf(Array);
      expect(mockPrisma.maintenanceTask.findMany).toHaveBeenCalled();
    });

    it("should filter tasks by homeId", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([testData.task]);

      const request = new NextRequest(
        `http://localhost:3000/api/tasks?homeId=${testData.home.id}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.maintenanceTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            homeId: testData.home.id,
            AND: expect.any(Array), // Should include snooze filter
          }),
        })
      );
    });

    it("should filter tasks by completion status", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([testData.task]);

      const request = new NextRequest(
        "http://localhost:3000/api/tasks?completed=false"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.maintenanceTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completed: false,
          }),
        })
      );
    });

    it("should filter out snoozed tasks", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/tasks");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.maintenanceTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { snoozedUntil: null },
                  expect.objectContaining({
                    snoozedUntil: expect.any(Object),
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return empty array when user has no homes", async () => {
      mockPrisma.home.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/tasks");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks).toEqual([]);
    });
  });

  describe("POST /api/tasks", () => {
    it("should create a new task", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceTask.create.mockResolvedValue({
        ...testData.task,
        home: { id: testData.home.id, address: testData.home.address },
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          homeId: testData.home.id,
          name: "Test Task",
          description: "Test Description",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: "2024-12-31",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.task).toBeDefined();
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalled();
    });

    it("should create task with snooze date", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceTask.create.mockResolvedValue(testData.task);

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          homeId: testData.home.id,
          name: "Test Task",
          description: "Test Description",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: "2024-12-31",
          snoozedUntil: "2025-01-15",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            snoozedUntil: expect.any(Date),
          }),
        })
      );
    });

    it("should create task with custom recurrence", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceTask.create.mockResolvedValue(testData.task);

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          homeId: testData.home.id,
          name: "Test Task",
          description: "Test Description",
          category: "HVAC",
          frequency: "AS_NEEDED",
          nextDueDate: "2024-12-31",
          customRecurrence: {
            interval: 10,
            unit: "days",
          },
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customRecurrence: {
              interval: 10,
              unit: "days",
            },
          }),
        })
      );
    });

    it("should return 400 for invalid task data", async () => {
      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          name: "Test Task",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 404 if home not found", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          homeId: "nonexistent",
          name: "Test Task",
          description: "Test Description",
          category: "HVAC",
          frequency: "MONTHLY",
          nextDueDate: "2024-12-31",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });
  });

  describe("PATCH /api/tasks", () => {
    it("should update task and recalculate next due date when completed", async () => {
      const completedTask = { 
        ...testData.task, 
        completed: false, 
        frequency: "MONTHLY" as const,
        customRecurrence: null,
      };
      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(completedTask);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      
      // First update: mark as completed
      mockPrisma.maintenanceTask.update.mockResolvedValueOnce({
        ...completedTask,
        completed: true,
        customRecurrence: null,
        frequency: "MONTHLY",
      });
      
      // Second update: recalculate next due date and reset completed
      mockPrisma.maintenanceTask.update.mockResolvedValueOnce({
        ...completedTask,
        completed: false,
        nextDueDate: new Date("2025-01-31"),
        completedDate: null,
      });
      
      mockPrisma.completedTask.create.mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          completed: true,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.completedTask.create).toHaveBeenCalled();
      expect(mockPrisma.maintenanceTask.update).toHaveBeenCalledTimes(2);
      expect(data.task.completed).toBe(false); // Should be reset for next occurrence
    });

    it("should update snooze date", async () => {
      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(testData.task);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update.mockResolvedValue({
        ...testData.task,
        snoozedUntil: new Date("2025-01-15"),
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          snoozedUntil: "2025-01-15",
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.maintenanceTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            snoozedUntil: expect.any(Date),
          }),
        })
      );
    });

    it("should return 404 if task not found", async () => {
      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: "nonexistent",
          completed: true,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Task not found");
    });
  });
});

