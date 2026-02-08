/**
 * Tests for DIY Projects Steps by ID API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/diy-projects/[id]/steps/[stepId]/route";
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

describe("DIY Projects Steps by ID API", () => {
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
      email: testData.user.email,
    });
    mockPrisma.user.create.mockResolvedValue(testData.user);
  });

  describe("PATCH /api/diy-projects/[id]/steps/[stepId]", () => {
    it("should update step status", async () => {
      const mockProject = {
        id: "project_123",
        userId: testData.user.id,
      };

      const mockStep = {
        id: "step_123",
        projectId: "project_123",
        status: "not_started",
      };

      const updatedStep = {
        ...mockStep,
        status: "completed",
        completedAt: new Date(),
      };

      mockPrisma.diyProject.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectStep.findFirst.mockResolvedValue(mockStep);
      mockPrisma.projectStep.findMany.mockResolvedValue([mockStep]);
      mockPrisma.projectStep.update.mockResolvedValue(updatedStep);
      mockPrisma.diyProject.update.mockResolvedValue(mockProject);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/steps/step_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        status: "completed",
      });

      const params = Promise.resolve({ id: "project_123", stepId: "step_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.step).toBeDefined();
      expect(data.step.status).toBe("completed");
    });

    it("should update step actual hours and project total", async () => {
      const mockProject = {
        id: "project_123",
        userId: testData.user.id,
        actualHours: 0,
      };

      const mockStep = {
        id: "step_123",
        projectId: "project_123",
        actualHours: 0,
      };

      const updatedStep = {
        ...mockStep,
        actualHours: 5,
      };

      mockPrisma.diyProject.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectStep.findFirst.mockResolvedValue(mockStep);
      mockPrisma.projectStep.findMany.mockResolvedValue([updatedStep]);
      mockPrisma.projectStep.update.mockResolvedValue(updatedStep);
      mockPrisma.diyProject.update.mockResolvedValue({
        ...mockProject,
        actualHours: 5,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/steps/step_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            actualHours: 5,
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        actualHours: 5,
      });

      const params = Promise.resolve({ id: "project_123", stepId: "step_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.step.actualHours).toBe(5);
      expect(mockPrisma.diyProject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { actualHours: 5 },
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/steps/step_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      const params = Promise.resolve({ id: "project_123", stepId: "step_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when project not found", async () => {
      mockPrisma.diyProject.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/nonexistent/steps/step_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        status: "completed",
      });

      const params = Promise.resolve({ id: "nonexistent", stepId: "step_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Project not found or access denied");
    });

    it("should return 404 when step not found", async () => {
      const mockProject = {
        id: "project_123",
        userId: testData.user.id,
      };

      mockPrisma.diyProject.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectStep.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/steps/nonexistent",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        status: "completed",
      });

      const params = Promise.resolve({ id: "project_123", stepId: "nonexistent" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Step not found");
    });

    it("should return 400 when validation fails", async () => {
      const mockProject = {
        id: "project_123",
        userId: testData.user.id,
      };

      const mockStep = {
        id: "step_123",
        projectId: "project_123",
      };

      mockPrisma.diyProject.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectStep.findFirst.mockResolvedValue(mockStep);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/steps/step_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "invalid_status",
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        status: "invalid_status",
      });

      const params = Promise.resolve({ id: "project_123", stepId: "step_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
    });
  });
});
