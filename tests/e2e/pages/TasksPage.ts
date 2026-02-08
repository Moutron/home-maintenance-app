/**
 * Tasks Page Object Model
 */

import { Page, Locator } from "@playwright/test";

export class TasksPage {
  readonly page: Page;
  readonly tasksList: Locator;
  readonly addTaskButton: Locator;
  readonly filterButtons: Locator;
  readonly searchInput: Locator;
  readonly taskItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tasksList = page.locator('[data-testid="tasks-list"], .tasks-list, [class*="task-list"]');
    this.addTaskButton = page.locator('button:has-text("Add"), button:has-text("New Task"), button:has-text("Create Task")').first();
    this.filterButtons = page.locator('button:has-text("All"), button:has-text("Overdue"), button:has-text("Due Today")');
    this.searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    this.taskItems = page.locator('[data-testid="task-item"], .task-item, [class*="task-card"]');
  }

  async goto() {
    await this.page.goto("/tasks");
    await this.page.waitForLoadState("networkidle");
  }

  async waitForTasks() {
    await this.page.waitForSelector('[data-testid="task-item"], .task-item', { timeout: 10000 });
  }

  async clickAddTask() {
    await this.addTaskButton.click();
  }

  async filterBy(filter: "all" | "overdue" | "due-today" | "upcoming") {
    const filterMap = {
      all: "All",
      overdue: "Overdue",
      "due-today": "Due Today",
      upcoming: "Upcoming",
    };
    const button = this.page.locator(`button:has-text("${filterMap[filter]}")`).first();
    if (await button.isVisible()) {
      await button.click();
    }
  }

  async searchTasks(query: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query);
    }
  }

  async getTaskCount(): Promise<number> {
    return await this.taskItems.count();
  }

  async completeTask(taskName: string) {
    const task = this.page.locator(`text=${taskName}`).first();
    const completeButton = task.locator('..').locator('button:has-text("Complete"), input[type="checkbox"]').first();
    if (await completeButton.isVisible()) {
      await completeButton.click();
    }
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector('text=/tasks/i', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
