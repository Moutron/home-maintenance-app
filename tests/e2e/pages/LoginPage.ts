/**
 * Login Page Object Model
 */

import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signUpLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    this.signInButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")').first();
    this.signUpLink = page.locator('a:has-text("Sign up"), a:has-text("Sign Up")').first();
    this.forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("forgot password")').first();
  }

  async goto() {
    await this.page.goto("/sign-in");
    await this.page.waitForLoadState("networkidle");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSignIn() {
    await this.signInButton.click();
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSignIn();
    // Wait for navigation after login
    await this.page.waitForURL(/.*(dashboard|home|\/)$/, { timeout: 10000 });
  }

  async clickSignUp() {
    await this.signUpLink.click();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
