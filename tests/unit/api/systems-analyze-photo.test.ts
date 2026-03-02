/**
 * Tests for Systems Analyze Photo API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/systems/analyze-photo/route";
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

// Mock Claude (Anthropic) - vi.hoisted so mock is available when vi.mock runs
const { mockCreateCompletionWithImage } = vi.hoisted(() => {
  const fn = vi.fn().mockResolvedValue(
    JSON.stringify({
      systemType: "HVAC",
      brand: "Carrier",
      model: "Infinity 19VS",
      estimatedAge: 5,
      condition: "good",
      material: null,
      capacity: "3 ton",
      additionalDetails: "Serial number: 123456",
    })
  );
  return { mockCreateCompletionWithImage: fn };
});

vi.mock("@/lib/ai/claude", () => ({
  createCompletion: vi.fn(),
  createCompletionWithImage: mockCreateCompletionWithImage,
  isAiConfigured: vi.fn().mockReturnValue(true),
}));

describe("Systems Analyze Photo API", () => {
  let mockPrisma: any;

  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
    mockCreateCompletionWithImage.mockResolvedValue(
      JSON.stringify({
        systemType: "HVAC",
        brand: "Carrier",
        model: "Infinity 19VS",
        estimatedAge: 5,
        condition: "good",
        material: null,
        capacity: "3 ton",
        additionalDetails: "Serial number: 123456",
      })
    );
  });

  describe("POST /api/systems/analyze-photo", () => {
    it("should analyze system photo and return analysis", async () => {
      const request = new NextRequest("http://localhost:3000/api/systems/analyze-photo", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: "base64encodedimage",
          systemTypeHint: "HVAC",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        imageBase64: "base64encodedimage",
        systemTypeHint: "HVAC",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.systemType).toBe("HVAC");
      expect(data.analysis.brand).toBe("Carrier");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/systems/analyze-photo", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: "base64encodedimage",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        imageBase64: "base64encodedimage",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when image is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/systems/analyze-photo", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Image is required");
    });

    it("should handle Claude API errors", async () => {
      mockCreateCompletionWithImage.mockRejectedValueOnce(new Error("Claude API error"));

      const request = new NextRequest("http://localhost:3000/api/systems/analyze-photo", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: "base64encodedimage",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        imageBase64: "base64encodedimage",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to analyze photo");
      
      mockCreateCompletionWithImage.mockResolvedValue(
        JSON.stringify({
          systemType: "HVAC",
          brand: "Carrier",
          model: "Infinity 19VS",
          estimatedAge: 5,
          condition: "good",
          material: null,
          capacity: "3 ton",
          additionalDetails: "Serial number: 123456",
        })
      );
    });
  });
});
