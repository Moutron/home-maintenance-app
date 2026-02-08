"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ProjectPlan = {
  name: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
  permitRequired: boolean;
  permitInfo?: string;
  safetyNotes?: string;
  steps: Array<{
    stepNumber: number;
    name: string;
    description: string;
    instructions: string;
    estimatedHours?: number;
  }>;
  materials: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    vendor?: string;
  }>;
  tools: Array<{
    name: string;
    description?: string;
    owned: boolean;
    rentalCost?: number;
    rentalDays?: number;
    purchaseCost?: number;
  }>;
  commonMistakes?: string[];
};

type AiProjectGeneratorProps = {
  homeContext?: {
    yearBuilt?: number;
    homeType?: string;
    squareFootage?: number;
    location?: string;
  };
  onPlanGenerated: (plan: ProjectPlan) => void;
};

export function AiProjectGenerator({
  homeContext,
  onPlanGenerated,
}: AiProjectGeneratorProps) {
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<ProjectPlan | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please enter a project description");
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedPlan(null);

    try {
      const response = await fetch("/api/diy-projects/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectDescription: description,
          homeContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate plan");
      }

      const data = await response.json();
      setGeneratedPlan(data.plan);
    } catch (err: any) {
      console.error("Error generating plan:", err);
      setError(err.message || "Failed to generate project plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUsePlan = () => {
    if (generatedPlan) {
      onPlanGenerated(generatedPlan);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Project Plan Generator
        </CardTitle>
        <CardDescription>
          Describe your DIY project and AI will generate a complete plan with steps, materials, and tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="project-description">Project Description</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., I want to paint my living room walls, install new baseboards, and replace the ceiling light fixture..."
            rows={4}
            disabled={generating}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Be as detailed as possible for better results
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating || !description.trim()}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Project Plan
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {generatedPlan && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Plan Generated Successfully!</p>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Project:</strong> {generatedPlan.name}
                  </p>
                  <p>
                    <strong>Category:</strong> {generatedPlan.category} |{" "}
                    <strong>Difficulty:</strong> {generatedPlan.difficulty}
                  </p>
                  <p>
                    <strong>Time:</strong> ~{generatedPlan.estimatedHours} hours |{" "}
                    <strong>Cost:</strong> ${generatedPlan.estimatedCostMin} - $
                    {generatedPlan.estimatedCostMax}
                  </p>
                  <p>
                    <strong>Steps:</strong> {generatedPlan.steps.length} |{" "}
                    <strong>Materials:</strong> {generatedPlan.materials.length} |{" "}
                    <strong>Tools:</strong> {generatedPlan.tools.length}
                  </p>
                </div>
                <Button onClick={handleUsePlan} className="mt-2" size="sm">
                  Use This Plan
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

