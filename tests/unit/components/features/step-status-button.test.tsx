/**
 * Tests for Step Status Button Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepStatusButton } from "@/components/step-status-button";

// Mock API calls and window.alert (component calls alert on update error; jsdom doesn't implement it)
global.fetch = vi.fn();
vi.stubGlobal("alert", vi.fn());

describe("StepStatusButton", () => {
  const mockOnStatusUpdated = vi.fn();
  const defaultProps = {
    stepId: "step_123",
    projectId: "project_123",
    currentStatus: "not_started",
    estimatedHours: 5,
    actualHours: null,
    onStatusUpdated: mockOnStatusUpdated,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(alert).mockClear();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ step: { id: "step_123", status: "completed" } }),
    } as Response);
  });

  it("should render status button", () => {
    render(<StepStatusButton {...defaultProps} />);
    
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should display current status", () => {
    render(<StepStatusButton {...defaultProps} />);
    
    expect(screen.getByText(/not started/i)).toBeInTheDocument();
  });

  it("should open dialog when clicked", async () => {
    const user = userEvent.setup();
    render(<StepStatusButton {...defaultProps} />);
    
    const button = screen.getByRole("button");
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/update step status/i)).toBeInTheDocument();
    });
  });

  it("should update status successfully", async () => {
    const user = userEvent.setup();
    render(<StepStatusButton {...defaultProps} />);
    
    const button = screen.getByRole("button");
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/update step status/i)).toBeInTheDocument();
    });
    
    // Change status
    const statusSelect = screen.getByRole("combobox");
    await user.click(statusSelect);
    
    await waitFor(() => {
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
    const completedOption = screen.getByText(/completed/i);
    await user.click(completedOption);
    
    // Update
    const updateButton = screen.getByRole("button", { name: /update/i });
    await user.click(updateButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/diy-projects/project_123/steps/step_123",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("completed"),
        })
      );
    });
  });

  it("should update actual hours", async () => {
    const user = userEvent.setup();
    render(<StepStatusButton {...defaultProps} />);
    
    const button = screen.getByRole("button");
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/actual hours/i)).toBeInTheDocument();
    });
    
    const hoursInput = screen.getByLabelText(/actual hours/i);
    await user.type(hoursInput, "6");
    
    const updateButton = screen.getByRole("button", { name: /update/i });
    await user.click(updateButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("actualHours"),
        })
      );
    });
  });

  it("should handle update errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    render(<StepStatusButton {...defaultProps} />);

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/update step status/i)).toBeInTheDocument();
    });

    const updateButton = screen.getByRole("button", { name: /update/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
