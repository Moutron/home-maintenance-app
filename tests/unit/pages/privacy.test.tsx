/**
 * Tests for Privacy Policy page
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";

describe("Privacy Page", () => {
  it("should render privacy policy heading", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
  });

  it("should render back to home link", () => {
    render(<PrivacyPage />);
    const backLink = screen.getByRole("link", { name: /back to home/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("should render placeholder content", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/placeholder/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/data you collect/i)).toBeInTheDocument();
  });

  it("should link to Terms of Service", () => {
    render(<PrivacyPage />);
    const termsLink = screen.getByRole("link", { name: /terms of service/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("should link to Clerk privacy policy", () => {
    render(<PrivacyPage />);
    const clerkLink = screen.getByRole("link", { name: /clerk.*privacy/i });
    expect(clerkLink).toBeInTheDocument();
    expect(clerkLink).toHaveAttribute("href", "https://clerk.com/privacy");
  });
});
