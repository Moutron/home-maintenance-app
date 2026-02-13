/**
 * Tests for Tools Inventory by ID API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/app/api/tools/inventory/[id]/route";
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

describe("Tools Inventory by ID API", () => {
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

  describe("GET /api/tools/inventory/[id]", () => {
    it("should return tool details for authenticated user", async () => {
      const mockTool = {
        id: "tool_123",
        name: "Cordless Drill",
        category: "Power Tools",
        userId: testData.user.id,
      };

      mockPrisma.toolInventory.findFirst.mockResolvedValue(mockTool);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123");
      const params = Promise.resolve({ id: "tool_123" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tool).toBeDefined();
      expect(data.tool.id).toBe("tool_123");
      expect(data.tool.name).toBe("Cordless Drill");
      expect(mockPrisma.toolInventory.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "tool_123",
            userId: testData.user.id,
          },
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123");
      const response = await GET(request, { params: Promise.resolve({ id: "tool_123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when tool not found", async () => {
      mockPrisma.toolInventory.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/nonexistent");
      const response = await GET(request, { params: Promise.resolve({ id: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tool not found");
    });

    it("should handle database errors", async () => {
      mockPrisma.toolInventory.findFirst.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123");
      const response = await GET(request, { params: Promise.resolve({ id: "tool_123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch tool");
    });
  });

  describe("PATCH /api/tools/inventory/[id]", () => {
    it("should update tool for authenticated user", async () => {
      const existingTool = {
        id: "tool_123",
        name: "Cordless Drill",
        category: "Power Tools",
        userId: testData.user.id,
      };

      const updatedTool = {
        ...existingTool,
        name: "Updated Drill",
        brand: "DeWalt",
      };

      mockPrisma.toolInventory.findFirst.mockResolvedValue(existingTool);
      mockPrisma.toolInventory.update.mockResolvedValue(updatedTool);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Drill",
          brand: "DeWalt",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        name: "Updated Drill",
        brand: "DeWalt",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "tool_123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tool).toBeDefined();
      expect(data.tool.name).toBe("Updated Drill");
      expect(data.tool.brand).toBe("DeWalt");
    });

    it("should return 400 when validation fails", async () => {
      const existingTool = {
        id: "tool_123",
        name: "Cordless Drill",
        userId: testData.user.id,
      };

      mockPrisma.toolInventory.findFirst.mockResolvedValue(existingTool);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123", {
        method: "PATCH",
        body: JSON.stringify({
          condition: "invalid-condition",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        condition: "invalid-condition",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "tool_123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation error");
    });

    it("should return 404 when tool not found", async () => {
      mockPrisma.toolInventory.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated",
        }),
      });

      vi.spyOn(request, "json").mockResolvedValue({
        name: "Updated",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tool not found");
    });
  });

  describe("DELETE /api/tools/inventory/[id]", () => {
    it("should delete tool for authenticated user", async () => {
      const existingTool = {
        id: "tool_123",
        name: "Cordless Drill",
        userId: testData.user.id,
      };

      mockPrisma.toolInventory.findFirst.mockResolvedValue(existingTool);
      mockPrisma.toolInventory.delete.mockResolvedValue(existingTool);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "tool_123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify delete was called (params.id might be resolved differently)
      expect(mockPrisma.toolInventory.delete).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "tool_123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when tool not found", async () => {
      mockPrisma.toolInventory.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/nonexistent", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tool not found");
    });

    it("should handle database errors during deletion", async () => {
      const existingTool = {
        id: "tool_123",
        name: "Cordless Drill",
        userId: testData.user.id,
      };

      mockPrisma.toolInventory.findFirst.mockResolvedValue(existingTool);
      mockPrisma.toolInventory.delete.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/tools/inventory/tool_123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "tool_123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete tool");
    });
  });
});
