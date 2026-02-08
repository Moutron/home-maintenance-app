"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Loader2 } from "lucide-react";

type Material = {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  vendor: string;
  vendorUrl: string;
};

type ProjectMaterialFormProps = {
  projectId: string;
  onMaterialAdded: () => void;
};

export function ProjectMaterialForm({
  projectId,
  onMaterialAdded,
}: ProjectMaterialFormProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addMaterial = () => {
    setMaterials([
      ...materials,
      {
        name: "",
        description: "",
        quantity: 1,
        unit: "piece",
        unitPrice: null,
        vendor: "",
        vendorUrl: "",
      },
    ]);
  };

  const updateMaterial = (
    index: number,
    field: keyof Material,
    value: any
  ) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create all materials
      for (const material of materials) {
        await fetch(`/api/diy-projects/${projectId}/materials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: material.name,
            description: material.description || undefined,
            quantity: material.quantity,
            unit: material.unit,
            unitPrice: material.unitPrice || undefined,
            vendor: material.vendor || undefined,
            vendorUrl: material.vendorUrl || undefined,
          }),
        });
      }

      setMaterials([]);
      onMaterialAdded();
    } catch (error) {
      console.error("Error creating materials:", error);
      alert("Failed to create materials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (materials.length === 0) {
    return (
      <Button type="button" onClick={addMaterial} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Add Material
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Materials</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {materials.map((material, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Material {index + 1}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMaterial(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor={`material-name-${index}`}>
                    Material Name *
                  </Label>
                  <Input
                    id={`material-name-${index}`}
                    value={material.name}
                    onChange={(e) =>
                      updateMaterial(index, "name", e.target.value)
                    }
                    placeholder="e.g., Paint, Primer"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`material-desc-${index}`}>Description</Label>
                  <Input
                    id={`material-desc-${index}`}
                    value={material.description}
                    onChange={(e) =>
                      updateMaterial(index, "description", e.target.value)
                    }
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <Label htmlFor={`material-qty-${index}`}>Quantity *</Label>
                  <Input
                    id={`material-qty-${index}`}
                    type="number"
                    value={material.quantity || ""}
                    onChange={(e) =>
                      updateMaterial(
                        index,
                        "quantity",
                        parseFloat(e.target.value) || 1
                      )
                    }
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`material-unit-${index}`}>Unit *</Label>
                  <Input
                    id={`material-unit-${index}`}
                    value={material.unit}
                    onChange={(e) =>
                      updateMaterial(index, "unit", e.target.value)
                    }
                    placeholder="e.g., gallon, sq ft, pieces"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`material-price-${index}`}>
                    Unit Price ($)
                  </Label>
                  <Input
                    id={`material-price-${index}`}
                    type="number"
                    value={material.unitPrice || ""}
                    onChange={(e) =>
                      updateMaterial(
                        index,
                        "unitPrice",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor={`material-vendor-${index}`}>Vendor</Label>
                  <Input
                    id={`material-vendor-${index}`}
                    value={material.vendor}
                    onChange={(e) =>
                      updateMaterial(index, "vendor", e.target.value)
                    }
                    placeholder="e.g., Home Depot"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`material-url-${index}`}>Vendor URL</Label>
                <Input
                  id={`material-url-${index}`}
                  type="url"
                  value={material.vendorUrl}
                  onChange={(e) =>
                    updateMaterial(index, "vendorUrl", e.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addMaterial}
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Material
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Materials"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMaterials([])}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

