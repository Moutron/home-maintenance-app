/**
 * MobileBottomNav - mobile navigation responsiveness
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

// Mock next/navigation for usePathname
vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
}));

describe("MobileBottomNav", () => {
  it("renders primary navigation items for mobile", () => {
    render(<MobileBottomNav />);

    // The key tabs we expose in the mobile bar
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/homes/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/budget/i)).toBeInTheDocument();
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });

  it("marks the current route as active", () => {
    render(<MobileBottomNav />);

    const tasksLink = screen.getByText(/tasks/i).closest("a");
    expect(tasksLink).toHaveAttribute("aria-current", "page");
  });

  it("is wrapped in a nav landmark for mobile", () => {
    render(<MobileBottomNav />);

    const nav = screen.getByTestId("mobile-bottom-nav");
    expect(nav).toHaveAttribute("aria-label", "Primary mobile navigation");
  });
});

