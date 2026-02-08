/**
 * Tests for Predictive Maintenance API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/maintenance/predictive/route";
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

describe("Predictive Maintenance API", () => {
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
      email: testData.user.email,
    });
    mockPrisma.user.create.mockResolvedValue(testData.user);
  });

  describe("GET /api/maintenance/predictive", () => {
    it("should return predictive maintenance analysis", async () => {
      const mockHome = {
        id: testData.home.id,
        userId: testData.user.id,
      };

      const mockSystem = {
        id: "system_1",
        homeId: testData.home.id,
        systemType: "HVAC",
        brand: "Carrier",
        model: "Infinity 19",
        installDate: new Date("2015-01-01"),
        expectedLifespan: 15,
      };

      const mockAppliance = {
        id: "appliance_1",
        homeId: testData.home.id,
        applianceType: "REFRIGERATOR",
        brand: "Whirlpool",
        model: "WRF540CWHZ",
        installDate: new Date("2018-01-01"),
        expectedLifespan: 12,
      };

      mockPrisma.home.findFirst.mockResolvedValue(mockHome);
      mockPrisma.homeSystem.findMany.mockResolvedValue([mockSystem]);
      mockPrisma.appliance.findMany.mockResolvedValue([mockAppliance]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/maintenance/predictive?homeId=" + testData.home.id
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.predictions).toBeDefined();
      expect(Array.isArray(data.predictions)).toBe(true);
      expect(data.predictions.length).toBeGreaterThan(0);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/maintenance/predictive?homeId=" + testData.home.id
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when homeId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/maintenance/predictive");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("homeId is required");
    });

    it("should return 404 when home not found", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/maintenance/predictive?homeId=nonexistent"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Home not found or access denied");
    });

    it("should calculate replacement urgency correctly", async () => {
      const mockHome = {
        id: testData.home.id,
        userId: testData.user.id,
      };

      // System near end of lifespan
      const oldSystem = {
        id: "system_1",
        homeId: testData.home.id,
        systemType: "HVAC",
        brand: "Carrier",
        model: "Infinity 19",
        installDate: new Date("2010-01-01"), // 14 years old
        expectedLifespan: 15, // 93% lifespan used
      };

      mockPrisma.home.findFirst.mockResolvedValue(mockHome);
      mockPrisma.homeSystem.findMany.mockResolvedValue([oldSystem]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/maintenance/predictive?homeId=" + testData.home.id
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.predictions).toBeDefined();
      // System is 14 years old with 15 year lifespan = 93% used, which is critical (>=90%)
      expect(data.predictions[0].replacementUrgency).toBe("critical");
      expect(data.predictions[0].lifespanUsed).toBeGreaterThan(90);
    });

    it("should sort predictions by urgency", async () => {
      const mockHome = {
        id: testData.home.id,
        userId: testData.user.id,
      };

      const criticalSystem = {
        id: "system_1",
        homeId: testData.home.id,
        systemType: "HVAC",
        installDate: new Date("2010-01-01"),
        expectedLifespan: 15,
      };

      const lowUrgencySystem = {
        id: "system_2",
        homeId: testData.home.id,
        systemType: "PLUMBING",
        installDate: new Date("2020-01-01"),
        expectedLifespan: 20,
      };

      mockPrisma.home.findFirst.mockResolvedValue(mockHome);
      mockPrisma.homeSystem.findMany.mockResolvedValue([lowUrgencySystem, criticalSystem]);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/maintenance/predictive?homeId=" + testData.home.id
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.predictions).toBeDefined();
      // Critical should come first
      const urgencies = data.predictions.map((p: any) => p.replacementUrgency);
      expect(urgencies[0]).toBe("critical");
    });

    it("should handle database errors", async () => {
      mockPrisma.home.findFirst.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/maintenance/predictive?homeId=" + testData.home.id
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to calculate predictive maintenance");
    });
  });
});
