/**
 * Tests for Tool Photo Upload Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolPhotoUpload } from "@/components/tool-photo-upload";

// Mock API calls
global.fetch = vi.fn();

describe("ToolPhotoUpload", () => {
  const mockOnAnalysisComplete = vi.fn();
  const defaultProps = {
    onAnalysisComplete: mockOnAnalysisComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        analysis: {
          name: "Cordless Drill",
          brand: "DeWalt",
          model: "DCD771",
          category: "Power Tools",
          condition: "good",
          description: "20V Max cordless drill",
        },
      }),
    } as Response);
  });

  it("should render upload component", () => {
    render(<ToolPhotoUpload {...defaultProps} />);
    
    expect(screen.getByText(/upload photo/i)).toBeInTheDocument();
    expect(screen.getByText(/ai photo analysis/i)).toBeInTheDocument();
  });

  it("should allow file selection", async () => {
    const user = userEvent.setup();
    render(<ToolPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload photo/i }).closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    expect(fileInput).toBeInTheDocument();
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(fileInput.files?.[0]).toBe(file);
    });
  });

  it("should show preview after file selection", async () => {
    const user = userEvent.setup();
    render(<ToolPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload photo/i }).closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      // Should show preview image
      const preview = screen.queryByRole("img", { name: /tool preview/i });
      expect(preview).toBeInTheDocument();
    });
  });

  it("should analyze photo when analyze button clicked", async () => {
    const user = userEvent.setup();
    render(<ToolPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload photo/i }).closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(fileInput.files?.[0]).toBe(file);
    });
    
    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    await user.click(analyzeButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/tools/analyze-photo",
        expect.any(Object)
      );
    });
  });

  it("should call onAnalysisComplete with results", async () => {
    const user = userEvent.setup();
    render(<ToolPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload photo/i }).closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(fileInput.files?.[0]).toBe(file);
    });
    
    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    await user.click(analyzeButton);
    
    await waitFor(() => {
      expect(mockOnAnalysisComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Cordless Drill",
          brand: "DeWalt",
        })
      );
    });
  });

  it("should handle analysis errors", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Analysis failed" }),
    } as Response);
    
    render(<ToolPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload photo/i }).closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    await user.click(analyzeButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it("should show loading state during analysis", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ToolPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByRole("button", { name: /upload photo/i }).closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    await user.upload(fileInput, file);
    
    const analyzeButton = screen.getByRole("button", { name: /analyze/i });
    await user.click(analyzeButton);
    
    await waitFor(() => {
      // Should show loading spinner or disabled state
      expect(analyzeButton).toBeDisabled();
    });
  });
});
