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

// Mock OpenAI - use vi.hoisted to ensure mock is available before module import
// Note: systems/analyze-photo creates the client at module level,
// so we need to hoist the mock properly
const { mockOpenAICreate } = vi.hoisted(() => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            systemType: "HVAC",
            brand: "Carrier",
            model: "Infinity 19VS",
            estimatedAge: 5,
            condition: "good",
            material: null,
            capacity: "3 ton",
            additionalDetails: "Serial number: 123456",
          }),
        },
      },
    ],
  });
  return { mockOpenAICreate: mockCreate };
});

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
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
    // Reset OpenAI mock to success state
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              systemType: "HVAC",
              brand: "Carrier",
              model: "Infinity 19VS",
              estimatedAge: 5,
              condition: "good",
              material: null,
              capacity: "3 ton",
              additionalDetails: "Serial number: 123456",
            }),
          },
        },
      ],
    });
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

    it("should handle OpenAI API errors", async () => {
      // Make the mock throw an error for this test
      mockOpenAICreate.mockRejectedValueOnce(new Error("OpenAI API error"));

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
      
      // Reset mock for other tests
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                systemType: "HVAC",
                brand: "Carrier",
                model: "Infinity 19VS",
                estimatedAge: 5,
                condition: "good",
                material: null,
                capacity: "3 ton",
                additionalDetails: "Serial number: 123456",
              }),
            },
          },
        ],
      });
    });
  });
});
