/**
 * Tests for Project Step Form Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectStepForm } from "@/components/project-step-form";

// Mock API calls
global.fetch = vi.fn();

describe("ProjectStepForm", () => {
  const mockOnStepAdded = vi.fn();
  const defaultProps = {
    projectId: "project_123",
    existingSteps: [],
    onStepAdded: mockOnStepAdded,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ step: { id: "step_new" } }),
    } as Response);
  });

  it("should render form fields", () => {
    render(<ProjectStepForm {...defaultProps} />);
    
    expect(screen.getByText(/add step/i)).toBeInTheDocument();
  });

  it("should add a new step to the form", async () => {
    const user = userEvent.setup();
    render(<ProjectStepForm {...defaultProps} />);
    
    const addButton = screen.getByRole("button", { name: /add step/i });
    await user.click(addButton);
    
    // Should show step form fields
    await waitFor(() => {
      expect(screen.getByLabelText(/step name/i)).toBeInTheDocument();
    });
  });

  it("should submit step successfully", async () => {
    const user = userEvent.setup();
    render(<ProjectStepForm {...defaultProps} />);
    
    // Add a step
    const addButton = screen.getByRole("button", { name: /add step/i });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/step name/i)).toBeInTheDocument();
    });
    
    // Fill in required step details (name + instructions)
    const nameInput = screen.getByLabelText(/step name/i);
    await user.type(nameInput, "Test Step");
    const instructionsInput = screen.getByLabelText(/instructions \*/i);
    await user.type(instructionsInput, "Do the thing.");
    
    const submitButton = screen.getByRole("button", { name: "Save Steps" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/diy-projects/project_123/steps"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("should handle existing steps when calculating step numbers", () => {
    const props = {
      ...defaultProps,
      existingSteps: [
        { id: "step_1", stepNumber: 1, name: "Step 1", description: "", instructions: "", estimatedHours: 2, status: "completed" },
        { id: "step_2", stepNumber: 2, name: "Step 2", description: "", instructions: "", estimatedHours: 3, status: "not_started" },
      ],
    };
    
    render(<ProjectStepForm {...props} />);
    
    // Should render with existing steps context
    expect(screen.getByText(/add step/i)).toBeInTheDocument();
  });

  it("should handle submission errors", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    
    render(<ProjectStepForm {...defaultProps} />);
    
    const addButton = screen.getByRole("button", { name: /add step/i });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/step name/i)).toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText(/step name/i);
    await user.type(nameInput, "Test Step");
    const instructionsInput = screen.getByLabelText(/instructions \*/i);
    await user.type(instructionsInput, "Do the thing.");
    
    const submitButton = screen.getByRole("button", { name: "Save Steps" });
    await user.click(submitButton);

    // Should handle error (component may show error message)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
