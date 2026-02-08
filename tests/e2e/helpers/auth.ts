/**
 * Authentication Helpers for E2E Tests
 */

import { Page } from "@playwright/test";

/**
 * Login as a user using Clerk
 * Note: This requires Clerk test mode to be configured
 */
export async function loginAsUser(
  page: Page,
  email: string = "test@example.com",
  password: string = "testpassword123"
) {
  // Navigate to sign-in page
  await page.goto("/sign-in");

  // Wait for Clerk to load
  await page.waitForLoadState("networkidle");

  // Fill in email (adjust selector based on your Clerk implementation)
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  if (await emailInput.isVisible()) {
    await emailInput.fill(email);
  }

  // Fill in password (adjust selector based on your Clerk implementation)
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(password);
  }

  // Click sign-in button
  const signInButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")').first();
  if (await signInButton.isVisible()) {
    await signInButton.click();
  }

  // Wait for navigation to dashboard or home page
  await page.waitForURL(/.*(dashboard|home|\/)$/, { timeout: 10000 });
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Look for user menu or logout button
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Sign out"), button:has-text("Logout")').first();
  
  if (await userMenu.isVisible()) {
    await userMenu.click();
    
    // Wait for logout option if in a menu
    const logoutOption = page.locator('button:has-text("Sign out"), button:has-text("Logout"), a:has-text("Sign out")').first();
    if (await logoutOption.isVisible()) {
      await logoutOption.click();
    }
  }

  // Wait for redirect to sign-in or home
  await page.waitForURL(/.*(sign-in|sign-up|\/)$/, { timeout: 5000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for authenticated indicators
    const authIndicators = [
      page.locator('[data-testid="user-menu"]'),
      page.locator('text=/dashboard/i'),
      page.locator('text=/sign out/i'),
    ];

    for (const indicator of authIndicators) {
      if (await indicator.isVisible({ timeout: 2000 })) {
        return true;
      }
    }

    // Check if we're on a protected route without redirect
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/tasks')) {
      return !currentUrl.includes('/sign-in');
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout: number = 10000) {
  await page.waitForLoadState("networkidle");
  
  // Wait for either authenticated state or redirect to sign-in
  await Promise.race([
    page.waitForURL(/.*(dashboard|tasks|home)/, { timeout }),
    page.waitForURL(/.*sign-in/, { timeout }),
  ]).catch(() => {
    // Timeout is okay, just continue
  });
}
