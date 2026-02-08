/**
 * Tests for Terms of Service page
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsPage from "@/app/terms/page";

describe("Terms Page", () => {
  it("should render terms of service heading", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { name: /terms of service/i })).toBeInTheDocument();
  });

  it("should render back to home link", () => {
    render(<TermsPage />);
    const backLink = screen.getByRole("link", { name: /back to home/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("should render placeholder content", () => {
    render(<TermsPage />);
    expect(screen.getAllByText(/placeholder/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/acceptable use/i)).toBeInTheDocument();
  });

  it("should link to Privacy Policy", () => {
    render(<TermsPage />);
    const privacyLinks = screen.getAllByRole("link", { name: /privacy policy/i });
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(privacyLinks[0]).toHaveAttribute("href", "/privacy");
  });
});
