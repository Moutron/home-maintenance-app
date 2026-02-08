/**
 * Dashboard Page Object Model
 */

import { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly metricsCards: Locator;
  readonly overdueTasksCard: Locator;
  readonly dueTodayTasksCard: Locator;
  readonly upcomingTasksCard: Locator;
  readonly totalSpendingCard: Locator;
  readonly tasksList: Locator;
  readonly addTaskButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.metricsCards = page.locator('[data-testid="metric-card"], .metric-card, [class*="metric"]');
    this.overdueTasksCard = page.locator('text=/overdue/i').first();
    this.dueTodayTasksCard = page.locator('text=/due today/i').first();
    this.upcomingTasksCard = page.locator('text=/upcoming/i').first();
    this.totalSpendingCard = page.locator('text=/spending/i, text=/budget/i').first();
    this.tasksList = page.locator('[data-testid="tasks-list"], .tasks-list, [class*="task"]');
    this.addTaskButton = page.locator('button:has-text("Add"), button:has-text("New Task")').first();
  }

  async goto() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  async waitForMetrics() {
    await this.page.waitForSelector('text=/overdue|due today|upcoming/i', { timeout: 10000 });
  }

  async getOverdueCount(): Promise<number> {
    const card = this.overdueTasksCard;
    if (await card.isVisible()) {
      const text = await card.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  }

  async getDueTodayCount(): Promise<number> {
    const card = this.dueTodayTasksCard;
    if (await card.isVisible()) {
      const text = await card.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  }

  async clickAddTask() {
    await this.addTaskButton.click();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector('text=/dashboard/i', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
