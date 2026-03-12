/**
 * Tests for Homes Page (My Homes)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomesPage from "@/app/(dashboard)/homes/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

global.fetch = vi.fn();

describe("Homes Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ homes: [] }),
    } as Response);
  });

  it("should render page with title My Homes", async () => {
    render(<HomesPage />);

    await waitFor(() => {
      expect(screen.getByText("My Homes")).toBeInTheDocument();
    });
  });

  it("should show empty state when user has no homes", async () => {
    render(<HomesPage />);

    await waitFor(() => {
      expect(screen.getByText("No homes yet")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /add your first home/i })).toBeInTheDocument();
  });

  it("should show Add Home button in header", async () => {
    render(<HomesPage />);

    await waitFor(() => {
      expect(screen.getByText("My Homes")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /add home/i })).toBeInTheDocument();
  });

  it("should display home cards with Map your maintenance and footer buttons", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        homes: [
          {
            id: "h1",
            address: "2710 Walbridge Drive",
            city: "Rochester Hills",
            state: "MI",
            zipCode: "48307",
            yearBuilt: 2026,
            squareFootage: null,
            lotSize: null,
            homeType: "single-family",
            climateZone: "5-6",
            systems: [],
          },
        ],
      }),
    } as Response);

    render(<HomesPage />);

    await waitFor(() => {
      expect(screen.getByText("2710 Walbridge Drive")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /map your maintenance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /quick add \(templates\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove home/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
  });

  it("should show optional fields note", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        homes: [
          {
            id: "h1",
            address: "123 Test St",
            city: "City",
            state: "ST",
            zipCode: "12345",
            yearBuilt: 1990,
            squareFootage: null,
            lotSize: null,
            homeType: "single-family",
            climateZone: null,
            systems: [],
          },
        ],
      }),
    } as Response);

    render(<HomesPage />);

    await waitFor(() => {
      expect(screen.getByText("123 Test St")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/optional fields \(square feet, lot size, climate\) can be added when editing the home/i)
    ).toBeInTheDocument();
  });

  it("should show Systems section and message when no systems", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        homes: [
          {
            id: "h1",
            address: "123 Test St",
            city: "City",
            state: "ST",
            zipCode: "12345",
            yearBuilt: 1990,
            squareFootage: null,
            lotSize: null,
            homeType: "single-family",
            climateZone: null,
            systems: [],
          },
        ],
      }),
    } as Response);

    render(<HomesPage />);

    await waitFor(() => {
      expect(screen.getByText(/systems \(0\)/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/none yet\. add systems in view details for better task suggestions/i)
    ).toBeInTheDocument();
  });
});
