/**
 * Global Setup for Playwright E2E Tests
 * This runs once before all tests
 */

import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("Running global setup for E2E tests...");

  // You can add setup tasks here, such as:
  // 1. Setting up test database
  // 2. Creating test users in Clerk
  // 3. Seeding test data
  // 4. Starting external services

  // Example: Create a browser instance for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Example: Navigate to a setup endpoint or perform setup actions
  // await page.goto("http://localhost:3000/api/test/setup");

  await browser.close();

  console.log("Global setup complete.");
}

export default globalSetup;
