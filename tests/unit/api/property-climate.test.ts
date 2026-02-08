/**
 * Tests for Property, Climate, and Compliance API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as POST_PROPERTY_LOOKUP } from "@/app/api/property/lookup/route";
import { POST as POST_CLIMATE_LOOKUP } from "@/app/api/climate/lookup/route";
import { POST as POST_COMPLIANCE_LOOKUP } from "@/app/api/compliance/lookup/route";
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

// Mock external APIs so route returns data
vi.mock("@/lib/utils/property-enrichment", () => ({
  enrichPropertyData: vi.fn().mockResolvedValue({
    yearBuilt: 1980,
    squareFootage: 2000,
    sources: ["test"],
  }),
  mapToHomeSchema: vi.fn().mockReturnValue({}),
}));
vi.mock("@/lib/utils/property-lookup", () => ({
  lookupProperty: vi.fn().mockResolvedValue({
    address: "123 Test St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    yearBuilt: 1980,
  }),
}));

// Mock climate and zipcode cache so climate lookup returns data
vi.mock("@/lib/utils/climate-data", () => ({
  fetchClimateData: vi.fn().mockResolvedValue({
    stormFrequency: "moderate",
    averageRainfall: 20,
    averageSnowfall: 0,
    hurricaneRisk: false,
    tornadoRisk: false,
    hailRisk: false,
    source: "test",
  }),
  estimateClimateDataFromLocation: vi.fn(),
  getClimateRecommendations: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/utils/zipcode-cache", () => ({
  getCachedZipCodeData: vi.fn().mockResolvedValue(null),
  setCachedZipCodeData: vi.fn().mockResolvedValue(undefined),
}));

describe("Property, Climate, and Compliance API", () => {
  let mockPrisma: any;
  
  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
  });

  describe("POST /api/property/lookup", () => {
    const validRequest = {
      address: "123 Test St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
    };

    it("should lookup property data", async () => {
      const request = new NextRequest("http://localhost:3000/api/property/lookup", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_PROPERTY_LOOKUP(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.found).toBe(true);
      expect(data.data).toBeDefined();
    });

    it("should return 400 when required fields are missing", async () => {
      const invalidRequest = {
        address: "123 Test St",
        // Missing city, state, zipCode
      };

      const request = new NextRequest("http://localhost:3000/api/property/lookup", {
        method: "POST",
        body: JSON.stringify(invalidRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(invalidRequest);

      const response = await POST_PROPERTY_LOOKUP(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("POST /api/climate/lookup", () => {
    const validRequest = {
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
    };

    it("should lookup climate data", async () => {
      const request = new NextRequest("http://localhost:3000/api/climate/lookup", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_CLIMATE_LOOKUP(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe("POST /api/compliance/lookup", () => {
    const validRequest = {
      zipCode: "94102",
      state: "CA",
      city: "San Francisco",
    };

    it("should lookup compliance data", async () => {
      const request = new NextRequest("http://localhost:3000/api/compliance/lookup", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_COMPLIANCE_LOOKUP(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
