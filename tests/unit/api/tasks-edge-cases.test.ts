/**
 * Edge Case Tests for Tasks API
 * Tests to catch mutations and improve mutation score
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
    switch (frequency) {
      case "WEEKLY":
        date.setDate(date.getDate() + 7);
        break;
      case "MONTHLY":
        date.setMonth(date.getMonth() + 1);
        break;
      case "QUARTERLY":
        date.setMonth(date.getMonth() + 3);
        break;
      case "BIANNUAL":
        date.setMonth(date.getMonth() + 6);
        break;
      case "ANNUAL":
        date.setFullYear(date.getFullYear() + 1);
        break;
      case "SEASONAL":
        date.setMonth(date.getMonth() + 3);
        break;
      case "AS_NEEDED":
        date.setMonth(date.getMonth() + 6);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }),
  formatRecurrence: vi.fn(),
}));

describe("Tasks API - Edge Cases", () => {
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

  describe("GET /api/tasks - Edge Cases", () => {
    it("should handle category filter correctly", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([
        { ...testData.task, category: "HVAC" },
        { ...testData.task, id: "task2", category: "PLUMBING" },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/tasks?category=HVAC"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.maintenanceTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "HVAC",
          }),
        })
      );
    });

    it("should handle completed=true filter correctly", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([
        { ...testData.task, completed: true },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/tasks?completed=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.maintenanceTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completed: true,
          }),
        })
      );
    });

    it("should handle completed=false filter correctly", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([
        { ...testData.task, completed: false },
      ]);

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
  });

  describe("POST /api/tasks - Edge Cases", () => {
    it("should handle task creation with all optional fields", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceTask.create.mockResolvedValue({
        ...testData.task,
        costEstimate: 100,
        notes: "Test notes",
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
          costEstimate: 100,
          notes: "Test notes",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.task).toBeDefined();
      
      // Verify the create was called with the correct data
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalled();
      const createCall = (mockPrisma.maintenanceTask.create as any).mock.calls[0];
      expect(createCall[0]).toBeDefined();
      expect(createCall[0].data).toBeDefined();
      expect(createCall[0].data.costEstimate).toBe(100);
      expect(createCall[0].data.notes).toBe("Test notes");
    });

    it("should handle task creation with null snoozedUntil", async () => {
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
          snoozedUntil: null,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalled();
    });

    it("should handle task creation with null customRecurrence", async () => {
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
          customRecurrence: null,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalled();
    });
  });

  describe("PATCH /api/tasks - Edge Cases", () => {
    it("should handle updating task without completing it", async () => {
      const existingTask = {
        ...testData.task,
        completed: false,
        home: { userId: "user_test123" },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(existingTask);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update.mockResolvedValue({
        ...existingTask,
        name: "Updated Task",
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          name: "Updated Task",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.task.name).toBe("Updated Task");
      // Should not create CompletedTask if not completing
      expect(mockPrisma.completedTask.create).not.toHaveBeenCalled();
    });

    it("should handle updating completed task to incomplete", async () => {
      const existingTask = {
        ...testData.task,
        completed: true,
        completedDate: new Date("2024-12-01"),
        home: { userId: "user_test123" },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(existingTask);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update.mockResolvedValue({
        ...existingTask,
        completed: false,
        completedDate: null,
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          completed: false,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.task.completed).toBe(false);
    });

    it("should handle updating snoozedUntil to null", async () => {
      const existingTask = {
        ...testData.task,
        snoozedUntil: new Date("2025-01-15"),
        home: { userId: "user_test123" },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(existingTask);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update.mockResolvedValue({
        ...existingTask,
        snoozedUntil: null,
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          snoozedUntil: null,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.task.snoozedUntil).toBeNull();
    });

    it("should handle updating customRecurrence to null", async () => {
      const existingTask = {
        ...testData.task,
        customRecurrence: { interval: 10, unit: "days" },
        home: { userId: "user_test123" },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(existingTask);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update.mockResolvedValue({
        ...existingTask,
        customRecurrence: null,
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          customRecurrence: null,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.task.customRecurrence).toBeNull();
    });

    it("should handle task completion with custom recurrence", async () => {
      const existingTask = {
        ...testData.task,
        completed: false,
        customRecurrence: { interval: 10, unit: "days" },
        home: { userId: "user_test123" },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(existingTask);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update
        .mockResolvedValueOnce({
          ...existingTask,
          completed: true,
          completedDate: new Date(),
        })
        .mockResolvedValueOnce({
          ...existingTask,
          completed: false,
          nextDueDate: new Date("2025-01-10"),
        });
      mockPrisma.completedTask.create.mockResolvedValue({
        id: "completed1",
        taskId: testData.task.id,
        userId: "user_test123",
        completedDate: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          completed: true,
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.completedTask.create).toHaveBeenCalled();
      expect(mockPrisma.maintenanceTask.update).toHaveBeenCalledTimes(2);
    });

    it("should handle task completion without custom recurrence", async () => {
      const existingTask = {
        ...testData.task,
        completed: false,
        customRecurrence: null,
        frequency: "MONTHLY",
        home: { userId: "user_test123" },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(existingTask);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update
        .mockResolvedValueOnce({
          ...existingTask,
          completed: true,
          completedDate: new Date(),
        })
        .mockResolvedValueOnce({
          ...existingTask,
          completed: false,
          nextDueDate: new Date("2025-01-31"),
        });
      mockPrisma.completedTask.create.mockResolvedValue({
        id: "completed1",
        taskId: testData.task.id,
        userId: "user_test123",
        completedDate: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: testData.task.id,
          completed: true,
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.completedTask.create).toHaveBeenCalled();
      expect(mockPrisma.maintenanceTask.update).toHaveBeenCalledTimes(2);
    });
  });
});

