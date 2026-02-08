/**
 * Tests for Task Templates API
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/tasks/templates/route";
import { mockClerkAuth, createMockPrisma } from "../../utils/test-helpers";
import { auth, currentUser } from "@clerk/nextjs/server";

// Mock Prisma
vi.mock("@/lib/prisma", async () => {
  const { createMockPrisma } = await import("../../utils/test-helpers");
  return {
    prisma: createMockPrisma(),
  };
});

// Mock Clerk
vi.mock("@clerk/nextjs/server");

describe("Task Templates API", () => {
  let mockPrisma: any;
  
  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
    // Setup default user mock for all tests
    mockPrisma.user.findUnique.mockResolvedValue({ 
      id: "user_test123", 
      clerkId: "user_test123", 
      email: "test@example.com" 
    });
  });

  describe("GET /api/tasks/templates", () => {
    it("should return system and user templates", async () => {
      const systemTemplate = {
        id: "template1",
        name: "System Template",
        userId: null,
        category: "HVAC",
      };
      const userTemplate = {
        id: "template2",
        name: "User Template",
        userId: "user_test123",
        category: "PLUMBING",
      };

      mockPrisma.taskTemplate.findMany.mockResolvedValue([
        systemTemplate,
        userTemplate,
      ]);

      const request = new NextRequest("http://localhost:3000/api/tasks/templates");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toBeInstanceOf(Array);
      expect(data.templates.length).toBe(2);
      expect(mockPrisma.taskTemplate.findMany).toHaveBeenCalled();
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/templates");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/tasks/templates", () => {
    it("should create a custom template", async () => {
      const newTemplate = {
        id: "template_new",
        name: "Custom Template",
        description: "Custom Description",
        category: "HVAC",
        baseFrequency: "MONTHLY",
        userId: "user_test123",
      };

      mockPrisma.taskTemplate.create.mockResolvedValue(newTemplate);

      const request = new NextRequest("http://localhost:3000/api/tasks/templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Custom Template",
          description: "Custom Description",
          category: "HVAC",
          baseFrequency: "MONTHLY",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.template).toBeDefined();
      expect(data.template.userId).toBe("user_test123");
      expect(mockPrisma.taskTemplate.create).toHaveBeenCalled();
    });

    it("should return 400 for invalid template data", async () => {
      const request = new NextRequest("http://localhost:3000/api/tasks/templates", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          name: "Template",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/tasks/templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Template",
          description: "Description",
          category: "HVAC",
          baseFrequency: "MONTHLY",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});

