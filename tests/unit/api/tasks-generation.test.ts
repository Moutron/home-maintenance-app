/**
 * Tests for Task Generation API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as POST_GENERATE } from "@/app/api/tasks/generate/route";
import { POST as POST_GENERATE_AI } from "@/app/api/tasks/generate-ai/route";
import { POST as POST_GENERATE_COMPLIANCE } from "@/app/api/tasks/generate-compliance/route";
import { GET as GET_TEMPLATES } from "@/app/api/tasks/templates/route";
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

// Mock OpenAI
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    name: "AI Generated Task",
                    description: "Task description",
                    category: "HVAC",
                    frequency: "MONTHLY",
                  },
                ]),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe("Task Generation API", () => {
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

  describe("POST /api/tasks/generate", () => {
    const validRequest = {
      homeId: testData.home.id,
    };

    it("should generate tasks for a home", async () => {
      mockPrisma.home.findFirst.mockResolvedValue({
        ...testData.home,
        systems: [],
      });
      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        {
          id: "template1",
          name: "Template 1",
          category: "HVAC",
          baseFrequency: "MONTHLY",
          isActive: true,
        },
      ]);
      mockPrisma.maintenanceTask.create.mockResolvedValue({
        id: "task1",
        homeId: testData.home.id,
        name: "Template 1",
        category: "HVAC",
        frequency: "MONTHLY",
        nextDueDate: new Date(),
        completed: false,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/generate", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_GENERATE(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBeDefined();
      expect(mockPrisma.home.findFirst).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/generate", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_GENERATE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when homeId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/tasks/generate", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST_GENERATE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("homeId");
    });

    it("should return 404 when home not found", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/tasks/generate", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_GENERATE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Home not found");
    });
  });

  describe("POST /api/tasks/generate-ai", () => {
    const validRequest = {
      homeId: testData.home.id,
    };

    it("should generate AI tasks for a home", async () => {
      mockPrisma.home.findFirst.mockResolvedValue({
        ...testData.home,
        systems: [],
        appliances: [],
        exteriorFeatures: [],
        interiorFeatures: [],
      });
      mockPrisma.maintenanceTask.create.mockResolvedValue({
        id: "task1",
        homeId: testData.home.id,
        name: "AI Generated Task",
        category: "HVAC",
        frequency: "MONTHLY",
        nextDueDate: new Date(),
        completed: false,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/generate-ai", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_GENERATE_AI(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tasks).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/generate-ai", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_GENERATE_AI(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when homeId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/tasks/generate-ai", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST_GENERATE_AI(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("homeId");
    });
  });

  describe("POST /api/tasks/generate-compliance", () => {
    const validRequest = {
      homeId: testData.home.id,
    };

    it("should generate compliance tasks for a home", async () => {
      mockPrisma.home.findFirst.mockResolvedValue({
        ...testData.home,
        systems: [],
      });
      mockPrisma.maintenanceTask.findMany.mockResolvedValue([]);
      mockPrisma.maintenanceTask.create.mockResolvedValue({
        id: "task1",
        homeId: testData.home.id,
        name: "Smoke Detector Requirements",
        category: "SAFETY",
        frequency: "AS_NEEDED",
        nextDueDate: new Date(),
        completed: false,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/generate-compliance", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_GENERATE_COMPLIANCE(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tasks).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/generate-compliance", {
        method: "POST",
        body: JSON.stringify(validRequest),
      });

      vi.spyOn(request, "json").mockResolvedValue(validRequest);

      const response = await POST_GENERATE_COMPLIANCE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when homeId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/tasks/generate-compliance", {
        method: "POST",
        body: JSON.stringify({}),
      });

      vi.spyOn(request, "json").mockResolvedValue({});

      const response = await POST_GENERATE_COMPLIANCE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("homeId");
    });
  });

  describe("GET /api/tasks/templates", () => {
    it("should return task templates", async () => {
      const templates = [
        {
          id: "template1",
          name: "Template 1",
          description: "Description 1",
          category: "HVAC",
          baseFrequency: "MONTHLY",
          isActive: true,
        },
        {
          id: "template2",
          name: "Template 2",
          description: "Description 2",
          category: "PLUMBING",
          baseFrequency: "QUARTERLY",
          isActive: true,
        },
      ];

      mockPrisma.taskTemplate.findMany.mockResolvedValue(templates);

      const request = new NextRequest("http://localhost:3000/api/tasks/templates");
      const response = await GET_TEMPLATES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toBeDefined();
      expect(Array.isArray(data.templates)).toBe(true);
      // Route uses where: { OR: [ { userId: null }, { userId: user.id } ], isActive: true }, orderBy: [...]
      expect(mockPrisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          orderBy: expect.any(Array),
        })
      );
    });

    it("should return templates for request with query params", async () => {
      const templates = [
        {
          id: "template1",
          name: "Template 1",
          category: "HVAC",
          baseFrequency: "MONTHLY",
          isActive: true,
        },
      ];

      mockPrisma.taskTemplate.findMany.mockResolvedValue(templates);

      const request = new NextRequest("http://localhost:3000/api/tasks/templates?category=HVAC");
      const response = await GET_TEMPLATES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toBeDefined();
      expect(Array.isArray(data.templates)).toBe(true);
      // Route does not filter by category from query; it uses OR + isActive + orderBy
      expect(mockPrisma.taskTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          orderBy: expect.any(Array),
        })
      );
    });

    it("should return empty array when no templates found", async () => {
      mockPrisma.taskTemplate.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/tasks/templates");
      const response = await GET_TEMPLATES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toEqual([]);
    });

    it("should handle database errors", async () => {
      mockPrisma.taskTemplate.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/tasks/templates");
      const response = await GET_TEMPLATES(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
