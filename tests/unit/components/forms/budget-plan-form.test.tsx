/**
 * Tests for Budget Plan Form Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetPlanForm } from "@/components/budget-plan-form";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock API calls
global.fetch = vi.fn();

describe("BudgetPlanForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render form fields", () => {
    render(<BudgetPlanForm />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/period/i)).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    const user = userEvent.setup();
    render(<BudgetPlanForm />);

    const submitButton = screen.getByRole("button", { name: /submit|save|create/i });
    await user.click(submitButton);

    // HTML5 validation prevents submit; fetch should not be called
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<BudgetPlanForm />);

    await user.type(screen.getByLabelText(/name/i), "Test Budget");
    await user.type(screen.getByLabelText(/amount/i), "1000");
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2024-12-31" },
    });

    const submitButton = screen.getByRole("button", { name: /save budget plan/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
