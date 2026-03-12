/**
 * Tests for Vehicles API (My Garage feature)
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/vehicles/route";
import { GET as GET_ONE, PATCH, DELETE } from "@/app/api/vehicles/[id]/route";
import { POST as POST_GENERATE_TASKS } from "@/app/api/vehicles/[id]/generate-tasks/route";
import { POST as POST_GENERATE_TASKS_AI } from "@/app/api/vehicles/[id]/generate-tasks-ai/route";
import { mockClerkAuth, testData, createMockPrisma } from "../../utils/test-helpers";
import { auth } from "@clerk/nextjs/server";

vi.mock("@/lib/ai/claude", () => ({
  createCompletion: vi.fn(),
  isAiConfigured: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
  const { vi } = await import("vitest");
  const { createMockPrisma } = await import("../../utils/test-helpers");
  return { prisma: createMockPrisma() };
});

vi.mock("@clerk/nextjs/server");

describe("Vehicles API", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

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
      email: testData.user.email,
    });
  });

  describe("GET /api/vehicles", () => {
    it("should return vehicles for authenticated user", async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([testData.vehicle]);

      const request = new NextRequest("http://localhost:3000/api/vehicles");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vehicles).toBeInstanceOf(Array);
      expect(data.vehicles).toHaveLength(1);
      expect(mockPrisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testData.user.id },
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return empty array when user has no vehicles", async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vehicles).toEqual([]);
    });
  });

  describe("POST /api/vehicles", () => {
    it("should create a vehicle", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: testData.user.id,
        clerkId: testData.user.clerkId,
        email: testData.user.email,
      });
      mockPrisma.vehicle.create.mockResolvedValue(testData.vehicle as any);

      const request = new NextRequest("http://localhost:3000/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          year: 2020,
          make: "Honda",
          model: "Civic",
          nickname: "Daily driver",
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.vehicle).toBeDefined();
      expect(mockPrisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testData.user.id,
            year: 2020,
            make: "Honda",
            model: "Civic",
            nickname: "Daily driver",
          }),
        })
      );
    });

    it("should return 400 for invalid body", async () => {
      const request = new NextRequest("http://localhost:3000/api/vehicles", {
        method: "POST",
        body: JSON.stringify({ year: 2020 }), // missing make, model
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/vehicles/[id]", () => {
    it("should return vehicle when user owns it", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(testData.vehicle as any);

      const request = new NextRequest("http://localhost:3000/api/vehicles/vehicle_test123");
      const response = await GET_ONE(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vehicle).toBeDefined();
      expect(data.vehicle.id).toBe("vehicle_test123");
      expect(mockPrisma.vehicle.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "vehicle_test123", userId: testData.user.id },
        })
      );
    });

    it("should return 404 when vehicle not found", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/vehicles/nonexistent");
      const response = await GET_ONE(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Vehicle not found");
    });
  });

  describe("PATCH /api/vehicles/[id]", () => {
    it("should update vehicle when user owns it", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(testData.vehicle as any);
      mockPrisma.vehicle.update.mockResolvedValue({
        ...testData.vehicle,
        currentMileage: 40000,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/vehicles/vehicle_test123", {
        method: "PATCH",
        body: JSON.stringify({ currentMileage: 40000 }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vehicle).toBeDefined();
      expect(mockPrisma.vehicle.update).toHaveBeenCalled();
    });

    it("should return 404 when vehicle not found", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/vehicles/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({ nickname: "Updated" }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/vehicles/[id]", () => {
    it("should delete vehicle when user owns it", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(testData.vehicle as any);
      mockPrisma.vehicle.delete.mockResolvedValue(testData.vehicle as any);

      const request = new NextRequest("http://localhost:3000/api/vehicles/vehicle_test123", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.vehicle.delete).toHaveBeenCalledWith({
        where: { id: "vehicle_test123" },
      });
    });

    it("should return 404 when vehicle not found", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/vehicles/nonexistent", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/vehicles/[id]/generate-tasks", () => {
    it("should create vehicle maintenance tasks from VEHICLE templates", async () => {
      const template = {
        id: "tpl_vehicle_1",
        name: "Oil and Filter Change",
        description: "Replace engine oil and filter",
        category: "VEHICLE",
        baseFrequency: "QUARTERLY",
      };
      mockPrisma.vehicle.findFirst.mockResolvedValue(testData.vehicle as any);
      mockPrisma.taskTemplate.findMany.mockResolvedValue([template] as any);
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceTask.create.mockResolvedValue({
        id: "task_new_1",
        vehicleId: "vehicle_test123",
        name: template.name,
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/vehicles/vehicle_test123/generate-tasks",
        { method: "POST" }
      );
      const response = await POST_GENERATE_TASKS(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("Created");
      expect(data.created).toBeInstanceOf(Array);
      expect(mockPrisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, category: "VEHICLE" },
        })
      );
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalled();
    });

    it("should return 404 when vehicle not found", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/vehicles/nonexistent/generate-tasks",
        { method: "POST" }
      );
      const response = await POST_GENERATE_TASKS(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Vehicle not found");
    });

    it("should return 404 when no VEHICLE templates exist", async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(testData.vehicle as any);
      mockPrisma.taskTemplate.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/vehicles/vehicle_test123/generate-tasks",
        { method: "POST" }
      );
      const response = await POST_GENERATE_TASKS(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("No vehicle task templates found");
    });
  });

  describe("POST /api/vehicles/[id]/generate-tasks-ai", () => {
    it("should return 503 when AI is not configured", async () => {
      const { isAiConfigured } = await import("@/lib/ai/claude");
      vi.mocked(isAiConfigured).mockReturnValue(false);

      const request = new NextRequest(
        "http://localhost:3000/api/vehicles/vehicle_test123/generate-tasks-ai",
        { method: "POST" }
      );
      const response = await POST_GENERATE_TASKS_AI(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain("AI is not configured");
      const { createCompletion } = await import("@/lib/ai/claude");
      expect(vi.mocked(createCompletion)).not.toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      const { isAiConfigured } = await import("@/lib/ai/claude");
      vi.mocked(isAiConfigured).mockReturnValue(true);
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/vehicles/vehicle_test123/generate-tasks-ai",
        { method: "POST" }
      );
      const response = await POST_GENERATE_TASKS_AI(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when vehicle not found", async () => {
      const { isAiConfigured, createCompletion } = await import("@/lib/ai/claude");
      vi.mocked(isAiConfigured).mockReturnValue(true);
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/vehicles/nonexistent/generate-tasks-ai",
        { method: "POST" }
      );
      const response = await POST_GENERATE_TASKS_AI(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Vehicle not found");
      expect(vi.mocked(createCompletion)).not.toHaveBeenCalled();
    });

    it("should create tasks from AI response", async () => {
      const { isAiConfigured, createCompletion } = await import("@/lib/ai/claude");
      vi.mocked(isAiConfigured).mockReturnValue(true);
      mockPrisma.vehicle.findFirst.mockResolvedValue(testData.vehicle as any);
      vi.mocked(createCompletion).mockResolvedValue(
        JSON.stringify([
          {
            name: "Oil and filter change",
            description: "Replace engine oil and filter per manual.",
            category: "VEHICLE",
            frequency: "QUARTERLY",
            priority: "medium",
            costEstimateMin: 40,
            costEstimateMax: 80,
            explanation: "Required for warranty and engine life.",
          },
        ])
      );
      mockPrisma.maintenanceTask.create.mockResolvedValue({
        id: "task_ai_1",
        name: "Oil and filter change",
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/vehicles/vehicle_test123/generate-tasks-ai",
        { method: "POST" }
      );
      const response = await POST_GENERATE_TASKS_AI(request, {
        params: Promise.resolve({ id: "vehicle_test123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("owner's manual");
      expect(data.created).toBeInstanceOf(Array);
      expect(data.created).toHaveLength(1);
      expect(mockPrisma.maintenanceTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: "vehicle_test123",
            homeId: null,
            name: "Oil and filter change",
            category: "VEHICLE",
            frequency: "QUARTERLY",
          }),
        })
      );
    });
  });
});
