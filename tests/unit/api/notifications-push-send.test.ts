/**
 * Tests for Notifications Push Send API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/notifications/push/send/route";
import { mockClerkAuth, testData, createMockPrisma } from "../../utils/test-helpers";
import { auth } from "@clerk/nextjs/server";

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

// Mock push notification functions
vi.mock("@/lib/notifications/push", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true),
  createTaskReminderPush: vi.fn().mockReturnValue({
    title: "Task Reminder",
    message: "Test task reminder",
    url: "/tasks",
  }),
  createWarrantyExpirationPush: vi.fn().mockReturnValue({
    title: "Warranty Expiring",
    message: "Test warranty expiration",
    url: "/warranties",
  }),
}));

describe("Notifications Push Send API", () => {
  let mockPrisma: any;

  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
  });

  describe("POST /api/notifications/push/send", () => {
    it("should send push notification with playerId and taskId", async () => {
      const mockTask = {
        id: "task_123",
        name: "Test Task",
        nextDueDate: new Date(Date.now() + 86400000), // Tomorrow
        home: {
          address: "123 Main St",
          city: "Anytown",
        },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(mockTask);

      const request = new NextRequest("http://localhost:3000/api/notifications/push/send", {
        method: "POST",
        body: JSON.stringify({
          type: "task_reminder",
          taskId: "task_123",
          playerId: "player_123",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        type: "task_reminder",
        taskId: "task_123",
        playerId: "player_123",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should send push notification with cron secret", async () => {
      process.env.CRON_SECRET = "test-secret";

      const mockTask = {
        id: "task_123",
        name: "Test Task",
        nextDueDate: new Date(Date.now() + 86400000),
        home: {
          address: "123 Main St",
          city: "Anytown",
        },
      };

      mockPrisma.maintenanceTask.findUnique.mockResolvedValue(mockTask);

      const request = new NextRequest("http://localhost:3000/api/notifications/push/send", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
        body: JSON.stringify({
          type: "task_reminder",
          taskId: "task_123",
          playerId: "player_123",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        type: "task_reminder",
        taskId: "task_123",
        playerId: "player_123",
      });

      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 401 when not authenticated and no cron secret", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);
      delete process.env.CRON_SECRET;

      const request = new NextRequest("http://localhost:3000/api/notifications/push/send", {
        method: "POST",
        body: JSON.stringify({
          type: "task_reminder",
          playerId: "player_123",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        type: "task_reminder",
        playerId: "player_123",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when playerId and userId are missing", async () => {
      // This test checks the error when neither playerId nor userId is provided
      // But the route checks auth first, so we need to provide cron secret OR auth
      // Since we're testing the missing ID case, we'll use cron secret
      process.env.CRON_SECRET = "test-secret";

      const request = new NextRequest("http://localhost:3000/api/notifications/push/send", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
        body: JSON.stringify({
          type: "task_reminder",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        type: "task_reminder",
      });

      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Player ID or user ID is required");
    });

    it("should return 404 when user push subscription not found", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/push/send", {
        method: "POST",
        body: JSON.stringify({
          type: "task_reminder",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        type: "task_reminder",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User push subscription not found");
    });

    it("should handle database errors", async () => {
      mockPrisma.maintenanceTask.findUnique.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/notifications/push/send", {
        method: "POST",
        body: JSON.stringify({
          type: "task_reminder",
          taskId: "task_123",
          playerId: "player_123",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        type: "task_reminder",
        taskId: "task_123",
        playerId: "player_123",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to send push notification");
    });
  });
});
