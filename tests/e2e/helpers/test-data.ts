/**
 * Test Data Helpers for E2E Tests
 */

/**
 * Create test home data
 */
export function createTestHome(overrides?: Partial<TestHome>) {
  return {
    address: "123 Test Street",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    yearBuilt: 1980,
    squareFootage: 2000,
    lotSize: 0.25,
    homeType: "single-family",
    ...overrides,
  };
}

/**
 * Create test task data
 */
export function createTestTask(overrides?: Partial<TestTask>) {
  return {
    name: "Test Maintenance Task",
    description: "This is a test task",
    category: "HVAC",
    frequency: "MONTHLY",
    priority: "MEDIUM",
    ...overrides,
  };
}

/**
 * Create test maintenance record data
 */
export function createTestMaintenanceRecord(overrides?: Partial<TestMaintenanceRecord>) {
  return {
    description: "Test maintenance performed",
    serviceDate: new Date().toISOString().split("T")[0],
    serviceType: "Maintenance",
    cost: 100,
    ...overrides,
  };
}

/**
 * Create test budget plan data
 */
export function createTestBudgetPlan(overrides?: Partial<TestBudgetPlan>) {
  return {
    name: "Test Budget Plan",
    amount: 1000,
    period: "MONTHLY",
    category: "Maintenance",
    ...overrides,
  };
}

/**
 * Create test DIY project data
 */
export function createTestDiyProject(overrides?: Partial<TestDiyProject>) {
  return {
    name: "Test DIY Project",
    description: "This is a test DIY project",
    category: "HVAC",
    difficulty: "EASY",
    estimatedCost: 500,
    ...overrides,
  };
}

// Type definitions
interface TestHome {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  yearBuilt: number;
  squareFootage: number;
  lotSize: number;
  homeType: string;
}

interface TestTask {
  name: string;
  description: string;
  category: string;
  frequency: string;
  priority: string;
}

interface TestMaintenanceRecord {
  description: string;
  serviceDate: string;
  serviceType: string;
  cost: number;
}

interface TestBudgetPlan {
  name: string;
  amount: number;
  period: string;
  category: string;
}

interface TestDiyProject {
  name: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedCost: number;
}
