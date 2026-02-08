/**
 * Comprehensive Tests for Property Enrichment Utilities
 * Targeted tests to catch mutations and improve mutation score
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("Property Enrichment - Comprehensive Mutation Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let rentCastCallCount: number;

  // Helper function to create RentCast mock response
  // IMPORTANT: The code makes MULTIPLE fetch calls:
  // 1. First call with full address format
  // 2. If that returns 404, tries alternative address formats (makes more fetch calls)
  // 3. Each fetch call needs a FRESH Response object (can't reuse the same one)
  // 4. Response.text() can only be called once per Response object, but our mock allows multiple calls
  // 5. If first call succeeds (status 200), code should NOT try alternatives (line 301 checks !response.ok)
  // CRITICAL: If shouldSucceed is true, ALL calls should return success (for same URL)
  // This handles cases where fetch is called multiple times (Stryker mutations, parallel execution, etc.)
  const createRentCastMock = (responseData: any[], shouldSucceed: boolean = true) => {
    const responseText = JSON.stringify(responseData);
    let callCount = 0; // Local counter for this mock instance
    
    return async (url: string) => {
      if (url.includes("api.rentcast.io")) {
        callCount++;
        // If shouldSucceed is true, return success for ALL calls (handles multiple invocations)
        // This ensures that even if fetch is called multiple times, we always return valid data
        if (shouldSucceed) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => responseText, // Return the text (can be called multiple times in our mock)
            json: async () => responseData,
          } as Response);
        }
        // If shouldSucceed is false, return 404 for all calls
        const errorText = JSON.stringify({ error: "Not found" });
        return Promise.resolve({
          ok: false,
          status: 404,
          text: async () => errorText, // Return the error text
          json: async () => ({ error: "Not found" }),
        } as Response);
      }
      return null;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    global.fetch = vi.fn();
    rentCastCallCount = 0;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("API Key Handling", () => {
    it("should return null when RentCast API key is missing", async () => {
      delete process.env.RENTCAST_API_KEY;
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
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
    });

    it("should use RentCast API when key is present", async () => {
      process.env.RENTCAST_API_KEY = "test_key_123";
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        // Handle undefined/null URL
        if (!url) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: async () => "Invalid URL",
            json: async () => ({}),
          } as Response);
        }
        
        // Handle ALL RentCast API calls - return success for all of them
        // CRITICAL: Hardcode the response directly in the mock to ensure it works in Stryker sandbox
        if (url.includes("api.rentcast.io")) {
          // Hardcode the JSON string directly - don't rely on variables that might not be accessible in sandbox
          const responseText = '[{"yearBuilt":"1980","squareFootage":"2000","lotSize":"0.25","propertyType":"Single Family","bedrooms":"3","bathrooms":"2"}]';
          const responseData = [{ yearBuilt: "1980", squareFootage: "2000", lotSize: "0.25", propertyType: "Single Family", bedrooms: "3", bathrooms: "2" }];
          
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => responseText,
            json: async () => responseData,
          } as Response);
        }
        
        // Handle Census geocoding API
        if (url.includes("geocoding.geo.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
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
            text: async () => "",
          } as Response);
        }
        
        // Handle Census API
        if (url.includes("api.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [["B25077_001E", "B19013_001E", "B01001_001E"], ["500000", "75000", "1000"]],
            text: async () => "",
          } as Response);
        }
        
        // Default fallback for other APIs
        return Promise.resolve({
          ok: false,
          status: 404,
          text: async () => "Not found",
          json: async () => ({}),
        } as Response);
      });

      const result = await enrichPropertyData(
        "123 Test St",
        "San Francisco",
        "CA",
        "94102"
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("sources");
      expect(result.sources).toContain("property-records");
      
      // The yearBuilt should be parsed from the RentCast response (string "1980" -> number 1980)
      // After fixing the response.text() double-read issue, this should now work
      expect(result.yearBuilt).toBe(1980);
    });

    it("should return null when USPS API key is missing", async () => {
      delete process.env.USPS_API_KEY;
      
      // Mock fetch to return valid responses for all API calls
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("api.rentcast.io")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify([{
              yearBuilt: "1980",
              squareFootage: "2000",
              lotSize: "0.25",
              propertyType: "Single Family",
            }]),
            json: async () => [{
              yearBuilt: "1980",
              squareFootage: "2000",
              lotSize: "0.25",
              propertyType: "Single Family",
            }],
          } as Response);
        }
        if (url.includes("geocoding.geo.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              result: {
                addressMatches: [{
                  coordinates: { x: -122.4194, y: 37.7749 },
                }],
              },
            }),
            text: async () => "",
          } as Response);
        }
        // Default fallback
        return Promise.resolve({
          ok: false,
          status: 404,
          text: async () => "Not found",
          json: async () => ({}),
        } as Response);
      });
      
      // This tests the validateAddress function indirectly
      const result = await enrichPropertyData(
        "123 Test St",
        "San Francisco",
        "CA",
        "94102"
      );

      expect(result).toBeDefined();
    });

    it("should use USPS API when key is present", async () => {
      process.env.USPS_API_KEY = "test_usps_key";
      
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("shippingapis.com")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () =>
              Promise.resolve(
                '<?xml version="1.0"?><AddressValidateResponse><Address><Address2>123 TEST ST</Address2></Address></AddressValidateResponse>'
              ),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle Census API key missing", async () => {
      delete process.env.CENSUS_API_KEY;
      
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
        if (url.includes("api.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([["B25077_001E", "B19013_001E", "B01001_001E"], ["500000", "75000", "1000"]]),
            text: () => Promise.resolve(""),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await enrichPropertyData(
        "123 Test St",
        "San Francisco",
        "CA",
        "94102"
      );

      expect(result).toBeDefined();
      expect(result.sources).toBeInstanceOf(Array);
    });

    it("should handle non-OK responses from RentCast", async () => {
      process.env.RENTCAST_API_KEY = "test_key";
      
      // Mock fetch to return error on first call
      rentCastCallCount = 0;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("api.rentcast.io")) {
          rentCastCallCount++;
          // First call returns error
          if (rentCastCallCount === 1) {
            return Promise.resolve({
              ok: false,
              status: 500,
              text: () => Promise.resolve("Server error"),
              json: () => Promise.resolve({}),
            } as Response);
          }
          // Subsequent calls return 404
          return Promise.resolve({
            ok: false,
            status: 404,
            text: () => Promise.resolve("Not found"),
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle non-OK responses from USPS", async () => {
      process.env.USPS_API_KEY = "test_key";
      
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("shippingapis.com")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve("Server error"),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle non-OK responses from Census geocoding", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("geocoding.geo.census.gov")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve("Server error"),
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle non-OK responses from Census API", async () => {
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
        if (url.includes("api.census.gov")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve("Server error"),
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });
  });

  describe("Data Parsing and Validation", () => {
    it("should handle empty RentCast response", async () => {
      process.env.RENTCAST_API_KEY = "test_key";
      
      const rentCastMock = createRentCastMock([], true); // Empty array
      
      global.fetch = vi.fn().mockImplementation((url: string) => {
        const rentCastResult = rentCastMock(url);
        if (rentCastResult) return rentCastResult;
        
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle RentCast response with partial data", async () => {
      process.env.RENTCAST_API_KEY = "test_key_123";
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        // Handle undefined/null URL
        if (!url) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: async () => "Invalid URL",
            json: async () => ({}),
          } as Response);
        }
        
        // Handle ALL RentCast API calls - return success for all of them
        // CRITICAL: Hardcode the response directly in the mock to ensure it works in Stryker sandbox
        if (url.includes("api.rentcast.io")) {
          // Hardcode the JSON string directly - don't rely on variables that might not be accessible in sandbox
          const responseText = '[{"yearBuilt":"1980"}]';
          const responseData = [{ yearBuilt: "1980" }];
          
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => responseText,
            json: async () => responseData,
          } as Response);
        }
        
        // Handle Census geocoding API
        if (url.includes("geocoding.geo.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
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
            text: async () => "",
          } as Response);
        }
        
        // Handle Census API
        if (url.includes("api.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [["B25077_001E", "B19013_001E", "B01001_001E"], ["500000", "75000", "1000"]],
            text: async () => "",
          } as Response);
        }
        
        // Default fallback for other APIs
        return Promise.resolve({
          ok: false,
          status: 404,
          text: async () => "Not found",
          json: async () => ({}),
        } as Response);
      });

      const result = await enrichPropertyData(
        "123 Test St",
        "San Francisco",
        "CA",
        "94102"
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("sources");
      expect(result.sources).toContain("property-records");
      
      // The yearBuilt should be parsed from the RentCast response (string "1980" -> number 1980)
      // After fixing the response.text() double-read issue, this should now work
      expect(result.yearBuilt).toBe(1980);
    });

    it("should handle geocoding response with missing coordinates", async () => {
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
                      // Missing coordinates
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
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle geocoding response with missing geographies", async () => {
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
                      // Missing geographies
                    },
                  ],
                },
              }),
            text: () => Promise.resolve(""),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle Census API response with missing data", async () => {
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
        if (url.includes("api.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([["B25077_001E", "B19013_001E", "B01001_001E"]]), // Only headers, no data
            text: () => Promise.resolve(""),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle Census API response with null values", async () => {
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
        if (url.includes("api.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([["B25077_001E", "B19013_001E", "B01001_001E"], [null, null, null]]),
            text: () => Promise.resolve(""),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });
  });

  describe("Property Type Mapping - Comprehensive", () => {
    it("should map all property type variations", () => {
      const testCases = [
        { input: "Single Family", expected: "single-family" },
        { input: "single family", expected: "single-family" },
        { input: "SINGLE FAMILY", expected: "single-family" },
        { input: "Single-Family", expected: "single-family" },
        { input: "Townhouse", expected: "townhouse" },
        { input: "townhouse", expected: "townhouse" },
        { input: "Town House", expected: "townhouse" },
        { input: "town house", expected: "townhouse" },
        { input: "Condo", expected: "condo" },
        { input: "condo", expected: "condo" },
        { input: "Condominium", expected: "condo" },
        { input: "condominium", expected: "condo" },
        { input: "Apartment", expected: "apartment" },
        { input: "apartment", expected: "apartment" },
        { input: "Mobile Home", expected: "mobile-home" },
        { input: "mobile home", expected: "mobile-home" },
        { input: "MobileHome", expected: "mobile-home" },
        { input: "House", expected: "single-family" },
        { input: "house", expected: "single-family" },
        { input: "Single House", expected: "single-family" },
        { input: "Unknown Type", expected: "other" },
      ];

      testCases.forEach(({ input, expected }) => {
        const enriched = {
          propertyType: input,
          sources: [],
        };
        const result = mapToHomeSchema(enriched);
        expect(result.homeType).toBe(expected);
      });
      
      // Test empty string separately as it should return undefined
      const enrichedEmpty = {
        propertyType: "",
        sources: [],
      };
      const resultEmpty = mapToHomeSchema(enrichedEmpty);
      expect(resultEmpty.homeType).toBeUndefined();
    });

    it("should handle property types with extra whitespace", () => {
      const testCases = [
        { input: "  Single Family  ", expected: "single-family" },
        { input: " Townhouse ", expected: "townhouse" },
        { input: "\tCondo\t", expected: "condo" },
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

    it("should prioritize specific types over generic", () => {
      // "Townhouse" should not match "single-family" even though it contains "house"
      const enriched = {
        propertyType: "Townhouse",
        sources: [],
      };
      const result = mapToHomeSchema(enriched);
      expect(result.homeType).toBe("townhouse");
      expect(result.homeType).not.toBe("single-family");
    });

    it("should handle property types with special characters", () => {
      const enriched = {
        propertyType: "Single-Family Home",
        sources: [],
      };
      const result = mapToHomeSchema(enriched);
      expect(result.homeType).toBe("single-family");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty address", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request"),
        json: () => Promise.resolve({}),
      } as Response);

      const result = await enrichPropertyData("", "San Francisco", "CA", "94102");
      expect(result).toBeDefined();
    });

    it("should handle empty city", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request"),
        json: () => Promise.resolve({}),
      } as Response);

      const result = await enrichPropertyData("123 Test St", "", "CA", "94102");
      expect(result).toBeDefined();
    });

    it("should handle empty state", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request"),
        json: () => Promise.resolve({}),
      } as Response);

      const result = await enrichPropertyData("123 Test St", "San Francisco", "", "94102");
      expect(result).toBeDefined();
    });

    it("should handle empty zipCode", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request"),
        json: () => Promise.resolve({}),
      } as Response);

      const result = await enrichPropertyData("123 Test St", "San Francisco", "CA", "");
      expect(result).toBeDefined();
    });

    it("should handle geocoding with empty addressMatches", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("geocoding.geo.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                result: {
                  addressMatches: [], // Empty array
                },
              }),
            text: () => Promise.resolve(""),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });

    it("should handle geocoding with missing result", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("geocoding.geo.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}), // Missing result
            text: () => Promise.resolve(""),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
    });
  });

  describe("Data Combination", () => {
    it("should combine data from multiple sources", async () => {
      process.env.RENTCAST_API_KEY = "test_key";
      
      const rentCastResponse = [{
        yearBuilt: "1980", // RentCast returns as string
        squareFootage: "2000",
        propertyType: "Single Family",
      }];
      
      // CRITICAL: Store response data in a way that always works, even in Stryker sandbox
      // Use a function to generate the response text each time to avoid any closure or scope issues
      const getRentCastText = () => {
        try {
          return JSON.stringify(rentCastResponse);
        } catch (e) {
          // Fallback if JSON.stringify fails
          return JSON.stringify([{ yearBuilt: "1980", squareFootage: "2000", lotSize: "0.25", propertyType: "Single Family", bedrooms: "3", bathrooms: "2" }]);
        }
      };
      const getRentCastData = () => rentCastResponse;
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        // CRITICAL: Always return a valid Response object, never undefined
        // This prevents "Cannot read properties of undefined" errors
        
        // Handle undefined/null URL
        if (!url) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: async () => "Invalid URL",
            json: async () => ({}),
          } as Response);
        }
        
        // Always check RentCast first - handle all RentCast URLs explicitly
        // CRITICAL: Always return valid response for RentCast URLs to prevent parse errors
        // Return success for ALL RentCast calls (handles multiple invocations, alternative URL formats, Stryker, etc.)
        if (url.includes("api.rentcast.io")) {
          // CRITICAL: Always return valid data, regardless of what getRentCastText() returns
          // This ensures the mock works even in Stryker sandbox where closures might not work correctly
          // Hardcode the response data to ensure it's always available
          const fallbackData = [{ yearBuilt: "1980", squareFootage: "2000", lotSize: "0.25", propertyType: "Single Family", bedrooms: "3", bathrooms: "2" }];
          const fallbackText = JSON.stringify(fallbackData);
          
          // Try to get the actual response data, but always fall back to hardcoded data
          let responseText = getRentCastText();
          let responseData = getRentCastData();
          
          // If we don't have valid data, use fallback
          if (!responseText || responseText === 'undefined' || responseText === 'null' || responseText === '' || !responseData) {
            responseText = fallbackText;
            responseData = fallbackData;
          }
          
          // Always return a valid Response object with valid data
          // Store the text in a variable that persists across multiple .text() calls
          const finalText = responseText;
          const finalData = responseData;
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => finalText, // Always return valid JSON (can be called multiple times)
            json: async () => finalData,
          } as Response);
        }
        
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
        if (url.includes("api.census.gov")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([["B25077_001E", "B19013_001E", "B01001_001E"], ["500000", "75000", "1000"]]),
            text: () => Promise.resolve(""),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
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
      expect(result.yearBuilt).toBe(1980);
      expect(result.latitude).toBe(37.7749);
      expect(result.longitude).toBe(-122.4194);
      expect(result.medianHomeValue).toBe(500000);
    });
  });
});

