/**
 * Tests for Tasks Page
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TasksPage from "@/app/(dashboard)/tasks/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock API calls
global.fetch = vi.fn();

function mockFetchForTasksPage(overrides?: { tasks?: unknown[]; homes?: unknown[]; vehicles?: unknown[] }) {
  const tasks = overrides?.tasks ?? [];
  const homes = overrides?.homes ?? [];
  const vehicles = overrides?.vehicles ?? [];
  vi.mocked(fetch).mockImplementation((url: string | URL) => {
    const u = typeof url === "string" ? url : url.toString();
    if (u.includes("/api/tasks")) {
      return Promise.resolve({ ok: true, json: async () => ({ tasks }) } as Response);
    }
    if (u.includes("/api/homes")) {
      return Promise.resolve({ ok: true, json: async () => ({ homes }) } as Response);
    }
    if (u.includes("/api/vehicles")) {
      return Promise.resolve({ ok: true, json: async () => ({ vehicles }) } as Response);
    }
    return Promise.resolve({ ok: false } as Response);
  });
}

describe("Tasks Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchForTasksPage();
  });

  it("should render tasks page", async () => {
    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /maintenance tasks/i })).toBeInTheDocument();
    });
  });

  it("should display task list", async () => {
    mockFetchForTasksPage({
      tasks: [
        {
          id: "task1",
          name: "Test Task",
          description: "Test Description",
          category: "HVAC",
          nextDueDate: new Date().toISOString(),
          completed: false,
          home: {
            id: "h1",
            address: "123 Main",
            city: "San Francisco",
            state: "CA",
            zipCode: "94102",
            yearBuilt: 1980,
            homeType: "single-family",
          },
          vehicle: null,
          template: null,
        },
      ],
    } as { tasks?: unknown[] });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText(/test task/i)).toBeInTheDocument();
    });
  });

  it("should show filter labels (Source, Category, Status, Sort by)", async () => {
    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Source")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Sort by")).toBeInTheDocument();
    });
  });

  it("should show intro text explaining filters", async () => {
    render(<TasksPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/use the filters below to show only the tasks you want/i)
      ).toBeInTheDocument();
    });
  });
});
