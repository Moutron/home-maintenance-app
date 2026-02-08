/**
 * Tests for Inventory API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/inventory/route";
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

describe("Inventory API", () => {
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

  describe("GET /api/inventory", () => {
    it("should return inventory items for authenticated user", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.appliance.findMany.mockResolvedValue([]);
      mockPrisma.exteriorFeature.findMany.mockResolvedValue([]);
      mockPrisma.interiorFeature.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost:3000/api/inventory?homeId=${testData.home.id}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appliances).toBeDefined();
      expect(data.exteriorFeatures).toBeDefined();
      expect(data.interiorFeatures).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest(
        `http://localhost:3000/api/inventory?homeId=${testData.home.id}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when homeId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/inventory");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("homeId is required");
    });

    it("should return 404 when home not found", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/inventory?homeId=nonexistent`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Home not found or access denied");
    });
  });

  describe("POST /api/inventory", () => {
    const validBody = {
      homeId: testData.home.id,
      appliances: [
        {
          applianceType: "REFRIGERATOR" as const,
          brand: "Test Brand",
          model: "Test Model",
        },
      ],
      exteriorFeatures: [],
      interiorFeatures: [],
    };

    it("should create an appliance", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.appliance.create.mockResolvedValue({
        id: "appliance1",
        homeId: testData.home.id,
        applianceType: "REFRIGERATOR",
        brand: "Test Brand",
        model: "Test Model",
      });

      const request = new NextRequest("http://localhost:3000/api/inventory", {
        method: "POST",
        body: JSON.stringify(validBody),
      });

      vi.spyOn(request, "json").mockResolvedValue(validBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.appliances).toBeDefined();
      expect(Array.isArray(data.appliances)).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/inventory", {
        method: "POST",
        body: JSON.stringify(validBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when validation fails", async () => {
      const invalidData = {
        homeId: testData.home.id,
        appliances: [],
        exteriorFeatures: [],
        interiorFeatures: [],
        // Missing required applianceType in appliances if we had one
      };

      const request = new NextRequest("http://localhost:3000/api/inventory", {
        method: "POST",
        body: JSON.stringify({ homeId: "", appliances: [], exteriorFeatures: [], interiorFeatures: [] }),
      });

      vi.spyOn(request, "json").mockResolvedValue({ homeId: "", appliances: [], exteriorFeatures: [], interiorFeatures: [] });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
