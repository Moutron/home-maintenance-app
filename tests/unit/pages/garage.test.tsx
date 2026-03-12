/**
 * Tests for Garage Page (My Garage feature)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import GaragePage from "@/app/(dashboard)/garage/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

global.fetch = vi.fn();

describe("Garage Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ vehicles: [] }),
    } as Response);
  });

  it("should render garage page with title", async () => {
    render(<GaragePage />);

    await waitFor(() => {
      expect(screen.getByText("My Garage")).toBeInTheDocument();
    });
  });

  it("should show empty state when user has no vehicles", async () => {
    render(<GaragePage />);

    await waitFor(() => {
      expect(screen.getByText("No vehicles yet")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /add your first vehicle/i })).toBeInTheDocument();
  });

  it("should show Add Vehicle button in header", async () => {
    render(<GaragePage />);

    await waitFor(() => {
      expect(screen.getByText("My Garage")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /add vehicle/i })).toBeInTheDocument();
  });

  it("should display vehicle list when vehicles exist", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vehicles: [
          {
            id: "v1",
            nickname: "Daily driver",
            year: 2020,
            make: "Honda",
            model: "Civic",
            trim: null,
            vin: null,
            currentMileage: 35000,
            purchaseDate: null,
          },
        ],
      }),
    } as Response);

    render(<GaragePage />);

    await waitFor(() => {
      expect(screen.getByText("Daily driver")).toBeInTheDocument();
    });
    expect(screen.getByText(/2020 Honda Civic/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view tasks/i })).toBeInTheDocument();
  });

  it("should show Map your maintenance and footer buttons", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vehicles: [
          {
            id: "v1",
            nickname: null,
            year: 2020,
            make: "Honda",
            model: "Civic",
            trim: null,
            vin: null,
            currentMileage: null,
            purchaseDate: null,
          },
        ],
      }),
    } as Response);

    render(<GaragePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /map your maintenance/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /from templates/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("should show vehicle details grid (Year, Make, Model, Mileage, VIN)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vehicles: [
          {
            id: "v1",
            nickname: null,
            year: 2019,
            make: "Toyota",
            model: "Camry",
            trim: null,
            vin: null,
            currentMileage: 50000,
            purchaseDate: "2019-06-01",
          },
        ],
      }),
    } as Response);

    render(<GaragePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /map your maintenance/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Year:")).toBeInTheDocument();
    expect(screen.getByText("Make:")).toBeInTheDocument();
    expect(screen.getByText("Model:")).toBeInTheDocument();
    expect(screen.getByText("Mileage:")).toBeInTheDocument();
    expect(screen.getByText("VIN:")).toBeInTheDocument();
  });

  it("should show optional details note", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        vehicles: [
          {
            id: "v1",
            nickname: null,
            year: 2020,
            make: "Honda",
            model: "Civic",
            trim: null,
            vin: null,
            currentMileage: null,
            purchaseDate: null,
          },
        ],
      }),
    } as Response);

    render(<GaragePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/optional details \(nickname, mileage, vin\) can be added when adding or editing the vehicle/i)
      ).toBeInTheDocument();
    });
  });
});
