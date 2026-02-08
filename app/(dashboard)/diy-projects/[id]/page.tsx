"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, CheckCircle2, Circle, Clock, DollarSign, AlertTriangle, Trophy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { CostEstimator } from "@/components/cost-estimator";
import { ProjectStepForm } from "@/components/project-step-form";
import { ProjectMaterialForm } from "@/components/project-material-form";
import { ProjectToolForm } from "@/components/project-tool-form";
import { ProjectPhotoUpload } from "@/components/project-photo-upload";
import { StepStatusButton } from "@/components/step-status-button";

type Project = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  difficulty: string;
  estimatedHours: number | null;
  actualHours: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  budget: number | null;
  targetStartDate: string | null;
  targetEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  permitRequired: boolean;
  permitInfo: string | null;
  satisfactionRating: number | null;
  wouldDoAgain: boolean | null;
  notes: string | null;
  lessonsLearned: string | null;
  createdAt: string;
  home: {
    id: string;
    address: string;
    city: string;
    state: string;
  };
  template: {
    id: string;
    name: string;
    difficulty: string;
    videoUrl: string | null;
    guideUrl: string | null;
    safetyNotes: string | null;
  } | null;
  steps: Array<{
    id: string;
    stepNumber: number;
    name: string;
    description: string;
    instructions: string;
    estimatedHours: number | null;
    actualHours: number | null;
    status: string;
    completedAt: string | null;
  }>;
  materials: Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    unitPrice: number | null;
    totalPrice: number | null;
    vendor: string | null;
    vendorUrl: string | null;
    purchased: boolean;
  }>;
  tools: Array<{
    id: string;
    name: string;
    description: string | null;
    owned: boolean;
    rentalCost: number | null;
    rentalDays: number | null;
    purchaseCost: number | null;
    purchased: boolean;
  }>;
  photos: Array<{
    id: string;
    url: string;
    caption: string | null;
    isBefore: boolean;
    isAfter: boolean;
    uploadedAt: string;
  }>;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [completingProject, setCompletingProject] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [wouldDoAgain, setWouldDoAgain] = useState<boolean | null>(null);
  const [lessonsLearned, setLessonsLearned] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchProject();
    }
  }, [params.id]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/diy-projects/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      } else {
        router.push("/diy-projects");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      router.push("/diy-projects");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "PLANNING":
        return "bg-yellow-100 text-yellow-800";
      case "ON_HOLD":
        return "bg-orange-100 text-orange-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HARD":
        return "bg-orange-100 text-orange-800";
      case "EXPERT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateProgress = () => {
    if (!project || project.steps.length === 0) return 0;
    const completed = project.steps.filter(
      (step) => step.status === "completed"
    ).length;
    return Math.round((completed / project.steps.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">Project not found</p>
        <Link href="/diy-projects">
          <Button className="mt-4">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const progress = calculateProgress();

  const handleCompleteProject = async () => {
    if (!project) return;

    setCompletingProject(true);
    try {
      const allStepsCompleted = project.steps.every(
        (step) => step.status === "completed"
      );

      if (!allStepsCompleted && project.steps.length > 0) {
        const confirm = window.confirm(
          "Not all steps are completed. Do you want to mark the project as completed anyway?"
        );
        if (!confirm) {
          setCompletingProject(false);
          return;
        }
      }

      const response = await fetch(`/api/diy-projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "COMPLETED",
          actualEndDate: new Date().toISOString(),
          satisfactionRating: satisfactionRating || undefined,
          wouldDoAgain: wouldDoAgain !== null ? wouldDoAgain : undefined,
          lessonsLearned: lessonsLearned || undefined,
          notes: completionNotes || project.notes || undefined,
        }),
      });

      if (response.ok) {
        fetchProject();
        setCompletingProject(false);
        setCompletionNotes("");
        setLessonsLearned("");
        setSatisfactionRating(null);
        setWouldDoAgain(null);
      } else {
        throw new Error("Failed to complete project");
      }
    } catch (error) {
      console.error("Error completing project:", error);
      alert("Failed to complete project. Please try again.");
      setCompletingProject(false);
    }
  };

  const calculateActualCost = () => {
    if (!project) return 0;
    let total = 0;

    // Add material costs
    project.materials.forEach((material) => {
      if (material.purchased && material.totalPrice) {
        total += material.totalPrice;
      }
    });

    // Add tool costs
    project.tools.forEach((tool) => {
      if (!tool.owned) {
        if (tool.purchased && tool.purchaseCost) {
          total += tool.purchaseCost;
        } else if (tool.rentalCost && tool.rentalDays) {
          total += tool.rentalCost * tool.rentalDays;
        }
      }
    });

    return total;
  };

  const actualCost = calculateActualCost();
  const budgetAlert = project.budget && actualCost > project.budget;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/diy-projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground mt-1">
              {project.home.address}, {project.home.city}, {project.home.state}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(project.status)}>
            {project.status.replace("_", " ")}
          </Badge>
          <Badge className={getDifficultyColor(project.difficulty)}>
            {project.difficulty}
          </Badge>
          {project.status !== "COMPLETED" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Trophy className="mr-2 h-4 w-4" />
                  Complete Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete Project</DialogTitle>
                  <DialogDescription>
                    Mark this project as completed and share your experience
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Final Notes</Label>
                    <Textarea
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="Add any final notes about the project..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Satisfaction Rating (1-5)</Label>
                    <Select
                      value={satisfactionRating?.toString() || ""}
                      onValueChange={(value) =>
                        setSatisfactionRating(parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Rate your satisfaction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 - Excellent</SelectItem>
                        <SelectItem value="4">4 - Very Good</SelectItem>
                        <SelectItem value="3">3 - Good</SelectItem>
                        <SelectItem value="2">2 - Fair</SelectItem>
                        <SelectItem value="1">1 - Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Would you do this project again?</Label>
                    <Select
                      value={wouldDoAgain === null ? "" : wouldDoAgain.toString()}
                      onValueChange={(value) =>
                        setWouldDoAgain(value === "true")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lessons Learned</Label>
                    <Textarea
                      value={lessonsLearned}
                      onChange={(e) => setLessonsLearned(e.target.value)}
                      placeholder="What did you learn from this project? What would you do differently?"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCompletionNotes("");
                        setLessonsLearned("");
                        setSatisfactionRating(null);
                        setWouldDoAgain(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCompleteProject} disabled={completingProject}>
                      {completingProject ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        "Complete Project"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {project.steps.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground">
                {project.steps.filter((s) => s.status === "completed").length}{" "}
                of {project.steps.length} steps completed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="mt-1">
                    {project.description || "No description provided"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Category
                    </label>
                    <p className="mt-1 font-medium">{project.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Difficulty
                    </label>
                    <p className="mt-1">
                      <Badge className={getDifficultyColor(project.difficulty)}>
                        {project.difficulty}
                      </Badge>
                    </p>
                  </div>
                </div>
                {project.estimatedHours && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Estimated Hours
                    </label>
                    <p className="mt-1 font-medium">{project.estimatedHours} hours</p>
                  </div>
                )}
                {project.actualHours && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Actual Hours
                    </label>
                    <p className="mt-1 font-medium">{project.actualHours} hours</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.estimatedCost && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated Cost</span>
                    <span className="font-semibold">
                      ${project.estimatedCost.toFixed(2)}
                    </span>
                  </div>
                )}
                {actualCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Actual Cost</span>
                    <span className={`font-semibold ${budgetAlert ? "text-red-600" : ""}`}>
                      ${actualCost.toFixed(2)}
                    </span>
                  </div>
                )}
                {project.actualCost && project.actualCost !== actualCost && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Manual Entry</span>
                    <span className="font-semibold">
                      ${project.actualCost.toFixed(2)}
                    </span>
                  </div>
                )}
                {project.budget && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-semibold">
                      ${project.budget.toFixed(2)}
                    </span>
                  </div>
                )}
                {project.budget && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Remaining</span>
                    <span
                      className={`font-semibold ${
                        project.budget - actualCost >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ${(project.budget - actualCost).toFixed(2)}
                    </span>
                  </div>
                )}
                {budgetAlert && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    Budget exceeded by ${(actualCost - (project.budget || 0)).toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          {(project.targetStartDate || project.targetEndDate) && (
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.targetStartDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Target Start Date
                    </label>
                    <p className="mt-1">
                      {format(new Date(project.targetStartDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                {project.targetEndDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Target End Date
                    </label>
                    <p className="mt-1">
                      {format(new Date(project.targetEndDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                {project.actualStartDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Actual Start Date
                    </label>
                    <p className="mt-1">
                      {format(new Date(project.actualStartDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                {project.actualEndDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Actual End Date
                    </label>
                    <p className="mt-1">
                      {format(new Date(project.actualEndDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Permit Info */}
          {project.permitRequired && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Permit Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{project.permitInfo || "Permit information not provided"}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Steps</CardTitle>
                <CardDescription>
                  {project.steps.length} step{project.steps.length !== 1 ? "s" : ""} planned
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.steps.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <ProjectStepForm
                        projectId={project.id}
                        existingSteps={project.steps}
                        onStepAdded={fetchProject}
                      />
                    </div>
                    {project.steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <div className="mt-1">
                          {step.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              Step {step.stepNumber}: {step.name}
                            </h4>
                            <Badge variant="outline">{step.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description}
                          </p>
                          {step.estimatedHours && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Est. {step.estimatedHours} hours
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No steps added yet. Add steps in the Progress tab.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Materials & Tools */}
            <div className="space-y-6">
              {/* Materials */}
              <Card>
                <CardHeader>
                  <CardTitle>Materials</CardTitle>
                  <CardDescription>
                    {project.materials.length} item{project.materials.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project.materials.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-end mb-2">
                        <ProjectMaterialForm
                          projectId={project.id}
                          onMaterialAdded={fetchProject}
                        />
                      </div>
                      {project.materials.map((material) => (
                        <div
                          key={material.id}
                          className={`flex items-center justify-between p-2 border rounded text-sm ${
                            material.purchased ? "bg-green-50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={material.purchased}
                              onChange={async (e) => {
                                try {
                                  const response = await fetch(
                                    `/api/diy-projects/${project.id}/materials/${material.id}`,
                                    {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        purchased: e.target.checked,
                                      }),
                                    }
                                  );
                                  if (response.ok) {
                                    fetchProject();
                                  }
                                } catch (error) {
                                  console.error("Error updating material:", error);
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <div>
                              <span className="font-medium">{material.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {material.quantity} {material.unit}
                              </span>
                            </div>
                          </div>
                          {material.totalPrice && (
                            <span className="font-medium">
                              ${material.totalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No materials added yet
                      </p>
                      <ProjectMaterialForm
                        projectId={project.id}
                        onMaterialAdded={fetchProject}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tools */}
              <Card>
                <CardHeader>
                  <CardTitle>Tools</CardTitle>
                  <CardDescription>
                    {project.tools.length} tool{project.tools.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {project.tools.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-end mb-2">
                        <ProjectToolForm
                          projectId={project.id}
                          onToolAdded={fetchProject}
                        />
                      </div>
                      {project.tools.map((tool) => (
                        <div
                          key={tool.id}
                          className={`flex items-center justify-between p-2 border rounded text-sm ${
                            tool.purchased ? "bg-green-50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {!tool.owned && (
                              <input
                                type="checkbox"
                                checked={tool.purchased}
                                onChange={async (e) => {
                                  try {
                                    const response = await fetch(
                                      `/api/diy-projects/${project.id}/tools/${tool.id}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          purchased: e.target.checked,
                                        }),
                                      }
                                    );
                                    if (response.ok) {
                                      fetchProject();
                                    }
                                  } catch (error) {
                                    console.error("Error updating tool:", error);
                                  }
                                }}
                                className="h-4 w-4"
                              />
                            )}
                            <span className="font-medium">{tool.name}</span>
                            {tool.owned && (
                              <Badge variant="outline" className="text-xs">
                                Owned
                              </Badge>
                            )}
                            {!tool.owned && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 px-2"
                                onClick={async () => {
                                  try {
                                    // Add to inventory
                                    const response = await fetch("/api/tools/inventory", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        name: tool.name,
                                        description: tool.description || undefined,
                                      }),
                                    });
                                    if (response.ok) {
                                      // Update tool to owned
                                      await fetch(
                                        `/api/diy-projects/${project.id}/tools/${tool.id}`,
                                        {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            owned: true,
                                          }),
                                        }
                                      );
                                      fetchProject();
                                    }
                                  } catch (error) {
                                    console.error("Error adding to inventory:", error);
                                  }
                                }}
                              >
                                Add to Inventory
                              </Button>
                            )}
                          </div>
                          {!tool.owned && tool.rentalCost && tool.rentalDays && (
                            <span className="text-muted-foreground text-xs">
                              ${tool.rentalCost * tool.rentalDays} ({tool.rentalDays} days)
                            </span>
                          )}
                          {!tool.owned && tool.purchaseCost && !tool.rentalCost && (
                            <span className="text-muted-foreground text-xs">
                              ${tool.purchaseCost}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No tools added yet
                      </p>
                      <ProjectToolForm
                        projectId={project.id}
                        onToolAdded={fetchProject}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Cost Estimator */}
          <CostEstimator
            materials={project.materials.map((m) => ({
              name: m.name,
              quantity: m.quantity,
              unit: m.unit,
              unitPrice: m.unitPrice || 0,
              totalPrice: m.totalPrice || 0,
            }))}
            tools={project.tools.map((t) => ({
              name: t.name,
              owned: t.owned,
              rentalCost: t.rentalCost || 0,
              rentalDays: t.rentalDays || 1,
              purchaseCost: t.purchaseCost || 0,
            }))}
            permitFee={project.permitRequired ? 0 : 0}
          />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Progress</CardTitle>
              <CardDescription>
                Track your progress through each step
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.steps.length > 0 ? (
                <div className="space-y-4">
                  {project.steps.map((step) => (
                    <div
                      key={step.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {step.status === "completed" ? (
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                              ) : step.status === "in_progress" ? (
                                <Clock className="h-6 w-6 text-blue-600" />
                              ) : (
                                <Circle className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">
                                Step {step.stepNumber}: {step.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {step.description}
                              </p>
                              <div className="mt-3 p-3 bg-gray-50 rounded">
                                <p className="text-sm">{step.instructions}</p>
                              </div>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                {step.estimatedHours && (
                                  <span>Est. {step.estimatedHours} hours</span>
                                )}
                                {step.actualHours && (
                                  <span>Actual: {step.actualHours} hours</span>
                                )}
                                {step.completedAt && (
                                  <span>
                                    Completed:{" "}
                                    {format(new Date(step.completedAt), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3">
                                <ProjectPhotoUpload
                                  projectId={project.id}
                                  stepId={step.id}
                                  onUploadComplete={fetchProject}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            <StepStatusButton
                              stepId={step.id}
                              projectId={project.id}
                              currentStatus={step.status}
                              estimatedHours={step.estimatedHours}
                              actualHours={step.actualHours}
                              onStatusUpdated={fetchProject}
                            />
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No steps added yet. Add steps to track your progress.
                    </p>
                  </div>
                  <ProjectStepForm
                    projectId={project.id}
                    existingSteps={project.steps}
                    onStepAdded={fetchProject}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {project.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{project.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Lessons Learned */}
          {project.lessonsLearned && (
            <Card>
              <CardHeader>
                <CardTitle>Lessons Learned</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{project.lessonsLearned}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          {project.template && (
            <>
              {project.template.videoUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle>Video Tutorial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={project.template.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Watch Tutorial →
                    </a>
                  </CardContent>
                </Card>
              )}

              {project.template.guideUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle>Written Guide</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={project.template.guideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Read Guide →
                    </a>
                  </CardContent>
                </Card>
              )}

              {project.template.safetyNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Safety Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">
                      {project.template.safetyNotes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!project.template && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No resources available. This project was created from scratch.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

