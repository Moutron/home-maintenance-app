"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { AiProjectGenerator } from "@/components/ai-project-generator";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [homes, setHomes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    difficulty: "",
    homeId: "",
    estimatedHours: "",
    estimatedCost: "",
    budget: "",
    permitRequired: false,
    permitInfo: "",
  });

  useEffect(() => {
    fetchHomes();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        setFormData({
          ...formData,
          name: template.name,
          description: template.description,
          category: template.category,
          difficulty: template.difficulty,
          estimatedHours: template.estimatedHours?.toString() || "",
          estimatedCost: template.estimatedCostMax?.toString() || "",
        });
      }
    }
  }, [selectedTemplate]);

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes");
      if (response.ok) {
        const data = await response.json();
        setHomes(data.homes || []);
        if (data.homes?.length === 1) {
          const home = data.homes[0];
          setSelectedHome(home);
          setFormData({ ...formData, homeId: home.id });
        }
      }
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const handleAiPlanGenerated = (plan: any) => {
    // Populate form with AI-generated plan
    setFormData({
      ...formData,
      name: plan.name,
      description: plan.description,
      category: plan.category,
      difficulty: plan.difficulty,
      estimatedHours: plan.estimatedHours?.toString() || "",
      estimatedCost: plan.estimatedCostMax?.toString() || "",
      budget: plan.estimatedCostMax?.toString() || "",
      permitRequired: plan.permitRequired || false,
      permitInfo: plan.permitInfo || "",
    });

    // Store the full plan for later use (steps, materials, tools)
    (window as any).__aiGeneratedPlan = plan;
    
    setShowAiGenerator(false);
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/diy-projects/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        difficulty: formData.difficulty,
        homeId: formData.homeId,
        estimatedHours: formData.estimatedHours
          ? parseInt(formData.estimatedHours)
          : undefined,
        estimatedCost: formData.estimatedCost
          ? parseFloat(formData.estimatedCost)
          : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        permitRequired: formData.permitRequired,
        permitInfo: formData.permitInfo || undefined,
        templateId: selectedTemplate || undefined,
      };

      const response = await fetch("/api/diy-projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const projectId = data.project.id;
        
        // If AI plan was generated, create steps, materials, and tools
        const aiPlan = (window as any).__aiGeneratedPlan;
        if (aiPlan) {
          try {
            // Create steps
            for (const step of aiPlan.steps || []) {
              await fetch(`/api/diy-projects/${projectId}/steps`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  stepNumber: step.stepNumber,
                  name: step.name,
                  description: step.description,
                  instructions: step.instructions,
                  estimatedHours: step.estimatedHours,
                }),
              });
            }

            // Create materials
            for (const material of aiPlan.materials || []) {
              await fetch(`/api/diy-projects/${projectId}/materials`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: material.name,
                  description: material.description,
                  quantity: material.quantity,
                  unit: material.unit,
                  unitPrice: material.unitPrice,
                  vendor: material.vendor,
                }),
              });
            }

            // Check tool ownership before creating tools
            const toolNames = (aiPlan.tools || []).map((t: any) => t.name);
            let ownershipMap: Record<string, boolean> = {};
            
            if (toolNames.length > 0) {
              try {
                const ownershipResponse = await fetch("/api/tools/check-owned", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ toolNames }),
                });
                if (ownershipResponse.ok) {
                  const ownershipData = await ownershipResponse.json();
                  ownershipData.toolOwnership.forEach((item: any) => {
                    ownershipMap[item.toolName.toLowerCase().trim()] = item.isOwned;
                  });
                }
              } catch (error) {
                console.error("Error checking tool ownership:", error);
              }
            }

            // Create tools with ownership status
            for (const tool of aiPlan.tools || []) {
              const toolNameLower = tool.name.toLowerCase().trim();
              const isOwned = tool.owned || ownershipMap[toolNameLower] || false;

              await fetch(`/api/diy-projects/${projectId}/tools`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: tool.name,
                  description: tool.description,
                  owned: isOwned,
                  rentalCost: tool.rentalCost,
                  rentalDays: tool.rentalDays,
                  purchaseCost: tool.purchaseCost,
                }),
              });
            }

            // Clear the stored plan
            delete (window as any).__aiGeneratedPlan;
          } catch (error) {
            console.error("Error creating AI-generated items:", error);
            // Continue anyway - project was created successfully
          }
        }
        
        router.push(`/diy-projects/${projectId}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to create project"}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/diy-projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground mt-1">
            Start a new DIY project or use a template
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Generator */}
        {showAiGenerator && (
          <AiProjectGenerator
            homeContext={
              selectedHome
                ? {
                    yearBuilt: selectedHome.yearBuilt,
                    homeType: selectedHome.homeType,
                    squareFootage: selectedHome.squareFootage,
                    location: `${selectedHome.city}, ${selectedHome.state}`,
                  }
                : undefined
            }
            onPlanGenerated={handleAiPlanGenerated}
          />
        )}

        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Start from Template or AI (Optional)</CardTitle>
            <CardDescription>
              Use AI to generate a complete plan, choose a pre-built template, or start from scratch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={showAiGenerator ? "default" : "outline"}
                onClick={() => setShowAiGenerator(!showAiGenerator)}
                className="flex-1"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {showAiGenerator ? "Hide AI Generator" : "Use AI Generator"}
              </Button>
            </div>
            {!showAiGenerator && (
              <div>
                <Label htmlFor="template">Project Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None - Start from scratch</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.difficulty}) - {template.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Provide basic details about your project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="homeId">Home *</Label>
              <Select
                value={formData.homeId}
                onValueChange={(value) => {
                  const home = homes.find((h) => h.id === value);
                  setSelectedHome(home);
                  setFormData({ ...formData, homeId: value });
                }}
                required
              >
                <SelectTrigger id="homeId">
                  <SelectValue placeholder="Select a home" />
                </SelectTrigger>
                <SelectContent>
                  {homes.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.address}, {home.city}, {home.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Paint Living Room"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your project..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="PLUMBING">PLUMBING</SelectItem>
                    <SelectItem value="ELECTRICAL">ELECTRICAL</SelectItem>
                    <SelectItem value="EXTERIOR">EXTERIOR</SelectItem>
                    <SelectItem value="INTERIOR">INTERIOR</SelectItem>
                    <SelectItem value="LANDSCAPING">LANDSCAPING</SelectItem>
                    <SelectItem value="APPLIANCE">APPLIANCE</SelectItem>
                    <SelectItem value="STRUCTURAL">STRUCTURAL</SelectItem>
                    <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty Level *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    setFormData({ ...formData, difficulty: value })
                  }
                  required
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estimates */}
        <Card>
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
            <CardDescription>
              Provide time and cost estimates (can be updated later)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedHours: e.target.value })
                  }
                  placeholder="e.g., 8"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  value={formData.estimatedCost}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedCost: e.target.value })
                  }
                  placeholder="e.g., 200"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="e.g., 250"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permits */}
        <Card>
          <CardHeader>
            <CardTitle>Permits</CardTitle>
            <CardDescription>
              Information about required permits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="permitRequired"
                checked={formData.permitRequired}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    permitRequired: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="permitRequired" className="cursor-pointer">
                Permit required for this project
              </Label>
            </div>

            {formData.permitRequired && (
              <div>
                <Label htmlFor="permitInfo">Permit Information</Label>
                <Textarea
                  id="permitInfo"
                  value={formData.permitInfo}
                  onChange={(e) =>
                    setFormData({ ...formData, permitInfo: e.target.value })
                  }
                  placeholder="Describe permit requirements..."
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link href="/diy-projects">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

