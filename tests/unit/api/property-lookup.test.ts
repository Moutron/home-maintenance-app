/**
 * Tests for Property Lookup API
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/property/lookup/route";
import { NextRequest } from "next/server";

// Mock property enrichment
vi.mock("@/lib/utils/property-enrichment", () => ({
  enrichPropertyData: vi.fn(),
  mapToHomeSchema: vi.fn(),
}));

// Mock property lookup
vi.mock("@/lib/utils/property-lookup", () => ({
  lookupProperty: vi.fn(),
}));

describe("Property Lookup API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/property/lookup", () => {
    it("should return enriched property data when found", async () => {
      const propertyEnrichment = await import("@/lib/utils/property-enrichment");
      const { enrichPropertyData } = propertyEnrichment;
      const { mapToHomeSchema } = propertyEnrichment;

      const mockEnrichedData = {
        yearBuilt: 1980,
        squareFootage: 2000,
        lotSize: 0.25,
        bedrooms: 3,
        bathrooms: 2,
        propertyType: "Single Family",
        marketValue: 500000,
        propertyImageUrl: "https://example.com/image.jpg",
        zillowUrl: "https://zillow.com/property/123",
        sources: ["rentcast"],
      };

      vi.mocked(enrichPropertyData).mockResolvedValue(mockEnrichedData);
      vi.mocked(mapToHomeSchema).mockReturnValue({
        yearBuilt: 1980,
        squareFootage: 2000,
        lotSize: 0.25,
        homeType: "single-family",
      });

      const request = new NextRequest("http://localhost:3000/api/property/lookup", {
        method: "POST",
        body: JSON.stringify({
          address: "123 Test St",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.found).toBe(true);
      expect(data.data.yearBuilt).toBe(1980);
      expect(data.data.marketValue).toBe(500000);
      expect(data.data.propertyImageUrl).toBeDefined();
      expect(data.data.zillowUrl).toBeDefined();
    });

    it("should return not found when no data available", async () => {
      const propertyEnrichment = await import("@/lib/utils/property-enrichment");
      const { enrichPropertyData } = propertyEnrichment;

      vi.mocked(enrichPropertyData).mockResolvedValue({
        sources: [],
      });

      const request = new NextRequest("http://localhost:3000/api/property/lookup", {
        method: "POST",
        body: JSON.stringify({
          address: "123 Test St",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.found).toBe(false);
    });

    it("should return 400 for missing required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/property/lookup", {
        method: "POST",
        body: JSON.stringify({
          address: "123 Test St",
          // Missing city, state, zipCode
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should handle errors gracefully", async () => {
      const propertyEnrichment = await import("@/lib/utils/property-enrichment");
      const { enrichPropertyData } = propertyEnrichment;

      vi.mocked(enrichPropertyData).mockRejectedValue(new Error("API Error"));

      const request = new NextRequest("http://localhost:3000/api/property/lookup", {
        method: "POST",
        body: JSON.stringify({
          address: "123 Test St",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.found).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should include property image and links in response", async () => {
      const propertyEnrichment = await import("@/lib/utils/property-enrichment");
      const { enrichPropertyData } = propertyEnrichment;
      const { mapToHomeSchema } = propertyEnrichment;

      const mockEnrichedData = {
        yearBuilt: 1980,
        squareFootage: 2000,
        propertyImageUrl: "https://example.com/image.jpg",
        zillowUrl: "https://zillow.com/property/123",
        redfinUrl: "https://redfin.com/property/123",
        sources: ["rentcast"],
      };

      vi.mocked(enrichPropertyData).mockResolvedValue(mockEnrichedData);
      vi.mocked(mapToHomeSchema).mockReturnValue({
        yearBuilt: 1980,
        squareFootage: 2000,
        lotSize: 0.25,
        homeType: "single-family",
      });

      const request = new NextRequest("http://localhost:3000/api/property/lookup", {
        method: "POST",
        body: JSON.stringify({
          address: "123 Test St",
          city: "San Francisco",
          state: "CA",
          zipCode: "94102",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.propertyImageUrl).toBe("https://example.com/image.jpg");
      expect(data.data.zillowUrl).toBe("https://zillow.com/property/123");
      expect(data.data.redfinUrl).toBe("https://redfin.com/property/123");
    });
  });
});

