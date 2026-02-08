"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Loader2 } from "lucide-react";

type Step = {
  stepNumber: number;
  name: string;
  description: string;
  instructions: string;
  estimatedHours: number | null;
};

type ProjectStepFormProps = {
  projectId: string;
  existingSteps: Array<{
    id: string;
    stepNumber: number;
    name: string;
    description: string;
    instructions: string;
    estimatedHours: number | null;
    status: string;
  }>;
  onStepAdded: () => void;
};

export function ProjectStepForm({
  projectId,
  existingSteps,
  onStepAdded,
}: ProjectStepFormProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addStep = () => {
    const nextStepNumber =
      existingSteps.length > 0
        ? Math.max(...existingSteps.map((s) => s.stepNumber)) + steps.length + 1
        : steps.length + 1;

    setSteps([
      ...steps,
      {
        stepNumber: nextStepNumber,
        name: "",
        description: "",
        instructions: "",
        estimatedHours: null,
      },
    ]);
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create all steps
      for (const step of steps) {
        await fetch(`/api/diy-projects/${projectId}/steps`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stepNumber: step.stepNumber,
            name: step.name,
            description: step.description,
            instructions: step.instructions,
            estimatedHours: step.estimatedHours || undefined,
          }),
        });
      }

      setSteps([]);
      onStepAdded();
    } catch (error) {
      console.error("Error creating steps:", error);
      alert("Failed to create steps. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (steps.length === 0) {
    return (
      <Button type="button" onClick={addStep} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        Add Step
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Step {step.stepNumber}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label htmlFor={`step-name-${index}`}>Step Name *</Label>
                <Input
                  id={`step-name-${index}`}
                  value={step.name}
                  onChange={(e) =>
                    updateStep(index, "name", e.target.value)
                  }
                  placeholder="e.g., Prepare the surface"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`step-desc-${index}`}>Description</Label>
                <Input
                  id={`step-desc-${index}`}
                  value={step.description}
                  onChange={(e) =>
                    updateStep(index, "description", e.target.value)
                  }
                  placeholder="Brief description"
                />
              </div>
              <div>
                <Label htmlFor={`step-instructions-${index}`}>
                  Instructions *
                </Label>
                <Textarea
                  id={`step-instructions-${index}`}
                  value={step.instructions}
                  onChange={(e) =>
                    updateStep(index, "instructions", e.target.value)
                  }
                  placeholder="Detailed step-by-step instructions..."
                  rows={4}
                  required
                />
              </div>
              <div>
                <Label htmlFor={`step-hours-${index}`}>
                  Estimated Hours
                </Label>
                <Input
                  id={`step-hours-${index}`}
                  type="number"
                  value={step.estimatedHours || ""}
                  onChange={(e) =>
                    updateStep(
                      index,
                      "estimatedHours",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder="e.g., 2"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addStep}
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Step
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Steps"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSteps([])}
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

