/**
 * Tests for System Photo Upload Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SystemPhotoUpload } from "@/components/system-photo-upload";

// Mock API calls
global.fetch = vi.fn();

// FileReader is provided by tests/setup.ts for jsdom

describe("SystemPhotoUpload", () => {
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
          systemType: "HVAC",
          brand: "Carrier",
          model: "Infinity 19VS",
          installDate: "2019-01-01",
          estimatedAge: 5,
          condition: "good",
          material: null,
          capacity: "3 ton",
          additionalDetails: "Serial number visible",
        },
      }),
    } as Response);
  });

  it("should render upload component", () => {
    render(<SystemPhotoUpload {...defaultProps} />);
    
    expect(screen.getByText(/upload photo/i)).toBeInTheDocument();
  });

  it("should allow file selection", async () => {
    const user = userEvent.setup();
    render(<SystemPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const uploadButton = screen.getByText(/upload photo/i);
    const fileInput = uploadButton.closest("div")?.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (fileInput) {
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(fileInput.files?.[0]).toBe(file);
      });
    }
  });

  it("should validate file type", async () => {
    render(<SystemPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake"], "test.pdf", { type: "application/pdf" });
    const uploadButton = screen.getByText(/upload photo/i);
    const fileInput = uploadButton.closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    expect(fileInput).toBeTruthy();
    // Fire change so handler runs (user.upload may not trigger onChange in jsdom)
    Object.defineProperty(fileInput!, "files", { value: [file], configurable: true });
    fireEvent.change(fileInput!, { target: { files: [file] } });
      
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("Please select an image file"))).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("should validate file size", async () => {
    const user = userEvent.setup();
    render(<SystemPhotoUpload {...defaultProps} />);
    
    // Create a large file (11MB)
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });
    const uploadButton = screen.getByText(/upload photo/i);
    const fileInput = uploadButton.closest("div")?.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (fileInput) {
      await user.upload(fileInput, largeFile);
      
      await waitFor(() => {
        expect(screen.getByText(/10MB|size/i)).toBeInTheDocument();
      });
    }
  });

  it("should analyze photo and call callback", async () => {
    const user = userEvent.setup();
    render(<SystemPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const uploadButton = screen.getByText(/upload photo/i);
    const fileInput = uploadButton.closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    if (fileInput) {
      await user.upload(fileInput, file);
      
      // Wait for FileReader to complete and analysis to start
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/systems/analyze-photo",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
      }, { timeout: 5000 });
      
      // Wait for callback to be called
      await waitFor(() => {
        expect(mockOnAnalysisComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            systemType: "HVAC",
            brand: "Carrier",
          })
        );
      }, { timeout: 2000 });
    }
  });

  it("should handle analysis errors", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Analysis failed" }),
    } as Response);
    
    render(<SystemPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const uploadButton = screen.getByText(/upload photo/i);
    const fileInput = uploadButton.closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    
    if (fileInput) {
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      }, { timeout: 5000 });
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    }
  });

  it("should accept systemTypeHint prop", () => {
    render(<SystemPhotoUpload {...defaultProps} systemTypeHint="HVAC" />);
    
    expect(screen.getByText(/upload photo/i)).toBeInTheDocument();
  });
});
