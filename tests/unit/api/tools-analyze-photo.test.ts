/**
 * Tests for Tools Analyze Photo API Route
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/tools/analyze-photo/route";
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

// Mock OpenAI - use a controllable mock
const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({
          name: "Cordless Drill",
          brand: "DeWalt",
          model: "DCD771",
          category: "Power Tools",
          condition: "good",
          description: "20V Max cordless drill",
        }),
      },
    },
  ],
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

describe("Tools Analyze Photo API", () => {
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
              name: "Cordless Drill",
              brand: "DeWalt",
              model: "DCD771",
              category: "Power Tools",
              condition: "good",
              description: "20V Max cordless drill",
            }),
          },
        },
      ],
    });
  });

  describe("POST /api/tools/analyze-photo", () => {
    it("should analyze tool photo and return analysis", async () => {
      // Create mock file
      const mockFile = new File(["fake image data"], "tool.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("image", mockFile);

      const request = new NextRequest("http://localhost:3000/api/tools/analyze-photo", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.name).toBe("Cordless Drill");
      expect(data.analysis.brand).toBe("DeWalt");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const mockFile = new File(["fake image data"], "tool.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("image", mockFile);

      const request = new NextRequest("http://localhost:3000/api/tools/analyze-photo", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no image file provided", async () => {
      const formData = new FormData();

      const request = new NextRequest("http://localhost:3000/api/tools/analyze-photo", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No image file provided");
    });

    it("should handle OpenAI API errors", async () => {
      // Make the mock throw an error for this test
      mockOpenAICreate.mockRejectedValueOnce(new Error("OpenAI API error"));

      const mockFile = new File(["fake image data"], "tool.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("image", mockFile);

      const request = new NextRequest("http://localhost:3000/api/tools/analyze-photo", {
        method: "POST",
        body: formData,
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
                name: "Cordless Drill",
                brand: "DeWalt",
                model: "DCD771",
                category: "Power Tools",
                condition: "good",
                description: "20V Max cordless drill",
              }),
            },
          },
        ],
      });
    });
  });
});
