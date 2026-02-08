"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Loader2 } from "lucide-react";

type Tool = {
  name: string;
  description: string;
  owned: boolean;
  rentalCost: number | null;
  rentalDays: number | null;
  purchaseCost: number | null;
};

type ProjectToolFormProps = {
  projectId: string;
  onToolAdded: () => void;
};

export function ProjectToolForm({
  projectId,
  onToolAdded,
}: ProjectToolFormProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(false);

  const checkToolOwnership = async (toolNames: string[]) => {
    if (toolNames.length === 0) return {};
    
    setCheckingOwnership(true);
    try {
      const response = await fetch("/api/tools/check-owned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toolNames }),
      });

      if (response.ok) {
        const data = await response.json();
        const ownershipMap: Record<string, boolean> = {};
        data.toolOwnership.forEach((item: any) => {
          ownershipMap[item.toolName.toLowerCase().trim()] = item.isOwned;
        });
        return ownershipMap;
      }
    } catch (error) {
      console.error("Error checking tool ownership:", error);
    } finally {
      setCheckingOwnership(false);
    }
    return {};
  };

  const addTool = () => {
    setTools([
      ...tools,
      {
        name: "",
        description: "",
        owned: false,
        rentalCost: null,
        rentalDays: 1,
        purchaseCost: null,
      },
    ]);
  };

  const updateTool = (index: number, field: keyof Tool, value: any) => {
    const updated = [...tools];
    updated[index] = { ...updated[index], [field]: value };
    setTools(updated);
  };

  const removeTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check ownership for all tools
      const toolNames = tools.map((t) => t.name).filter((n) => n.trim());
      const ownershipMap = await checkToolOwnership(toolNames);

      // Create all tools with ownership status
      for (const tool of tools) {
        const toolNameLower = tool.name.toLowerCase().trim();
        const isOwned = tool.owned || ownershipMap[toolNameLower] || false;

        await fetch(`/api/diy-projects/${projectId}/tools`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: tool.name,
            description: tool.description || undefined,
            owned: isOwned,
            rentalCost: tool.rentalCost || undefined,
            rentalDays: tool.rentalDays || undefined,
            purchaseCost: tool.purchaseCost || undefined,
          }),
        });
      }

      setTools([]);
      onToolAdded();
    } catch (error) {
      console.error("Error creating tools:", error);
      alert("Failed to create tools. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tools.length === 0) {
    return (
      <Button type="button" onClick={addTool} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Add Tool
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {tools.map((tool, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Tool {index + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTool(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label htmlFor={`tool-name-${index}`}>Tool Name *</Label>
                <Input
                  id={`tool-name-${index}`}
                  value={tool.name}
                  onChange={(e) =>
                    updateTool(index, "name", e.target.value)
                  }
                  placeholder="e.g., Paint Roller, Drill"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`tool-desc-${index}`}>Description</Label>
                <Input
                  id={`tool-desc-${index}`}
                  value={tool.description}
                  onChange={(e) =>
                    updateTool(index, "description", e.target.value)
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`tool-owned-${index}`}
                  checked={tool.owned}
                  onChange={(e) =>
                    updateTool(index, "owned", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor={`tool-owned-${index}`} className="cursor-pointer">
                  I own this tool
                </Label>
              </div>
              {!tool.owned && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`tool-rental-cost-${index}`}>
                      Rental Cost ($/day)
                    </Label>
                    <Input
                      id={`tool-rental-cost-${index}`}
                      type="number"
                      value={tool.rentalCost || ""}
                      onChange={(e) =>
                        updateTool(
                          index,
                          "rentalCost",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`tool-rental-days-${index}`}>
                      Rental Days
                    </Label>
                    <Input
                      id={`tool-rental-days-${index}`}
                      type="number"
                      value={tool.rentalDays || ""}
                      onChange={(e) =>
                        updateTool(
                          index,
                          "rentalDays",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`tool-purchase-cost-${index}`}>
                      Or Purchase Cost ($)
                    </Label>
                    <Input
                      id={`tool-purchase-cost-${index}`}
                      type="number"
                      value={tool.purchaseCost || ""}
                      onChange={(e) =>
                        updateTool(
                          index,
                          "purchaseCost",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addTool}
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Tool
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Tools"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTools([])}
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

