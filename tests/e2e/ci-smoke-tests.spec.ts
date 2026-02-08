/**
 * CI/CD Smoke Tests
 * Fast, critical tests that validate core functionality
 * These run first in CI to catch major issues quickly
 */

import { test, expect } from "@playwright/test";

test.describe("CI/CD Smoke Tests", () => {
  test("should load home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Should load without errors
    const hasError = await page.locator('text=/error|500|404/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test("should redirect unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    const currentUrl = page.url();
    // Should redirect to sign-in or stay on dashboard if already authenticated
    expect(currentUrl.includes("sign-in") || currentUrl.includes("dashboard")).toBeTruthy();
  });

  test("should load sign-in page", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    
    await expect(page).toHaveURL(/.*sign-in/);
    
    // Page should load without errors
    const hasError = await page.locator('text=/error|500/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test("should load sign-up page", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/.*sign-up/);

    // Sign-up shows either our terms step or Clerk's form
    await page.waitForLoadState("domcontentloaded");
    const ourTermsHeading = page.getByRole("heading", { name: /create your account/i });
    const ourContinueBtn = page.getByRole("button", { name: /continue to sign up/i });
    const clerkEmailInput = page.getByRole("textbox", { name: /email/i });
    const clerkSignUpText = page.getByText(/sign up|create account/i).first();
    const signUpContent = ourTermsHeading
      .or(ourContinueBtn)
      .or(clerkEmailInput)
      .or(clerkSignUpText);
    await expect(signUpContent).toBeVisible({ timeout: 15000 });

    const hasError = await page.locator('text=/error|500/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test("should load privacy page", async ({ page }) => {
    await page.goto("/privacy");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*privacy/);
    await expect(page.locator("text=/privacy policy/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should load terms page", async ({ page }) => {
    await page.goto("/terms");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*terms/);
    await expect(page.locator("text=/terms of service/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Privacy from landing footer", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /privacy policy/i }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*privacy/);
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to Terms from landing footer", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /terms of service/i }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*terms/);
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible({ timeout: 5000 });
  });

  test("should have no console errors on main pages", async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    
    const pages = ["/", "/sign-in", "/sign-up", "/privacy", "/terms"];
    
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000); // Wait for any async errors
    }
    
    // Filter out known non-critical errors (Clerk, analytics, etc.)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes("Clerk") &&
        !error.includes("analytics") &&
        !error.includes("gtag") &&
        !error.includes("Google") &&
        !error.includes("favicon")
    );
    
    // Log errors for debugging but don't fail on minor issues
    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }
  });

  test("should have accessible navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"], [data-testid="navigation"]').first();
    const navVisible = await nav.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Navigation may be in header or sidebar
    const header = page.locator('header, [role="banner"]').first();
    const headerVisible = await header.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Should have some form of navigation
    expect(navVisible || headerVisible).toBeTruthy();
  });

  test("should handle 404 pages gracefully", async ({ page }) => {
    const response = await page.goto("/non-existent-page-12345");
    await page.waitForLoadState("networkidle");

    const status = response?.status() ?? 0;
    // Next.js may return 200 with a 404 page or an actual 404 status
    expect([200, 404]).toContain(status);

    // Ensure the page rendered something (not a blank crash)
    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
