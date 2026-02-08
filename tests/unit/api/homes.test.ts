/**
 * Tests for Homes API Routes
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/homes/route";
import { GET as GET_HOME } from "@/app/api/homes/[id]/route";
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

describe("Homes API", () => {
  let mockPrisma: any;
  
  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    mockPrisma = prismaModule.prisma;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
  });

  describe("GET /api/homes", () => {
    it("should return homes for authenticated user", async () => {
      // Mock user lookup/creation
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.home.findMany.mockResolvedValue([testData.home]);

      const request = new NextRequest("http://localhost:3000/api/homes");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.homes).toBeInstanceOf(Array);
      expect(data.homes).toHaveLength(1);
      expect(mockPrisma.home.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testData.user.id },
          include: { systems: true },
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/homes");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when user email not found", async () => {
      vi.mocked(currentUser).mockResolvedValue({
        emailAddresses: [],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/homes");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User email not found");
    });

    it("should return empty array when user has no homes", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.home.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/homes");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.homes).toEqual([]);
    });

    it("should handle database errors", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.home.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/homes");
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch homes");
    });
  });

  describe("POST /api/homes", () => {
  const validHomeData = {
    address: "123 Test St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    yearBuilt: 1980,
    squareFootage: 2000,
    lotSize: 0.25,
    homeType: "single-family",
    systems: [], // Required by schema
  };

    it("should create a new home with valid data", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.user.create.mockResolvedValue(testData.user);
      mockPrisma.home.findMany.mockResolvedValue([]);
      mockPrisma.home.create.mockResolvedValue({
        ...testData.home,
        ...validHomeData,
      });

      const request = new NextRequest("http://localhost:3000/api/homes", {
        method: "POST",
        body: JSON.stringify(validHomeData),
      });

      // Mock the json() method
      vi.spyOn(request, "json").mockResolvedValue(validHomeData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.home).toBeDefined();
      expect(data.home.address).toBe(validHomeData.address);
      expect(mockPrisma.home.create).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/homes", {
        method: "POST",
        body: JSON.stringify(validHomeData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when request body is invalid", async () => {
      const invalidData = {
        address: "", // Invalid: empty address
        city: "San Francisco",
        state: "CA",
        zipCode: "94102",
      };

      const request = new NextRequest("http://localhost:3000/api/homes", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      vi.spyOn(request, "json").mockResolvedValue(invalidData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should return 400 when state is invalid format", async () => {
      const invalidData = {
        ...validHomeData,
        state: "1", // Invalid: normalizes to empty string (non-letters stripped)
      };

      const request = new NextRequest("http://localhost:3000/api/homes", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      vi.spyOn(request, "json").mockResolvedValue(invalidData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 400 when zipCode is invalid format", async () => {
      const invalidData = {
        ...validHomeData,
        zipCode: "", // Invalid: required, min length 1
      };

      const request = new NextRequest("http://localhost:3000/api/homes", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      vi.spyOn(request, "json").mockResolvedValue(invalidData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should handle database errors during creation", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      // Mock user.create to return user (needed for getOrCreateUser)
      mockPrisma.user.create.mockResolvedValue(testData.user);
      // Mock home.create to fail after validation passes
      mockPrisma.home.create.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/homes", {
        method: "POST",
        body: JSON.stringify(validHomeData),
      });

      vi.spyOn(request, "json").mockResolvedValue(validHomeData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("GET /api/homes/[id]", () => {
    it("should return home details for authenticated user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.user.create.mockResolvedValue(testData.user);
      mockPrisma.home.findFirst.mockResolvedValue({
        ...testData.home,
        systems: [],
        appliances: [],
        exteriorFeatures: [],
        interiorFeatures: [],
      });

      const request = new NextRequest(`http://localhost:3000/api/homes/${testData.home.id}`);
      const params = Promise.resolve({ id: testData.home.id });
      const response = await GET_HOME(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.home).toBeDefined();
      expect(data.home.id).toBe(testData.home.id);
      expect(mockPrisma.home.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: testData.home.id,
            userId: testData.user.id,
          },
          include: {
            systems: true,
            appliances: true,
            exteriorFeatures: true,
            interiorFeatures: true,
          },
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const request = new NextRequest(`http://localhost:3000/api/homes/${testData.home.id}`);
      const params = Promise.resolve({ id: testData.home.id });
      const response = await GET_HOME(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when home not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.user.create.mockResolvedValue(testData.user);
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/homes/nonexistent");
      const params = Promise.resolve({ id: "nonexistent" });
      const response = await GET_HOME(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Home not found");
    });

    it("should return 404 when home belongs to different user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.user.create.mockResolvedValue(testData.user);
      // Home exists but belongs to different user, so findFirst returns null
      mockPrisma.home.findFirst.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/homes/${testData.home.id}`);
      const params = Promise.resolve({ id: testData.home.id });
      const response = await GET_HOME(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Home not found");
    });

    it("should handle database errors", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ 
        id: testData.user.id, 
        clerkId: testData.user.clerkId, 
        email: testData.user.email 
      });
      mockPrisma.user.create.mockResolvedValue(testData.user);
      mockPrisma.home.findFirst.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(`http://localhost:3000/api/homes/${testData.home.id}`);
      const params = Promise.resolve({ id: testData.home.id });
      const response = await GET_HOME(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch home");
    });
  });
});
