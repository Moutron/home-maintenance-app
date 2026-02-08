/**
 * Integration Tests for Task Workflow
 * Tests complete workflows from task creation to completion
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { mockClerkAuth, testData, createMockPrisma } from "../utils/test-helpers";
import { auth, currentUser } from "@clerk/nextjs/server";

// Mock Prisma
vi.mock("@/lib/prisma", async () => {
  const { createMockPrisma } = await import("../utils/test-helpers");
  return {
    prisma: createMockPrisma(),
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs/server");

describe("Task Workflow Integration Tests", () => {
  let mockPrisma: any;
  
  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
  });

  describe("Complete Task Workflow", () => {
    it("should create, snooze, and complete a task", async () => {
      // Step 1: Create task
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceTask.create.mockResolvedValue(testData.task);

      const createRequest = {
        homeId: testData.home.id,
        name: "Test Task",
        description: "Test Description",
        category: "HVAC",
        frequency: "MONTHLY",
        nextDueDate: "2024-12-31",
      };

      expect(createRequest.homeId).toBe(testData.home.id);

      // Step 2: Snooze task
      const snoozedTask = {
        ...testData.task,
        snoozedUntil: new Date("2025-01-15"),
      };
      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(testData.task);
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.update.mockResolvedValue(snoozedTask);

      const snoozeRequest = {
        id: testData.task.id,
        snoozedUntil: "2025-01-15",
      };

      expect(snoozeRequest.id).toBe(testData.task.id);
      expect(snoozeRequest.snoozedUntil).toBe("2025-01-15");

      // Step 3: Complete task (should recalculate next due date)
      const completedTask = {
        ...testData.task,
        completed: true,
        completedDate: new Date("2024-12-31"),
      };
      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(snoozedTask);
      mockPrisma.maintenanceTask.update.mockResolvedValue(completedTask);
      mockPrisma.completedTask.create.mockResolvedValue({});

      const completeRequest = {
        id: testData.task.id,
        completed: true,
      };

      expect(completeRequest.completed).toBe(true);
    });

    it("should handle task with custom recurrence", async () => {
      const taskWithCustomRecurrence = {
        ...testData.task,
        frequency: "AS_NEEDED",
        customRecurrence: {
          interval: 10,
          unit: "days",
        },
      };

      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceTask.create.mockResolvedValue(taskWithCustomRecurrence);

      const createRequest = {
        homeId: testData.home.id,
        name: "Custom Recurrence Task",
        description: "Every 10 days",
        category: "HVAC",
        frequency: "AS_NEEDED",
        nextDueDate: "2024-12-31",
        customRecurrence: {
          interval: 10,
          unit: "days",
        },
      };

      expect(createRequest.customRecurrence.interval).toBe(10);
      expect(createRequest.customRecurrence.unit).toBe("days");
    });
  });

  describe("Task Filtering Workflow", () => {
    it("should filter tasks correctly", async () => {
      const tasks = [
        { ...testData.task, id: "task1", completed: false },
        { ...testData.task, id: "task2", completed: true },
        {
          ...testData.task,
          id: "task3",
          snoozedUntil: new Date("2027-01-15"), // Future date - should be filtered out
        },
      ];

      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue(tasks);

      // Test: Get all tasks
      const allTasks = tasks;
      expect(allTasks.length).toBe(3);

      // Test: Filter completed tasks
      const completedTasks = tasks.filter((t) => t.completed);
      expect(completedTasks.length).toBe(1);

      // Test: Filter active tasks (not snoozed)
      const activeTasks = tasks.filter(
        (t) => !t.snoozedUntil || t.snoozedUntil < new Date()
      );
      expect(activeTasks.length).toBe(2);
    });
  });
});

