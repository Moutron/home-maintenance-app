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

describe("Tasks Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        tasks: [],
      }),
    } as Response);
  });

  it("should render tasks page", async () => {
    render(<TasksPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/tasks/i)).toBeInTheDocument();
    });
  });

  it("should display task list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tasks: [
          {
            id: "task1",
            name: "Test Task",
            description: "Test Description",
            category: "HVAC",
            nextDueDate: new Date().toISOString(),
            home: {
              city: "San Francisco",
              state: "CA",
              zipCode: "94102",
              yearBuilt: 1980,
              homeType: "single-family",
            },
          },
        ],
      }),
    } as Response);

    render(<TasksPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/test task/i)).toBeInTheDocument();
    });
  });
});
