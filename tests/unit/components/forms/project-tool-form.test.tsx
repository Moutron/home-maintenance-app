/**
 * Tests for Project Tool Form Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectToolForm } from "@/components/project-tool-form";

// Mock API calls
global.fetch = vi.fn();

describe("ProjectToolForm", () => {
  const mockOnToolAdded = vi.fn();
  const defaultProps = {
    projectId: "project_123",
    onToolAdded: mockOnToolAdded,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockImplementation((url) => {
      const isCheckOwned =
        typeof url === "string" && (url as string).includes("/api/tools/check-owned");
      return Promise.resolve({
        ok: true,
        json: async () =>
          isCheckOwned
            ? { toolOwnership: [] }
            : { tool: { id: "tool_new" } },
      } as Response);
    });
  });

  it("should render form", () => {
    render(<ProjectToolForm {...defaultProps} />);
    
    expect(screen.getByText(/add tool/i)).toBeInTheDocument();
  });

  it("should add a new tool to the form", async () => {
    const user = userEvent.setup();
    render(<ProjectToolForm {...defaultProps} />);
    
    const addButton = screen.getByRole("button", { name: /add tool/i });
    await user.click(addButton);
    
    // Should show tool form fields
    await waitFor(() => {
      expect(screen.getByLabelText(/tool name/i)).toBeInTheDocument();
    });
  });

  it("should check tool ownership", async () => {
    const user = userEvent.setup();
    render(<ProjectToolForm {...defaultProps} />);

    const addButton = screen.getByRole("button", { name: /add tool/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/tool name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/tool name/i);
    await user.type(nameInput, "Hammer");

    const submitButton = screen.getByRole("button", { name: "Save Tools" });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/tools/check-owned"),
          expect.objectContaining({ method: "POST" })
        );
      },
      { timeout: 3000 }
    );
  });

  it("should submit tool successfully", async () => {
    const user = userEvent.setup();
    render(<ProjectToolForm {...defaultProps} />);
    
    const addButton = screen.getByRole("button", { name: /add tool/i });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/tool name/i)).toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText(/tool name/i);
    await user.type(nameInput, "Screwdriver");
    
    const submitButton = screen.getByRole("button", { name: "Save Tools" });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/diy-projects/project_123/tools"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("should handle submission errors", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    
    render(<ProjectToolForm {...defaultProps} />);
    
    const addButton = screen.getByRole("button", { name: /add tool/i });
    await user.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/tool name/i)).toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText(/tool name/i);
    await user.type(nameInput, "Test Tool");
    
    const submitButton = screen.getByRole("button", { name: "Save Tools" });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
