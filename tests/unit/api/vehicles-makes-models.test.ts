/**
 * Tests for Vehicles Makes and Models API (NHTSA proxy)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as GET_MAKES } from "@/app/api/vehicles/makes/route";
import { GET as GET_MODELS } from "@/app/api/vehicles/models/route";

describe("GET /api/vehicles/makes", () => {
  it("should return curated common makes (no external call)", async () => {
    const response = await GET_MAKES();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.makes).toBeInstanceOf(Array);
    expect(data.makes).toContain("Honda");
    expect(data.makes).toContain("Toyota");
    expect(data.makes).toContain("GMC");
    expect(data.makes).toContain("Cadillac");
    expect(data.makes).toContain("BMW");
    expect(data.makes).toContain("Audi");
    expect(data.makes).toContain("Ford");
    expect(data.makes.length).toBeLessThanOrEqual(50);
  });
});

describe("GET /api/vehicles/models", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should return models for a make only (no year)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Results: [
          { Model_Name: "Civic" },
          { Model_Name: "Accord" },
          { Model_Name: "CR-V" },
        ],
      }),
    } as Response);

    const request = new NextRequest("http://localhost:3000/api/vehicles/models?make=Honda");
    const response = await GET_MODELS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toEqual(["Accord", "Civic", "CR-V"]);
    expect(fetch).toHaveBeenCalledWith(
      "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/Honda?format=json",
      expect.any(Object)
    );
  });

  it("should return models for make and year (GetModelsForMakeYear)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Results: [
          { Model_Name: "Civic" },
          { Model_Name: "Accord" },
          { Model_Name: "CR-V" },
        ],
      }),
    } as Response);

    const request = new NextRequest(
      "http://localhost:3000/api/vehicles/models?make=Honda&year=2020"
    );
    const response = await GET_MODELS(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toEqual(["Accord", "Civic", "CR-V"]);
    expect(fetch).toHaveBeenCalledWith(
      "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/honda/modelyear/2020?format=json",
      expect.any(Object)
    );
  });

  it("should return 400 when make is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/vehicles/models");
    const response = await GET_MODELS(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Make is required");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should return 400 when make is empty string", async () => {
    const request = new NextRequest("http://localhost:3000/api/vehicles/models?make=   ");
    const response = await GET_MODELS(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Make is required");
  });

  it("should return 500 when NHTSA fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);

    const request = new NextRequest("http://localhost:3000/api/vehicles/models?make=Honda");
    const response = await GET_MODELS(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to load models");
  });
});
