/**
 * Global Teardown for Playwright E2E Tests
 * This runs once after all tests
 */

import { FullConfig } from "@playwright/test";

async function globalTeardown(config: FullConfig) {
  console.log("Running global teardown for E2E tests...");

  // You can add cleanup tasks here, such as:
  // 1. Cleaning up test database
  // 2. Removing test users
  // 3. Stopping external services
  // 4. Cleaning up test files

  console.log("Global teardown complete.");
}

export default globalTeardown;
