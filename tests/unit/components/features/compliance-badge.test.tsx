/**
 * Tests for Compliance Badge Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ComplianceBadge } from "@/components/compliance-badge";

// Mock API calls
global.fetch = vi.fn();

describe("ComplianceBadge", () => {
  const defaultProps = {
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    yearBuilt: 1970,
    homeType: "single-family",
    taskCategory: "SAFETY",
    taskName: "Smoke Detector Installation",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render nothing when loading", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { container } = render(<ComplianceBadge {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when no compliance requirements", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        compliance: { summary: { required: 0 } },
        permitInfo: { requiresPermit: false },
      }),
    } as Response);
    
    const { container } = render(<ComplianceBadge {...defaultProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    // Should render nothing when no requirements
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("should display 'Required by Law' badge when regulations exist", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        compliance: { summary: { required: 1 } },
        permitInfo: { requiresPermit: false },
      }),
    } as Response);
    
    render(<ComplianceBadge {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/required by law/i)).toBeInTheDocument();
    });
  });

  it("should display 'Permit Required' badge when permit needed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        compliance: { summary: { required: 0 } },
        permitInfo: { requiresPermit: true },
      }),
    } as Response);
    
    render(<ComplianceBadge {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/permit required/i)).toBeInTheDocument();
    });
  });

  it("should fetch compliance data on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        compliance: { summary: { required: 0 } },
        permitInfo: { requiresPermit: false },
      }),
    } as Response);
    
    render(<ComplianceBadge {...defaultProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/compliance/lookup",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("San Francisco"),
        })
      );
    });
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("API error"));
    
    const { container } = render(<ComplianceBadge {...defaultProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    // Should render nothing on error
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
