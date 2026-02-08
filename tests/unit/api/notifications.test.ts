/**
 * Tests for Notifications API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as POST_SUBSCRIBE } from "@/app/api/notifications/push/subscribe/route";
import { POST as POST_UNSUBSCRIBE } from "@/app/api/notifications/push/unsubscribe/route";
import { POST as POST_SEND_REMINDERS } from "@/app/api/notifications/send-reminders/route";
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

// Mock email and push so send-reminders route doesn't throw
vi.mock("@/lib/notifications/email", () => ({
  sendTaskReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendBulkTaskReminders: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications/push", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
  createTaskReminderPush: vi.fn().mockReturnValue({}),
}));

describe("Notifications API", () => {
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
    mockPrisma.user.update.mockResolvedValue(testData.user);
  });

  describe("POST /api/notifications/push/subscribe", () => {
    const validSubscribeData = {
      playerId: "onesignal_player_123",
    };

    it("should subscribe user to push notifications", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/push/subscribe", {
        method: "POST",
        body: JSON.stringify(validSubscribeData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validSubscribeData);

      const response = await POST_SUBSCRIBE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("subscribed");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/notifications/push/subscribe", {
        method: "POST",
        body: JSON.stringify(validSubscribeData),
      });

      const response = await POST_SUBSCRIBE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when playerId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/push/subscribe", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST_SUBSCRIBE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Player ID");
    });
  });

  describe("POST /api/notifications/push/unsubscribe", () => {
    it("should unsubscribe user from push notifications", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST_UNSUBSCRIBE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/notifications/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST_UNSUBSCRIBE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/notifications/send-reminders", () => {
    it("should send task reminders", async () => {
      mockPrisma.home.findMany.mockResolvedValue([{ id: testData.home.id }]);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([
        {
          ...testData.task,
          nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          home: { address: testData.home.address, city: testData.home.city, state: testData.home.state },
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/notifications/send-reminders", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST_SEND_REMINDERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sent).toBeDefined();
      expect(data.message).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/notifications/send-reminders", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST_SEND_REMINDERS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
