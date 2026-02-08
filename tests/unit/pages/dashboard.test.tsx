/**
 * Tests for Dashboard Page
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

// Note: Pages are client components, may need additional setup

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock API calls
global.fetch = vi.fn();

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        stats: {
          upcomingTasks: 5,
          overdueTasks: 2,
          tasksDueToday: 1,
          completedThisMonth: 3,
          totalSpending: 1000,
          monthlySpending: 200,
          yearlySpending: 1000,
          completionRate: 0.6,
          totalTasks: 10,
          activeTasks: 8,
        },
        alerts: {
          overdueTasks: [],
          tasksDueToday: [],
          warrantiesExpiring30: [],
          warrantiesExpiring60: [],
          warrantiesExpiring90: [],
          itemsNeedingAttention: [],
        },
        tasks: {
          upcoming: [],
          overdue: [],
          dueToday: [],
        },
        spending: {
          monthly: [],
          yearly: [],
          byCategory: [],
        },
        activity: [],
        homes: [],
      }),
    } as Response);
  });

  it("should render dashboard page", async () => {
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  it("should display metrics cards", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
    // Multiple elements contain "overdue" / "due today" (card titles, sections); check at least one of each
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/due today/i).length).toBeGreaterThan(0);
  });

  it("should handle API errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("API Error"));
    
    render(<DashboardPage />);
    
    await waitFor(() => {
      // Should handle error gracefully
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });
});
