/**
 * Tests for Upload API Routes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/upload/route";
import { mockClerkAuth } from "../../utils/test-helpers";
import { auth } from "@clerk/nextjs/server";

// Mock Clerk
vi.mock("@clerk/nextjs/server");

// Mock Vercel Blob
vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({
    url: "https://example.com/uploaded-file.jpg",
  }),
}));

describe("Upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth();
  });

  describe("POST /api/upload", () => {
    it("should upload a file", async () => {
      const formData = new FormData();
      const file = new File(["test content"], "test.jpg", { type: "image/jpeg" });
      formData.append("file", file);
      formData.append("type", "photo");

      const request = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const formData = new FormData();
      const file = new File(["test"], "test.jpg");
      formData.append("file", file);

      const request = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no file provided", async () => {
      const formData = new FormData();

      const request = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file provided");
    });

    it("should return 400 when file type is invalid", async () => {
      const formData = new FormData();
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      formData.append("file", file);

      const request = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid file type");
    });

    it("should return 400 when file size exceeds limit", async () => {
      // Create a large file (11MB)
      const largeContent = "x".repeat(11 * 1024 * 1024);
      const formData = new FormData();
      const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
      formData.append("file", file);

      const request = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("exceeds");
    });
  });
});
