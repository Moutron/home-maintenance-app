/**
 * Test Helper Utilities
 */

import { vi, expect } from "vitest";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
// React Testing Library imports - only needed for component tests
// import { render, RenderOptions } from "@testing-library/react";
// import { ReactElement } from "react";

/**
 * Mock Clerk authentication for tests
 */
export function mockClerkAuth(userId: string = "user_test123", email: string = "test@example.com") {
  vi.mocked(auth).mockResolvedValue({
    userId,
    sessionId: "session_test123",
  } as any);

  vi.mocked(currentUser).mockResolvedValue({
    id: userId,
    emailAddresses: [{ emailAddress: email }],
  } as any);
}

/**
 * Mock Prisma client for tests
 */
export function createMockPrisma() {
  const result = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    home: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    maintenanceTask: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    taskTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    completedTask: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    appliance: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    exteriorFeature: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    interiorFeature: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    homeSystem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    maintenanceHistory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    budgetPlan: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    budgetAlert: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    diyProject: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    projectMaterial: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    projectTool: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    projectStep: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectPhoto: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    projectTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    toolInventory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    propertyCache: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    zipCodeCache: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    contractor: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    leadRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    contractorReview: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pushSubscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  } as any;
  result.$transaction = vi.fn((arg: ((tx: typeof result) => Promise<unknown>) | Promise<unknown>[]) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(result);
  });
  return result;
}

// Create a singleton mock instance
let mockPrismaInstance: ReturnType<typeof createMockPrisma> | null = null;

export function getMockPrisma() {
  if (!mockPrismaInstance) {
    mockPrismaInstance = createMockPrisma();
  }
  return mockPrismaInstance;
}

/**
 * Create a mock NextRequest
 */
export function createMockRequest(body: any = {}, headers: Record<string, string> = {}) {
  return {
    json: vi.fn().mockResolvedValue(body),
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
    headers: new Headers(headers),
  } as any;
}

/**
 * Create a mock NextResponse
 */
export function createMockResponse() {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as any;
}

/**
 * Test data factories
 */
export const testData = {
  user: {
    id: "user_test123",
    clerkId: "clerk_test123",
    email: "test@example.com",
    subscriptionTier: "FREE" as const,
  },
  home: {
    id: "home_test123",
    userId: "user_test123",
    address: "123 Test St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    yearBuilt: 1980,
    squareFootage: 2000,
    lotSize: 0.25,
    homeType: "single-family",
  },
  task: {
    id: "task_test123",
    homeId: "home_test123",
    name: "Test Task",
    description: "Test Description",
    category: "HVAC" as const,
    frequency: "MONTHLY" as const,
    nextDueDate: new Date("2024-12-31"),
    completed: false,
  },
  budgetPlan: {
    id: "budget_test123",
    userId: "user_test123",
    name: "2024 Home Maintenance Budget",
    period: "MONTHLY" as const,
    amount: 1000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-31"),
    category: null,
    homeId: null,
    isActive: true,
  },
  diyProject: {
    id: "project_test123",
    userId: "user_test123",
    homeId: "home_test123",
    name: "Test Project",
    category: "HVAC" as const,
    status: "IN_PROGRESS" as const,
    difficulty: "EASY" as const,
    budget: 500,
    estimatedCost: 400,
    actualCost: 450,
  },
};

/**
 * API Test Helpers
 */

/**
 * Create an authenticated NextRequest for API testing
 */
export function createAuthenticatedRequest(
  url: string,
  body: any = {},
  method: string = "GET",
  userId: string = "user_test123"
): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Mock auth will be handled by mockClerkAuth
  if (method !== "GET" && Object.keys(body).length > 0) {
    // For POST/PATCH/PUT requests, we'll need to handle body separately
    // as NextRequest doesn't allow direct body setting in constructor
    return Object.assign(request, {
      json: async () => body,
      formData: async () => body,
    }) as NextRequest;
  }

  return request;
}

/**
 * Create a mock API response
 */
export function createMockApiResponse(data: any, status: number = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
  };
}

/**
 * Assert API error response
 */
export async function expectApiError(
  response: Response,
  expectedStatus: number,
  expectedError?: string
) {
  expect(response.status).toBe(expectedStatus);
  if (expectedError) {
    const data = await response.json();
    expect(data.error || data.message).toContain(expectedError);
  }
}

/**
 * Component Test Helpers
 */

