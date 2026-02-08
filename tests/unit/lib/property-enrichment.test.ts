/**
 * Tests for Property Enrichment Utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichPropertyData, mapToHomeSchema } from "@/lib/utils/property-enrichment";

// Mock the cache module
vi.mock("@/lib/utils/property-cache", () => ({
  getCachedPropertyData: vi.fn().mockResolvedValue(null),
  setCachedPropertyData: vi.fn().mockResolvedValue(undefined),
}));

// Mock the zipcode cache module
vi.mock("@/lib/utils/zipcode-cache", () => ({
  getCachedZipCodeData: vi.fn().mockResolvedValue(null),
}));

// Mock historical weather
vi.mock("@/lib/utils/historical-weather", () => ({
  fetchHistoricalWeather: vi.fn().mockResolvedValue(null),
}));

describe("Property Enrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global fetch mock
    global.fetch = vi.fn();
  });

  describe("enrichPropertyData", () => {
    it("should return enriched data with sources", async () => {
      // Mock fetch responses
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("geocoding.geo.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                result: {
                  addressMatches: [
                    {
                      coordinates: { x: -122.4194, y: 37.7749 },
                      geographies: {
                        "Census Tracts": [
                          {
                            STATE: "06",
                            COUNTY: "075",
                            TRACT: "1234.56",
                            NAME: "San Francisco",
                          },
                        ],
                      },
                    },
                  ],
                },
              }),
            text: () => Promise.resolve(""),
          } as Response);
        }
        // Mock RentCast API - return 404 to simulate not found
        if (url.includes("api.rentcast.io")) {
          return Promise.resolve({
            ok: false,
            status: 404,
            text: () => Promise.resolve("Not found"),
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Error"),
          json: () => Promise.resolve({}),
        } as Response);
      });

      const result = await enrichPropertyData(
        "123 Test St",
        "San Francisco",
        "CA",
        "94102"
      );

      expect(result).toBeDefined();
      expect(result.sources).toBeInstanceOf(Array);
    });

    it("should handle missing address gracefully", async () => {
      // Mock fetch to return empty responses
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
        json: () => Promise.resolve({}),
      } as Response);
      
      const result = await enrichPropertyData("", "San Francisco", "CA", "94102");
      expect(result).toBeDefined();
      expect(result.sources).toBeInstanceOf(Array);
    });
  });

  describe("mapToHomeSchema", () => {
    it("should map enriched data to home schema format", () => {
      const enriched = {
        yearBuilt: 1980,
        squareFootage: 2000,
        lotSize: 0.25,
        propertyType: "Single Family",
        sources: ["rentcast"],
      };

      const result = mapToHomeSchema(enriched);

      expect(result.yearBuilt).toBe(1980);
      expect(result.squareFootage).toBe(2000);
      expect(result.lotSize).toBe(0.25);
      expect(result.homeType).toBe("single-family");
    });

    it("should handle missing data gracefully", () => {
      const enriched = {
        sources: [],
      };

      const result = mapToHomeSchema(enriched);

      expect(result).toBeDefined();
      expect(result.yearBuilt).toBeUndefined();
    });

    it("should map property types correctly", () => {
      const testCases = [
        { input: "Single Family", expected: "single-family" },
        { input: "Townhouse", expected: "townhouse" },
        { input: "Condo", expected: "condo" },
        { input: "Apartment", expected: "apartment" },
        { input: "Mobile Home", expected: "mobile-home" },
        { input: "Unknown", expected: "other" },
        { input: "House", expected: "single-family" }, // Test "house" mapping
        { input: "Single House", expected: "single-family" },
        { input: "Town House", expected: "townhouse" }, // Test "town house" variant
        { input: "Condominium", expected: "condo" }, // Test "condominium" variant
      ];

      testCases.forEach(({ input, expected }) => {
        const enriched = {
          propertyType: input,
          sources: [],
        };
        const result = mapToHomeSchema(enriched);
        expect(result.homeType).toBe(expected);
      });
    });

    it("should handle undefined property type", () => {
      const enriched = {
        sources: [],
      };
      const result = mapToHomeSchema(enriched);
      expect(result.homeType).toBeUndefined();
    });

    it("should handle null property type", () => {
      const enriched = {
        propertyType: null as any,
        sources: [],
      };
      const result = mapToHomeSchema(enriched);
      expect(result.homeType).toBeUndefined();
    });
  });

  describe("enrichPropertyData - API key handling", () => {
    it("should handle missing RentCast API key", async () => {
      const originalKey = process.env.RENTCAST_API_KEY;
      delete process.env.RENTCAST_API_KEY;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
        json: () => Promise.resolve({}),
      } as Response);

      const result = await enrichPropertyData(
        "123 Test St",
        "San Francisco",
        "CA",
        "94102"
      );

      expect(result).toBeDefined();
      expect(result.sources).toBeInstanceOf(Array);

      if (originalKey) {
        process.env.RENTCAST_API_KEY = originalKey;
      }
    });

    it("should handle missing USPS API key", async () => {
      const originalKey = process.env.USPS_API_KEY;
      delete process.env.USPS_API_KEY;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
        json: () => Promise.resolve({}),
      } as Response);

      const result = await enrichPropertyData(
        "123 Test St",
        "San Francisco",
        "CA",
        "94102"
      );

      expect(result).toBeDefined();
      if (originalKey) {
        process.env.USPS_API_KEY = originalKey;
      }
    });
  });
});

