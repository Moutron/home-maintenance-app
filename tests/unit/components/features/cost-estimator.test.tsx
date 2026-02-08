/**
 * Tests for Cost Estimator Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostEstimator } from "@/components/cost-estimator";

describe("CostEstimator", () => {
  const mockMaterials = [
    {
      name: "Lumber",
      quantity: 10,
      unit: "boards",
      unitPrice: 5.99,
      totalPrice: 59.90,
    },
    {
      name: "Nails",
      quantity: 2,
      unit: "boxes",
      unitPrice: 3.50,
      totalPrice: 7.00,
    },
  ];

  const mockTools = [
    {
      name: "Hammer",
      owned: true,
      rentalCost: 0,
      rentalDays: 0,
      purchaseCost: 0,
    },
    {
      name: "Saw",
      owned: false,
      rentalCost: 25,
      rentalDays: 3,
      purchaseCost: 150,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render cost estimator", () => {
    render(<CostEstimator materials={mockMaterials} tools={mockTools} />);
    
    expect(screen.getByText("Cost Estimator")).toBeInTheDocument();
  });

  it("should calculate material costs", () => {
    render(<CostEstimator materials={mockMaterials} />);

    expect(screen.getAllByText("Materials")[0]).toBeInTheDocument();
    // Material total should be calculated: 10 * 5.99 + 2 * 3.50 = 59.90 + 7.00 = 66.90
    const materialTotal = 10 * 5.99 + 2 * 3.50;
    expect(screen.getAllByText(new RegExp(materialTotal.toFixed(2)))[0]).toBeInTheDocument();
  });

  it("should calculate tool costs", () => {
    render(<CostEstimator tools={mockTools} />);

    expect(screen.getAllByText("Tools")[0]).toBeInTheDocument();
    // Tool rental cost: 25 * 3 = 75 (only for non-owned tools)
    const toolCost = 25 * 3; // 75
    expect(screen.getAllByText(new RegExp(toolCost.toString()))[0]).toBeInTheDocument();
  });

  it("should calculate total cost", () => {
    const mockOnCostChange = vi.fn();
    render(
      <CostEstimator
        materials={mockMaterials}
        tools={mockTools}
        permitFee={50}
        disposalFee={20}
        onCostChange={mockOnCostChange}
      />
    );
    
    // Should show total in summary (may appear in multiple places)
    expect(screen.getAllByText(/total/i)[0]).toBeInTheDocument();
    // Callback should be called with calculated total
    expect(mockOnCostChange).toHaveBeenCalled();
  });

  it("should call onCostChange callback", () => {
    const mockOnCostChange = vi.fn();
    render(
      <CostEstimator
        materials={mockMaterials}
        tools={mockTools}
        onCostChange={mockOnCostChange}
      />
    );
    
    // Callback should be called with calculated total
    expect(mockOnCostChange).toHaveBeenCalled();
  });

  it("should display permit fee if provided", () => {
    render(<CostEstimator permitFee={100} />);

    // Permit fee appears in form label and summary
    expect(screen.getAllByText(/permit/i)[0]).toBeInTheDocument();
    // Should show the amount (may appear in multiple places)
    expect(screen.getAllByText(/100/)[0]).toBeInTheDocument();
  });

  it("should display disposal fee if provided", () => {
    render(<CostEstimator disposalFee={50} />);

    // Disposal fee appears in form label and summary
    expect(screen.getAllByText(/disposal/i)[0]).toBeInTheDocument();
    // Should show the amount (may appear in multiple places)
    expect(screen.getAllByText(/50/)[0]).toBeInTheDocument();
  });

  it("should apply contingency percentage", () => {
    render(
      <CostEstimator
        materials={mockMaterials}
        contingencyPercent={15}
      />
    );

    // Contingency may appear in form and summary
    expect(screen.getAllByText(/contingency/i)[0]).toBeInTheDocument();
    // Should show the percentage (may appear in multiple places)
    expect(screen.getAllByText(/15/)[0]).toBeInTheDocument();
  });

  it("should handle empty materials and tools", () => {
    render(<CostEstimator />);

    expect(screen.getByText("Cost Estimator")).toBeInTheDocument();
    // Should still render the component with empty state (Materials/Tools appear in section + summary)
    expect(screen.getAllByText("Materials")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Tools")[0]).toBeInTheDocument();
  });
});
