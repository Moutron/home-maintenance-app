/**
 * Tests for Project Photo Upload Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectPhotoUpload } from "@/components/project-photo-upload";

// Mock API calls
global.fetch = vi.fn();

// Mock FileReader
global.FileReader = class FileReader {
  result: string | null = null;
  onload: ((e: any) => void) | null = null;
  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = "data:image/jpeg;base64,fake";
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
} as any;

describe("ProjectPhotoUpload", () => {
  const mockOnUploadComplete = vi.fn();
  const defaultProps = {
    projectId: "project_123",
    onUploadComplete: mockOnUploadComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ photo: { id: "photo_new", url: "https://example.com/photo.jpg" } }),
    } as Response);
  });

  it("should render upload component", () => {
    render(<ProjectPhotoUpload {...defaultProps} />);
    
    // There are multiple "Upload Photo" buttons, use getAllByText
    const uploadButtons = screen.getAllByText(/upload photo/i);
    expect(uploadButtons.length).toBeGreaterThan(0);
  });

  function getUploadFileInput(): HTMLInputElement {
    const uploadButtons = screen.getAllByRole("button", { name: /upload photo/i });
    return uploadButtons[0].closest("div")?.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
  }

  /** Submit button is the second "Upload Photo" button (the one that posts to API). */
  function getSubmitUploadButton(): HTMLElement {
    const uploadButtons = screen.getAllByRole("button", { name: /upload photo/i });
    return uploadButtons[1];
  }

  it("should allow file selection", async () => {
    const user = userEvent.setup();
    render(<ProjectPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = getUploadFileInput();
    
    expect(fileInput).toBeInTheDocument();
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(fileInput.files?.[0]).toBe(file);
    });
  });

  it("should show preview after file selection", async () => {
    const user = userEvent.setup();
    render(<ProjectPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = getUploadFileInput();
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      // Should show preview image
      const preview = screen.queryByRole("img");
      expect(preview).toBeInTheDocument();
    });
  });

  it("should upload photo successfully", async () => {
    const user = userEvent.setup();
    render(<ProjectPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = getUploadFileInput();
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(fileInput.files?.[0]).toBe(file);
    });

    await waitFor(() => {
      const submitButton = getSubmitUploadButton();
      expect(submitButton).not.toBeDisabled();
    });
    const submitButton = getSubmitUploadButton();
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/diy-projects/project_123/photos"),
        expect.any(Object)
      );
    });
  });

  it("should handle upload errors", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    
    render(<ProjectPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = getUploadFileInput();
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      const submitButton = getSubmitUploadButton();
      expect(submitButton).not.toBeDisabled();
    });
    const submitButton = getSubmitUploadButton();
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it("should allow adding caption", async () => {
    const user = userEvent.setup();
    render(<ProjectPhotoUpload {...defaultProps} />);
    
    const file = new File(["fake image"], "test.jpg", { type: "image/jpeg" });
    const fileInput = getUploadFileInput();
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      const captionInput = screen.getByLabelText(/caption/i);
      expect(captionInput).toBeInTheDocument();
    });
    
    const captionInput = screen.getByLabelText(/caption/i);
    await user.type(captionInput, "Test caption");
    expect(captionInput).toHaveValue("Test caption");
  });
});
