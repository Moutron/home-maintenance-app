/**
 * Tests for DIY Projects Materials by ID API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/diy-projects/[id]/materials/[materialId]/route";
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

describe("DIY Projects Materials by ID API", () => {
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

  describe("PATCH /api/diy-projects/[id]/materials/[materialId]", () => {
    it("should update material purchased status", async () => {
      const mockProject = {
        id: "project_123",
        userId: testData.user.id,
      };

      const mockMaterial = {
        id: "material_123",
        projectId: "project_123",
        purchased: false,
      };

      const updatedMaterial = {
        ...mockMaterial,
        purchased: true,
        purchasedAt: new Date(),
      };

      mockPrisma.diyProject.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectMaterial.findFirst.mockResolvedValue(mockMaterial);
      mockPrisma.projectMaterial.update.mockResolvedValue(updatedMaterial);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/materials/material_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            purchased: true,
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        purchased: true,
      });

      const params = Promise.resolve({ id: "project_123", materialId: "material_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.material).toBeDefined();
      expect(data.material.purchased).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/materials/material_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            purchased: true,
          }),
        }
      );

      const params = Promise.resolve({ id: "project_123", materialId: "material_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when project not found", async () => {
      mockPrisma.diyProject.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/nonexistent/materials/material_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            purchased: true,
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        purchased: true,
      });

      const params = Promise.resolve({ id: "nonexistent", materialId: "material_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Project not found or access denied");
    });

    it("should return 404 when material not found", async () => {
      const mockProject = {
        id: "project_123",
        userId: testData.user.id,
      };

      mockPrisma.diyProject.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectMaterial.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/materials/nonexistent",
        {
          method: "PATCH",
          body: JSON.stringify({
            purchased: true,
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        purchased: true,
      });

      const params = Promise.resolve({ id: "project_123", materialId: "nonexistent" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Material not found");
    });

    it("should return 400 when validation fails", async () => {
      const mockProject = {
        id: "project_123",
        userId: testData.user.id,
      };

      const mockMaterial = {
        id: "material_123",
        projectId: "project_123",
      };

      mockPrisma.diyProject.findFirst.mockResolvedValue(mockProject);
      mockPrisma.projectMaterial.findFirst.mockResolvedValue(mockMaterial);

      const request = new NextRequest(
        "http://localhost:3000/api/diy-projects/project_123/materials/material_123",
        {
          method: "PATCH",
          body: JSON.stringify({
            purchased: "not a boolean",
          }),
        }
      );

      vi.spyOn(request, "json").mockResolvedValue({
        purchased: "not a boolean",
      });

      const params = Promise.resolve({ id: "project_123", materialId: "material_123" });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
    });
  });
});
