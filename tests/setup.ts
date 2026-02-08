/**
 * Test Setup File
 * This file runs before all tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom";

// jsdom doesn't implement pointer capture; Radix Select (and other components) need it
if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
}
// Radix Select content calls scrollIntoView on listbox items; jsdom may not define it
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function () {};
}

// jsdom doesn't implement URL.createObjectURL/revokeObjectURL; photo-upload components use them for previews
if (typeof URL !== "undefined") {
  if (typeof (URL as any).createObjectURL !== "function") {
    (URL as any).createObjectURL = vi.fn(() => "blob:mock-url");
  }
  if (typeof (URL as any).revokeObjectURL !== "function") {
    (URL as any).revokeObjectURL = vi.fn();
  }
}

// jsdom doesn't implement FileReader; system-photo-upload and others use it for preview/base64
if (typeof globalThis !== "undefined" && typeof (globalThis as any).FileReader !== "function") {
  (globalThis as any).FileReader = class FileReader {
    result: string | ArrayBuffer | null = null;
    onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
    onloadend: ((e: ProgressEvent<FileReader>) => void) | null = null;
    onerror: ((e: ProgressEvent<FileReader>) => void) | null = null;
    readAsDataURL(blob: Blob) {
      setTimeout(() => {
        this.result = "data:image/jpeg;base64,fake";
        if (this.onloadend) this.onloadend({ target: this } as ProgressEvent<FileReader>);
        if (this.onload) this.onload({ target: this } as ProgressEvent<FileReader>);
      }, 0);
    }
  };
}
// import { setupServer } from "msw/node"; // Commented out until installed
// import { handlers } from "./utils/msw/handlers"; // Commented out until installed

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_mock";
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "sk_test_mock";
process.env.RENTCAST_API_KEY = process.env.RENTCAST_API_KEY || "test_key";
process.env.CENSUS_API_KEY = process.env.CENSUS_API_KEY || "test_key";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-test-mock-key";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Setup MSW server for API mocking
// Commented out until msw is installed
// const server = setupServer(...handlers);

beforeAll(() => {
  // Setup MSW server
  // server.listen({ onUnhandledRequest: "bypass" });
  // Setup before all tests
  console.log("Test setup complete");
});

afterAll(() => {
  // Cleanup MSW server
  // server.close();
  // Cleanup after all tests
  console.log("Test cleanup complete");
});

beforeEach(() => {
  // Reset MSW handlers before each test
  // Setup before each test
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllMocks();
  // server.resetHandlers();
});

