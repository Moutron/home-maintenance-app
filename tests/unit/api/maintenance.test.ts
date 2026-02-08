/**
 * Tests for Maintenance History API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/maintenance/history/route";
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

describe("Maintenance History API", () => {
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
  });

  describe("GET /api/maintenance/history", () => {
    it("should return maintenance history for authenticated user", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([
        {
          id: "maint1",
          homeId: testData.home.id,
          serviceDate: new Date(),
          serviceType: "maintenance",
          description: "Test maintenance",
          cost: 100,
        },
      ]);

      const request = new NextRequest(
        `http://localhost:3000/api/maintenance/history?homeId=${testData.home.id}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toBeInstanceOf(Array);
      expect(mockPrisma.maintenanceHistory.findMany).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/maintenance/history?homeId=${testData.home.id}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when homeId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/maintenance/history");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("homeId is required");
    });

    it("should filter by applianceId", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost:3000/api/maintenance/history?homeId=${testData.home.id}&applianceId=appliance1`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.maintenanceHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            homeId: testData.home.id,
            applianceId: "appliance1",
          }),
        })
      );
    });

    it("should return 404 when home not found", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/maintenance/history?homeId=nonexistent`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Home not found or access denied");
    });

    it("should handle database errors", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceHistory.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        `http://localhost:3000/api/maintenance/history?homeId=${testData.home.id}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch maintenance history");
    });
  });

  describe("POST /api/maintenance/history", () => {
    const validHistoryData = {
      homeId: testData.home.id,
      serviceDate: new Date().toISOString(),
      serviceType: "maintenance" as const,
      description: "Test maintenance record",
      cost: 100,
      contractorName: "Test Contractor",
      photos: [],
      receipts: [],
    };

    it("should create a maintenance record", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceHistory.create.mockResolvedValue({
        id: "maint1",
        ...validHistoryData,
        serviceDate: new Date(validHistoryData.serviceDate),
      });

      const request = new NextRequest("http://localhost:3000/api/maintenance/history", {
        method: "POST",
        body: JSON.stringify(validHistoryData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validHistoryData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.history).toBeDefined();
      expect(mockPrisma.maintenanceHistory.create).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/maintenance/history", {
        method: "POST",
        body: JSON.stringify(validHistoryData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validHistoryData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when validation fails", async () => {
      const invalidData = {
        homeId: testData.home.id,
        // Missing required fields
      };

      const request = new NextRequest("http://localhost:3000/api/maintenance/history", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      vi.spyOn(request, "json").mockResolvedValue(invalidData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should return 404 when home not found", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/maintenance/history", {
        method: "POST",
        body: JSON.stringify(validHistoryData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validHistoryData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Home not found or access denied");
    });

    it("should handle database errors", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.maintenanceHistory.create.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/maintenance/history", {
        method: "POST",
        body: JSON.stringify(validHistoryData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validHistoryData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
