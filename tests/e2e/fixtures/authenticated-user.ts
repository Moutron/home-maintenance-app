/**
 * Playwright Fixture for Authenticated User
 */

import { test as base, type Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

type AuthenticatedUserFixtures = {
  authenticatedPage: Page;
  loginPage: LoginPage;
};

export const test = base.extend<AuthenticatedUserFixtures>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }: { page: Page }, use) => {
    // Note: This is a placeholder - actual implementation depends on Clerk test mode
    // For now, we'll just provide the page and let individual tests handle auth
    
    // In a real implementation with Clerk test mode, you would:
    // 1. Set up test user in Clerk
    // 2. Use Clerk's test utilities to authenticate
    // 3. Set authentication cookies/tokens
    
    await use(page);
  },

  // Login page fixture
  loginPage: async ({ page }: { page: Page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from "@playwright/test";