/**
 * Render component with providers (for React context)
 * Note: Requires @testing-library/react to be installed
 */
export async function renderWithProviders(
  ui: any, // ReactElement
  options?: any // Omit<RenderOptions, "wrapper">
) {
  // Dynamically import to avoid requiring it for API tests
  const { render } = await import("@testing-library/react");
  // Add any context providers here as needed
  return render(ui, options);
}

/**
 * Wait for API call to complete (for component tests)
 */
export async function waitForApiCall(
  mockFn: ReturnType<typeof vi.fn>,
  timeout: number = 5000
) {
  const startTime = Date.now();
  while (!mockFn.mock.calls.length && Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return mockFn.mock.calls.length > 0;
}

/**
 * Fill form fields helper
 * Note: Requires @testing-library/user-event to be installed
 */
export async function fillForm(
  container: HTMLElement,
  fields: Record<string, string | boolean>
) {
  try {
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    for (const [name, value] of Object.entries(fields)) {
      const input = container.querySelector(`[name="${name}"]`) as HTMLElement;
      if (input) {
        if (typeof value === "boolean") {
          if (input.tagName === "INPUT" && (input as HTMLInputElement).type === "checkbox") {
            if (value) {
              await user.click(input);
            }
          }
        } else {
          await user.clear(input);
          await user.type(input, value);
        }
      }
    }
  } catch (e) {
    throw new Error("@testing-library/user-event not installed. Run: npm install");
  }
}

/**
 * E2E Test Helpers (for Playwright)
 */

/**
 * Login as user in E2E tests
 * Note: This is a placeholder - actual implementation depends on Clerk E2E setup
 */
export async function loginAsUser(
  page: any,
  email: string = "test@example.com",
  password: string = "testpassword123"
) {
  // This will need to be implemented based on your Clerk E2E setup
  // For now, this is a placeholder
  await page.goto("/sign-in");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard");
}

/**
 * Create test home data for E2E tests
 */
export function createTestHome(overrides?: Partial<typeof testData.home>) {
  return {
    ...testData.home,
    ...overrides,
  };
}

/**
 * Create test task data for E2E tests
 */
export function createTestTask(overrides?: Partial<typeof testData.task>) {
  return {
    ...testData.task,
    ...overrides,
  };
}

/**
 * Wait for page to be ready (for E2E tests)
 */
export async function waitForPageLoad(page: any) {
  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Mock Data Factories
 */

/**
 * Create user factory
 */
export function createUser(overrides?: Partial<typeof testData.user>) {
  return {
    ...testData.user,
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

/**
 * Create home factory
 */
export function createHome(overrides?: Partial<typeof testData.home>) {
  return {
    ...testData.home,
    id: `home_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

/**
 * Create task factory
 */
export function createTask(overrides?: Partial<typeof testData.task>) {
  return {
    ...testData.task,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

/**
 * Create maintenance history factory
 */
export function createMaintenanceHistory(overrides?: any) {
  return {
    id: `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    homeId: testData.home.id,
    serviceDate: new Date(),
    serviceType: "Maintenance",
    description: "Test maintenance",
    cost: 100,
    photos: [],
    receipts: [],
    ...overrides,
  };
}

/**
 * Create warranty factory
 */
export function createWarranty(overrides?: any) {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  return {
    id: `warranty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    homeId: testData.home.id,
    itemType: "APPLIANCE",
    itemId: "appliance_test123",
    warrantyExpiry: expiryDate,
    ...overrides,
  };
}

/**
 * Create budget plan factory
 */
export function createBudgetPlan(overrides?: Partial<typeof testData.budgetPlan>) {
  return {
    ...testData.budgetPlan,
    id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

/**
 * Create DIY project factory
 */
export function createDiyProject(overrides?: Partial<typeof testData.diyProject>) {
  return {
    ...testData.diyProject,
    id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides,
  };
}

/**
 * Create appliance factory
 */
export function createAppliance(overrides?: any) {
  return {
    id: `appliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    homeId: testData.home.id,
    applianceType: "REFRIGERATOR",
    brand: "Test Brand",
    model: "Test Model",
    installDate: new Date("2020-01-01"),
    ...overrides,
  };
}

/**
 * Create home system factory
 */
export function createSystem(overrides?: any) {
  return {
    id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    homeId: testData.home.id,
    systemType: "HVAC",
    brand: "Test Brand",
    model: "Test Model",
    installDate: new Date("2020-01-01"),
    ...overrides,
  };
}
