/**
 * Dashboard layout - includes mobile navigation and padding for bottom nav
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "@/app/(dashboard)/layout";

// Mock Clerk's UserButton to avoid auth wiring in tests
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button" />,
}));

// Mock next/navigation for DashboardNav (uses usePathname)
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("DashboardLayout (mobile responsive shell)", () => {
  it("renders children content inside the main area", () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("includes the mobile bottom navigation bar", () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId("mobile-bottom-nav")).toBeInTheDocument();
  });
});

