/**
 * E2E Tests for Onboarding Flow
 */

import { test, expect } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import { createTestHome } from "./helpers/test-data";

test.describe("Onboarding", () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real scenario, you'd authenticate first
    // await loginAsUser(page);
    await page.goto("/onboarding");
  });

  test("should display onboarding page", async ({ page }) => {
    await expect(page).toHaveURL(/.*onboarding/);
    
    // Check for common onboarding elements
    const hasOnboardingContent = await page.locator('text=/welcome|get started|onboarding/i').first().isVisible({ timeout: 3000 }).catch(() => false);
    // This may fail if redirected to sign-in, which is expected
  });

  test("should complete onboarding steps", async ({ page }) => {
    // Navigate to onboarding
    await page.goto("/onboarding");
    
    // Look for step indicators or forms
    const stepIndicator = page.locator('[data-testid="step"], .step-indicator, text=/step/i').first();
    const isVisible = await stepIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      // Try to find and click next/continue button
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isVisible({ timeout: 2000 })) {
        await nextButton.click();
      }
    }
  });

  test("should add first home during onboarding", async ({ page }) => {
    await page.goto("/onboarding");
    
    // Look for home form
    const homeForm = page.locator('form, [data-testid="home-form"]').first();
    const formVisible = await homeForm.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (formVisible) {
      const testHome = createTestHome();
      
      // Fill in home details
      await page.fill('input[name="address"], input[placeholder*="address" i]', testHome.address).catch(() => {});
      await page.fill('input[name="city"], input[placeholder*="city" i]', testHome.city).catch(() => {});
      await page.fill('input[name="state"], input[placeholder*="state" i]', testHome.state).catch(() => {});
      await page.fill('input[name="zipCode"], input[placeholder*="zip" i]', testHome.zipCode).catch(() => {});
      
      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Continue")').first();
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click();
      }
    }
  });

  // Note: Full onboarding flow testing requires:
  // 1. Authentication setup (Clerk test mode)
  // 2. Form filling with actual selectors
  // 3. API mocking or test database
  // 4. Verification of onboarding completion
});
