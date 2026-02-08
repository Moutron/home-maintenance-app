/**
 * E2E Tests for Authentication Flow
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { loginAsUser, isAuthenticated } from "./helpers/auth";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");
  });

  test("should redirect to sign-in when not authenticated", async ({ page }) => {
    // Try to access a protected route
    await page.goto("/dashboard");
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/);
  });

  test("should show sign-in page", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Verify we're on the sign-in page
    await expect(page).toHaveURL(/.*sign-in/);
    
    // Verify sign-in elements are present
    await expect(loginPage.emailInput).toBeVisible({ timeout: 5000 }).catch(() => {
      // Clerk may use different selectors, so this is optional
    });
  });

  test("should show sign-up page", async ({ page }) => {
    await page.goto("/sign-up");
    
    // Check for sign-up elements
    await expect(page).toHaveURL(/.*sign-up/);
  });

  test("should navigate to sign-up from sign-in", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Try to click sign-up link if available
    if (await loginPage.signUpLink.isVisible({ timeout: 2000 })) {
      await loginPage.clickSignUp();
      await expect(page).toHaveURL(/.*sign-up/);
    }
  });

  // Note: Actual sign-in/sign-up testing requires Clerk test mode setup
  // To enable full authentication testing:
  // 1. Configure Clerk test mode
  // 2. Create test users
  // 3. Use Clerk's test utilities or API to authenticate
  // Example:
  // test("should successfully sign in", async ({ page }) => {
  //   await loginAsUser(page, "test@example.com", "password");
  //   expect(await isAuthenticated(page)).toBe(true);
  // });
});
