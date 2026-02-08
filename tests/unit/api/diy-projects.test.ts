/**
 * Tests for DIY Projects API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/diy-projects/route";
import { GET as GET_PROJECT } from "@/app/api/diy-projects/[id]/route";
import { POST as POST_MATERIAL } from "@/app/api/diy-projects/[id]/materials/route";
import { POST as POST_TOOL } from "@/app/api/diy-projects/[id]/tools/route";
import { POST as POST_STEP } from "@/app/api/diy-projects/[id]/steps/route";
import { GET as GET_TEMPLATES } from "@/app/api/diy-projects/templates/route";
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
                content: JSON.stringify({
                  name: "AI Generated Project",
                  description: "Project description",
                  category: "HVAC",
                  difficulty: "EASY",
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe("DIY Projects API", () => {
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

  describe("GET /api/diy-projects", () => {
    it("should return projects for authenticated user", async () => {
      mockPrisma.diyProject.findMany.mockResolvedValue([testData.diyProject]);

      const request = new NextRequest("http://localhost:3000/api/diy-projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toBeInstanceOf(Array);
      expect(mockPrisma.diyProject.findMany).toHaveBeenCalled();
    });

    it("should filter projects by homeId", async () => {
      mockPrisma.diyProject.findMany.mockResolvedValue([testData.diyProject]);

      const request = new NextRequest(
        `http://localhost:3000/api/diy-projects?homeId=${testData.home.id}`
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.diyProject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testData.user.id,
            homeId: testData.home.id,
          }),
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/diy-projects");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/diy-projects", () => {
    const validProjectData = {
      name: "Test Project",
      description: "Test Description",
      category: "HVAC" as const,
      difficulty: "EASY" as const,
      homeId: testData.home.id,
      estimatedHours: 10,
      estimatedCost: 500,
    };

    it("should create a new project", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(testData.home);
      mockPrisma.diyProject.create.mockResolvedValue({
        ...testData.diyProject,
        ...validProjectData,
      });

      const request = new NextRequest("http://localhost:3000/api/diy-projects", {
        method: "POST",
        body: JSON.stringify(validProjectData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validProjectData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.project).toBeDefined();
      expect(mockPrisma.diyProject.create).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/diy-projects", {
        method: "POST",
        body: JSON.stringify(validProjectData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when validation fails", async () => {
      const invalidData = {
        name: "", // Invalid: empty name
        category: "HVAC",
        difficulty: "EASY",
        homeId: testData.home.id,
      };

      const request = new NextRequest("http://localhost:3000/api/diy-projects", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      vi.spyOn(request, "json").mockResolvedValue(invalidData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should return 404 when home not found", async () => {
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/diy-projects", {
        method: "POST",
        body: JSON.stringify(validProjectData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validProjectData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Home not found");
    });
  });

  describe("GET /api/diy-projects/[id]", () => {
    it("should return project details", async () => {
      mockPrisma.diyProject.findFirst.mockResolvedValue({
        ...testData.diyProject,
        materials: [],
        tools: [],
        steps: [],
        photos: [],
      });

      const request = new NextRequest(`http://localhost:3000/api/diy-projects/${testData.diyProject.id}`);
      const params = Promise.resolve({ id: testData.diyProject.id });
      const response = await GET_PROJECT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project).toBeDefined();
      expect(data.project.id).toBe(testData.diyProject.id);
    });

    it("should return 404 when project not found", async () => {
      mockPrisma.diyProject.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/diy-projects/nonexistent");
      const params = Promise.resolve({ id: "nonexistent" });
      const response = await GET_PROJECT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Project not found");
    });
  });

  describe("POST /api/diy-projects/[id]/materials", () => {
    const validMaterialData = {
      name: "Test Material",
      quantity: 5,
      unit: "pieces",
      unitPrice: 10,
    };

    it("should add material to project", async () => {
      mockPrisma.diyProject.findFirst.mockResolvedValue(testData.diyProject);
      mockPrisma.projectMaterial.create.mockResolvedValue({
        id: "material1",
        projectId: testData.diyProject.id,
        ...validMaterialData,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/diy-projects/${testData.diyProject.id}/materials`,
        {
          method: "POST",
          body: JSON.stringify(validMaterialData),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue(validMaterialData);
      const params = Promise.resolve({ id: testData.diyProject.id });

      const response = await POST_MATERIAL(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.material).toBeDefined();
    });
  });

  describe("POST /api/diy-projects/[id]/tools", () => {
    const validToolData = {
      name: "Test Tool",
      owned: false,
      rentalCost: 25,
      rentalDays: 2,
    };

    it("should add tool to project", async () => {
      mockPrisma.diyProject.findFirst.mockResolvedValue(testData.diyProject);
      mockPrisma.toolInventory.findMany.mockResolvedValue([]);
      mockPrisma.projectTool.create.mockResolvedValue({
        id: "tool1",
        projectId: testData.diyProject.id,
        ...validToolData,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/diy-projects/${testData.diyProject.id}/tools`,
        {
          method: "POST",
          body: JSON.stringify(validToolData),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue(validToolData);
      const params = Promise.resolve({ id: testData.diyProject.id });

      const response = await POST_TOOL(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tool).toBeDefined();
    });
  });

  describe("POST /api/diy-projects/[id]/steps", () => {
    const validStepData = {
      stepNumber: 1,
      name: "Test Step",
      description: "Step description",
      instructions: "Step instructions",
      estimatedHours: 2,
    };

    it("should add step to project", async () => {
      mockPrisma.diyProject.findFirst.mockResolvedValue(testData.diyProject);
      mockPrisma.projectStep.create.mockResolvedValue({
        id: "step1",
        projectId: testData.diyProject.id,
        ...validStepData,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/diy-projects/${testData.diyProject.id}/steps`,
        {
          method: "POST",
          body: JSON.stringify(validStepData),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue(validStepData);
      const params = Promise.resolve({ id: testData.diyProject.id });

      const response = await POST_STEP(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.step).toBeDefined();
    });
  });

  describe("GET /api/diy-projects/templates", () => {
    it("should return project templates", async () => {
      const templates = [
        {
          id: "template1",
          name: "Template 1",
          category: "HVAC",
          difficulty: "EASY",
          isActive: true,
        },
      ];

      mockPrisma.projectTemplate.findMany.mockResolvedValue(templates);

      const request = new NextRequest("http://localhost:3000/api/diy-projects/templates");
      const response = await GET_TEMPLATES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toBeDefined();
      expect(Array.isArray(data.templates)).toBe(true);
    });

    it("should filter templates by category", async () => {
      mockPrisma.projectTemplate.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/diy-projects/templates?category=HVAC");
      const response = await GET_TEMPLATES(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.projectTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: "HVAC",
          }),
        })
      );
    });
  });
});
