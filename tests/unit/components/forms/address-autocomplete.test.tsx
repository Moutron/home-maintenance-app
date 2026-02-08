/**
 * Tests for Address Autocomplete Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddressAutocomplete } from "@/components/address-autocomplete";

const mockSearchAddresses = vi.fn();
const mockParseAddressComponents = vi.fn();

vi.mock("@/lib/utils/geocoding", () => ({
  searchAddresses: (...args: unknown[]) => mockSearchAddresses(...args),
  parseAddressComponents: (...args: unknown[]) => mockParseAddressComponents(...args),
}));

const mockGeocodeResults = [
  {
    display_name: "123 Main St, San Francisco, CA 94102",
    address: {
      house_number: "123",
      road: "Main St",
      city: "San Francisco",
      state: "CA",
      postcode: "94102",
      country: "US",
    },
  },
];

const mockGetPlacePredictions = vi.fn();
const mockGetDetails = vi.fn();

function createGoogleMapsMock() {
  const places = {
    AutocompleteService: vi.fn().mockImplementation(() => ({
      getPlacePredictions: mockGetPlacePredictions,
    })),
    PlacesService: vi.fn().mockImplementation(() => ({
      getDetails: mockGetDetails,
    })),
    PlacesServiceStatus: { OK: "OK" },
  };
  return {
    maps: { places },
    places, // component checks window.google?.places
  };
}

describe("AddressAutocomplete", () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    value: "",
    onChange: mockOnChange,
    placeholder: "Enter address",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).google;
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = "";

    mockSearchAddresses.mockResolvedValue(mockGeocodeResults);
    mockParseAddressComponents.mockReturnValue({
      address: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
    });
  });

  afterEach(() => {
    delete (window as any).google;
  });

  it("should render input field", () => {
    render(<AddressAutocomplete {...defaultProps} />);
    const input = screen.getByPlaceholderText("Enter address");
    expect(input).toBeInTheDocument();
  });

  it("should call onChange when address is selected", async () => {
    const user = userEvent.setup();
    render(<AddressAutocomplete {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter address");
    fireEvent.change(input, { target: { value: "123 Main St" } });

    await waitFor(
      () => {
        expect(mockSearchAddresses).toHaveBeenCalledWith("123 Main St", 5);
      },
      { timeout: 3000 }
    );

    const suggestion = await screen.findByText(/123 Main St, San Francisco/);
    await user.click(suggestion);

    expect(mockOnChange).toHaveBeenCalledWith(
      "123 Main St",
      expect.objectContaining({
        address: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zipCode: "94102",
      })
    );
  }, 10000);

  it("should use Google Places API when available", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = "test-key";
    (window as any).google = createGoogleMapsMock();
    mockGetPlacePredictions.mockImplementation((_req: unknown, callback: (predictions: unknown[], status: string) => void) => {
      callback(
        [
          {
            description: "123 Main St, San Francisco, CA",
            place_id: "place_123",
          },
        ],
        "OK"
      );
    });

    render(<AddressAutocomplete {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter address");
    fireEvent.change(input, { target: { value: "123 Main" } });

    await waitFor(
      () => {
        expect(mockGetPlacePredictions).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  }, 10000);

  it("should fallback to geocoding API when Google Places unavailable", async () => {
    render(<AddressAutocomplete {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter address");
    fireEvent.change(input, { target: { value: "123 Main St" } });

    await waitFor(
      () => {
        expect(mockSearchAddresses).toHaveBeenCalledWith("123 Main St", 5);
      },
      { timeout: 3000 }
    );
  }, 10000);

  it("should not search with less than 3 characters", async () => {
    const user = userEvent.setup();
    render(<AddressAutocomplete {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter address");
    await user.type(input, "12");

    await new Promise((r) => setTimeout(r, 400));

    expect(mockSearchAddresses).not.toHaveBeenCalled();
  }, 5000);

  it("should handle disabled state", () => {
    render(<AddressAutocomplete {...defaultProps} disabled />);
    const input = screen.getByPlaceholderText("Enter address");
    expect(input).toBeDisabled();
  });

  it("should display loading state", async () => {
    mockSearchAddresses.mockImplementation(() => new Promise(() => {}));

    render(<AddressAutocomplete {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter address");
    fireEvent.change(input, { target: { value: "123 Main St" } });

    await waitFor(
      () => {
        const hasSpinner = document.querySelector(".animate-spin");
        expect(hasSpinner).toBeTruthy();
      },
      { timeout: 2000 }
    );
  }, 5000);

  it("should handle API errors gracefully", async () => {
    mockSearchAddresses.mockRejectedValueOnce(new Error("API error"));

    render(<AddressAutocomplete {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter address");
    fireEvent.change(input, { target: { value: "123 Main St" } });

    await waitFor(
      () => {
        expect(mockSearchAddresses).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    expect(input).toBeInTheDocument();
  }, 5000);
});
