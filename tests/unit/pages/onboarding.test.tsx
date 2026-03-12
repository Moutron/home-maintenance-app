/**
 * Tests for Onboarding Page
 * - Step 1: Basic info (required) — address, year/type, More options (square footage, lot size)
 * - Step 2: Weather & Climate (required)
 * - Step 3: Systems (optional) — selection grid then system-details wizard
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingPage from "@/app/(dashboard)/onboarding/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Avoid Google/geocoding and complex behavior in tests
vi.mock("@/components/address-autocomplete", () => ({
  AddressAutocomplete: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (address: string, components: { address: string; city: string; state: string; zipCode: string }) => void;
  }) => (
    <input
      data-testid="address-input"
      value={value}
      onChange={(e) =>
        onChange(e.target.value, {
          address: e.target.value,
          city: "Test City",
          state: "CA",
          zipCode: "90210",
        })
      }
      placeholder="Start typing your address..."
    />
  ),
}));

// Avoid file upload and AI analysis in tests
vi.mock("@/components/system-photo-upload", () => ({
  SystemPhotoUpload: () => <div data-testid="system-photo-upload-mock" />,
}));

// Optional: avoid property summary rendering
vi.mock("@/components/property-summary-card", () => ({
  PropertySummaryCard: () => null,
}));

const mockFetch = vi.fn();

function createJsonResponse(body: object, ok = true) {
  return {
    ok,
    json: async () => body,
    status: ok ? 200 : 400,
  } as Response;
}

describe("Onboarding Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string | URL, init?: RequestInit) => {
      const path = typeof url === "string" ? url : url.toString();
      if (path.includes("/api/homes") && path.includes("/systems") && init?.method === "POST") {
        return Promise.resolve(createJsonResponse({ success: true }));
      }
      if (path === "/api/homes" && init?.method === "POST") {
        return Promise.resolve(createJsonResponse({ home: { id: "home-1" } }));
      }
      if (path.includes("/api/climate/lookup")) {
        return Promise.resolve(createJsonResponse({ success: false }));
      }
      return Promise.resolve(createJsonResponse({}, false));
    });
    global.fetch = mockFetch;
  });

  it("renders step 1 by default", () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/Welcome! Let's set up your home/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to Weather & Climate/i })).toBeInTheDocument();
    expect(screen.getByText(/Basic Info/i)).toBeInTheDocument();
    expect(screen.getByText(/^Weather$/)).toBeInTheDocument();
    expect(screen.getByText(/Systems \(Optional\)/i)).toBeInTheDocument();
  });

  it("Step 1 shows compact layout with More options accordion (no climate)", () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/More options \(square footage, lot size\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Auto-fill from Zillow\/Redfin/i })).toBeInTheDocument();
  });

  it("shows Step 2 Weather after Step 1", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const addressInput = screen.getByTestId("address-input");
    await user.type(addressInput, "123 Main St");
    await user.type(screen.getByLabelText(/City/i), "Test City");
    await user.type(screen.getByLabelText(/State/i), "CA");
    await user.type(screen.getByLabelText(/^ZIP$/i), "90210");
    const yearInput = screen.getByLabelText(/Year Built/i);
    await user.clear(yearInput);
    await user.type(yearInput, "2000");

    await user.click(screen.getByRole("button", { name: /Continue to Weather & Climate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Climate & Storm/i)).toBeInTheDocument();
      expect(screen.getByText(/Storm Frequency/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Continue to Systems \(Optional\)/i })).toBeInTheDocument();
    });
  });

  it("navigates to Step 3 wizard after completing step 1, step 2 (weather), and step 3 with one system", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const addressInput = screen.getByTestId("address-input");
    await user.type(addressInput, "123 Main St");
    await user.type(screen.getByLabelText(/City/i), "Test City");
    await user.type(screen.getByLabelText(/State/i), "CA");
    await user.type(screen.getByLabelText(/^ZIP$/i), "90210");
    const yearInput = screen.getByLabelText(/Year Built/i);
    await user.clear(yearInput);
    await user.type(yearInput, "2000");

    await user.click(screen.getByRole("button", { name: /Continue to Weather & Climate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Climate & Storm/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Continue to Systems \(Optional\)/i }));

    await waitFor(() => {
      expect(screen.getByText(/Add systems.*optional/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText("Hvac"));
    await user.click(screen.getByRole("button", { name: /Add details for selected/i }));
    await waitFor(() => {
      expect(screen.getByTestId("system-details-wizard")).toBeInTheDocument();
    });

    expect(screen.getByTestId("wizard-system-count")).toHaveTextContent("System 1 of 1");
    expect(screen.getByRole("button", { name: /Add Systems & Finish/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skip all/i })).toBeInTheDocument();
  });

  it("Step 3 wizard shows progress and Next/Previous for multiple systems", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const addressInput = screen.getByTestId("address-input");
    await user.type(addressInput, "123 Main St");
    await user.type(screen.getByLabelText(/City/i), "Test City");
    await user.type(screen.getByLabelText(/State/i), "CA");
    await user.type(screen.getByLabelText(/^ZIP$/i), "90210");
    const yearInput = screen.getByLabelText(/Year Built/i);
    await user.clear(yearInput);
    await user.type(yearInput, "2000");

    await user.click(screen.getByRole("button", { name: /Continue to Weather & Climate/i }));
    await waitFor(() => {
      expect(screen.getByText(/Climate & Storm/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Continue to Systems \(Optional\)/i }));

    await waitFor(() => {
      expect(screen.getByText(/Add systems.*optional/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText("Hvac"));
    await user.click(screen.getByText("Roof"));
    await user.click(screen.getByRole("button", { name: /Add details for selected/i }));

    await waitFor(() => {
      expect(screen.getByTestId("system-details-wizard")).toBeInTheDocument();
    });

    expect(screen.getByTestId("wizard-system-count")).toHaveTextContent("System 1 of 2");
    expect(screen.getByRole("button", { name: /Next system/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Next system/i }));

    await waitFor(() => {
      expect(screen.getByTestId("wizard-system-count")).toHaveTextContent("System 2 of 2");
    });
    expect(screen.getByRole("button", { name: /Add Systems & Finish/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous system/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Previous system/i }));

    await waitFor(() => {
      expect(screen.getByTestId("wizard-system-count")).toHaveTextContent("System 1 of 2");
    });
    expect(screen.getByRole("button", { name: /Next system/i })).toBeInTheDocument();
  });

  it("Step 3 shows completion guidance text", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const addressInput = screen.getByTestId("address-input");
    await user.type(addressInput, "123 Main St");
    await user.type(screen.getByLabelText(/City/i), "Test City");
    await user.type(screen.getByLabelText(/State/i), "CA");
    await user.type(screen.getByLabelText(/^ZIP$/i), "90210");
    const yearInput = screen.getByLabelText(/Year Built/i);
    await user.clear(yearInput);
    await user.type(yearInput, "2000");

    await user.click(screen.getByRole("button", { name: /Continue to Weather & Climate/i }));
    await waitFor(() => {
      expect(screen.getByText(/Climate & Storm/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Continue to Systems \(Optional\)/i }));

    await waitFor(() => {
      expect(screen.getByText(/Add systems.*optional/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText("Hvac"));
    await user.click(screen.getByRole("button", { name: /Add details for selected/i }));

    await waitFor(() => {
      expect(screen.getByTestId("system-details-wizard")).toBeInTheDocument();
    });

    expect(screen.getByText(/Add as much detail as you like/i)).toBeInTheDocument();
    expect(screen.getByText(/Add details for this system/i)).toBeInTheDocument();
  });
});
