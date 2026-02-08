"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Material = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
};

type Tool = {
  name: string;
  owned: boolean;
  rentalCost: number;
  rentalDays: number;
  purchaseCost: number;
};

type CostEstimatorProps = {
  materials?: Material[];
  tools?: Tool[];
  permitFee?: number;
  disposalFee?: number;
  contingencyPercent?: number;
  onCostChange?: (total: number) => void;
};

export function CostEstimator({
  materials = [],
  tools = [],
  permitFee = 0,
  disposalFee = 0,
  contingencyPercent = 10,
  onCostChange,
}: CostEstimatorProps) {
  const [localMaterials, setLocalMaterials] = useState<Material[]>(materials);
  const [localTools, setLocalTools] = useState<Tool[]>(tools);
  const [localPermitFee, setLocalPermitFee] = useState(permitFee);
  const [localDisposalFee, setLocalDisposalFee] = useState(disposalFee);
  const [localContingency, setLocalContingency] = useState(contingencyPercent);

  useEffect(() => {
    if (materials.length > 0) {
      setLocalMaterials(materials);
    }
  }, [materials]);

  useEffect(() => {
    if (tools.length > 0) {
      setLocalTools(tools);
    }
  }, [tools]);

  const calculateMaterialCost = () => {
    return localMaterials.reduce((sum, material) => {
      const total = material.quantity * material.unitPrice;
      return sum + total;
    }, 0);
  };

  const calculateToolCost = () => {
    return localTools.reduce((sum, tool) => {
      if (tool.owned) {
        return sum;
      }
      if (tool.rentalCost && tool.rentalDays) {
        return sum + tool.rentalCost * tool.rentalDays;
      }
      if (tool.purchaseCost) {
        return sum + tool.purchaseCost;
      }
      return sum;
    }, 0);
  };

  const calculateSubtotal = () => {
    return (
      calculateMaterialCost() +
      calculateToolCost() +
      localPermitFee +
      localDisposalFee
    );
  };

  const calculateContingency = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * localContingency) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateContingency();
  };

  useEffect(() => {
    if (onCostChange) {
      onCostChange(calculateTotal());
    }
  }, [localMaterials, localTools, localPermitFee, localDisposalFee, localContingency]);

  const addMaterial = () => {
    setLocalMaterials([
      ...localMaterials,
      {
        name: "",
        quantity: 1,
        unit: "piece",
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const updateMaterial = (index: number, field: keyof Material, value: any) => {
    const updated = [...localMaterials];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      updated[index].totalPrice =
        updated[index].quantity * updated[index].unitPrice;
    }
    setLocalMaterials(updated);
  };

  const removeMaterial = (index: number) => {
    setLocalMaterials(localMaterials.filter((_, i) => i !== index));
  };

  const addTool = () => {
    setLocalTools([
      ...localTools,
      {
        name: "",
        owned: false,
        rentalCost: 0,
        rentalDays: 1,
        purchaseCost: 0,
      },
    ]);
  };

  const updateTool = (index: number, field: keyof Tool, value: any) => {
    const updated = [...localTools];
    updated[index] = { ...updated[index], [field]: value };
    setLocalTools(updated);
  };

  const removeTool = (index: number) => {
    setLocalTools(localTools.filter((_, i) => i !== index));
  };

  const materialCost = calculateMaterialCost();
  const toolCost = calculateToolCost();
  const subtotal = calculateSubtotal();
  const contingency = calculateContingency();
  const total = calculateTotal();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Estimator
          </CardTitle>
          <CardDescription>
            Calculate the total cost of your DIY project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Materials Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Materials</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                Add Material
              </Button>
            </div>
            <div className="space-y-3">
              {localMaterials.map((material, index) => (
                <div
                  key={index}
                  className="grid gap-3 md:grid-cols-5 p-3 border rounded-lg"
                >
                  <Input
                    placeholder="Material name"
                    value={material.name}
                    onChange={(e) =>
                      updateMaterial(index, "name", e.target.value)
                    }
                    className="md:col-span-2"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={material.quantity || ""}
                    onChange={(e) =>
                      updateMaterial(index, "quantity", parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                  />
                  <Input
                    placeholder="Unit"
                    value={material.unit}
                    onChange={(e) =>
                      updateMaterial(index, "unit", e.target.value)
                    }
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="$0.00"
                      value={material.unitPrice || ""}
                      onChange={(e) =>
                        updateMaterial(
                          index,
                          "unitPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.01"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              {localMaterials.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No materials added yet
                </p>
              )}
            </div>
            <div className="mt-2 text-right">
              <span className="text-sm text-muted-foreground">Subtotal: </span>
              <span className="font-semibold">${materialCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Tools Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Tools</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTool}>
                Add Tool
              </Button>
            </div>
            <div className="space-y-3">
              {localTools.map((tool, index) => (
                <div
                  key={index}
                  className="grid gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tool.owned}
                      onChange={(e) =>
                        updateTool(index, "owned", e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    <Label className="cursor-pointer">I own this tool</Label>
                  </div>
                  {!tool.owned && (
                    <div className="grid gap-3 md:grid-cols-4">
                      <Input
                        placeholder="Tool name"
                        value={tool.name}
                        onChange={(e) =>
                          updateTool(index, "name", e.target.value)
                        }
                        className="md:col-span-2"
                      />
                      <Input
                        type="number"
                        placeholder="Rental $/day"
                        value={tool.rentalCost || ""}
                        onChange={(e) =>
                          updateTool(
                            index,
                            "rentalCost",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.01"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Days"
                          value={tool.rentalDays || ""}
                          onChange={(e) =>
                            updateTool(
                              index,
                              "rentalDays",
                              parseInt(e.target.value) || 1
                            )
                          }
                          min="1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTool(index)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  )}
                  {!tool.owned && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Or purchase:</Label>
                      <Input
                        type="number"
                        placeholder="Purchase cost"
                        value={tool.purchaseCost || ""}
                        onChange={(e) =>
                          updateTool(
                            index,
                            "purchaseCost",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.01"
                        className="flex-1"
                      />
                    </div>
                  )}
                </div>
              ))}
              {localTools.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tools added yet
                </p>
              )}
            </div>
            <div className="mt-2 text-right">
              <span className="text-sm text-muted-foreground">Subtotal: </span>
              <span className="font-semibold">${toolCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Fees */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Permit Fee ($)</Label>
              <Input
                type="number"
                value={localPermitFee || ""}
                onChange={(e) =>
                  setLocalPermitFee(parseFloat(e.target.value) || 0)
                }
                min="0"
                step="0.01"
                className="w-32"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Disposal Fee ($)</Label>
              <Input
                type="number"
                value={localDisposalFee || ""}
                onChange={(e) =>
                  setLocalDisposalFee(parseFloat(e.target.value) || 0)
                }
                min="0"
                step="0.01"
                className="w-32"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Contingency (%)</Label>
              <Input
                type="number"
                value={localContingency || ""}
                onChange={(e) =>
                  setLocalContingency(parseFloat(e.target.value) || 10)
                }
                min="0"
                max="50"
                step="1"
                className="w-32"
              />
            </div>
          </div>

          {/* Cost Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Materials</span>
              <span>${materialCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tools</span>
              <span>${toolCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Permit Fee</span>
              <span>${localPermitFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Disposal Fee</span>
              <span>${localDisposalFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Contingency ({localContingency}%)
              </span>
              <span>${contingency.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Estimated Cost
              </span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          {total > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is an estimate. Actual costs may vary. Consider getting
                quotes from multiple vendors for materials.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

