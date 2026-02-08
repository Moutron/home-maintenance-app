"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Edit, Wrench, Camera } from "lucide-react";
import { ToolPhotoUpload } from "@/components/tool-photo-upload";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Tool = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  condition: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
};

const TOOL_CATEGORIES = [
  "Power Tools",
  "Hand Tools",
  "Measuring Tools",
  "Safety Equipment",
  "Garden Tools",
  "Plumbing Tools",
  "Electrical Tools",
  "Painting Tools",
  "Other",
];

export default function ToolInventoryPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    model: "",
    purchaseDate: "",
    purchasePrice: "",
    condition: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchTools();
    }
  }, [filterCategory, searchQuery, mounted]);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.append("category", filterCategory);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/tools/inventory?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTools(data.tools || []);
      }
    } catch (error) {
      console.error("Error fetching tools:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert("Tool name is required");
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        model: formData.model?.trim() || undefined,
        purchaseDate: formData.purchaseDate?.trim() || undefined,
        purchasePrice: formData.purchasePrice?.trim()
          ? parseFloat(formData.purchasePrice.trim())
          : undefined,
        condition: formData.condition?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      // Validate purchasePrice is a valid number if provided
      if (payload.purchasePrice !== undefined && (isNaN(payload.purchasePrice) || payload.purchasePrice < 0)) {
        alert("Purchase price must be a valid positive number");
        return;
      }

      const url = editingTool
        ? `/api/tools/inventory/${editingTool.id}`
        : "/api/tools/inventory";
      const method = editingTool ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let responseData;
      const contentType = response.headers.get("content-type");
      
      try {
        if (contentType && contentType.includes("application/json")) {
          const text = await response.text();
          responseData = text ? JSON.parse(text) : {};
        } else {
          // Server returned HTML (error page)
          const text = await response.text();
          console.error("Server returned HTML instead of JSON:", text.substring(0, 500));
          alert(`Failed to save tool: Server error (${response.status}). Check server logs for details.`);
          return;
        }
      } catch (parseError: any) {
        console.error("Failed to parse response:", parseError);
        console.error("Response status:", response.status);
        console.error("Response headers:", Object.fromEntries(response.headers.entries()));
        const text = await response.text().catch(() => "Could not read response");
        console.error("Response text:", text.substring(0, 500));
        alert(`Failed to save tool: Server returned invalid response (${response.status}). Check console for details.`);
        return;
      }

      if (response.ok) {
        fetchTools();
        resetForm();
        setDialogOpen(false);
      } else {
        // Show detailed error message
        let errorMessage = "Failed to save tool";
        if (responseData.message) {
          errorMessage = responseData.message;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
        if (responseData.details) {
          if (Array.isArray(responseData.details)) {
            // Zod validation errors
            const validationErrors = responseData.details
              .map((err: any) => {
                const field = err.field || (err.path && err.path.join(".")) || "unknown";
                const msg = err.message || "Validation failed";
                return `${field}: ${msg}`;
              })
              .join("\n");
            errorMessage = `Validation errors:\n${validationErrors}`;
          } else if (typeof responseData.details === "string") {
            errorMessage = `${errorMessage}: ${responseData.details}`;
          }
        }
        console.error("Error response:", responseData);
        console.error("Payload sent:", payload);
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error("Error saving tool:", error);
      console.error("Error type:", error.constructor.name);
      console.error("Error stack:", error.stack);
      const errorMessage = error.message || error.toString() || "Please try again.";
      alert(`Failed to save tool: ${errorMessage}`);
    }
  };

  const handleDelete = async (toolId: string) => {
    if (!confirm("Are you sure you want to delete this tool?")) return;

    try {
      const response = await fetch(`/api/tools/inventory/${toolId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTools();
      } else {
        alert("Failed to delete tool");
      }
    } catch (error) {
      console.error("Error deleting tool:", error);
      alert("Failed to delete tool. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      brand: "",
      model: "",
      purchaseDate: "",
      purchasePrice: "",
      condition: "",
      location: "",
      notes: "",
    });
    setEditingTool(null);
  };

  const startEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description || "",
      category: tool.category || "",
      brand: tool.brand || "",
      model: tool.model || "",
      purchaseDate: tool.purchaseDate
        ? format(new Date(tool.purchaseDate), "yyyy-MM-dd")
        : "",
      purchasePrice: tool.purchasePrice?.toString() || "",
      condition: tool.condition || "",
      location: tool.location || "",
      notes: tool.notes || "",
    });
    setDialogOpen(true);
  };

  const getConditionColor = (condition: string | null) => {
    switch (condition) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tool Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Track the tools you own for better DIY project planning
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTool ? "Edit Tool" : "Add Tool to Inventory"}
              </DialogTitle>
              <DialogDescription>
                {editingTool
                  ? "Update tool information"
                  : "Quickly add tools using AI photo analysis or fill in manually"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Essential Fields - Always Visible */}
              <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Tool Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Cordless Drill, Circular Saw"
                    required
                    className="text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AI Photo Analysis - Collapsible */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="ai-analysis">
                  <AccordionTrigger className="text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Use AI Photo Analysis (Optional)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ToolPhotoUpload
                      onAnalysisComplete={(analysis) => {
                        if (analysis.name) {
                          setFormData((prev) => ({ ...prev, name: analysis.name || prev.name }));
                        }
                        if (analysis.brand) {
                          setFormData((prev) => ({ ...prev, brand: analysis.brand || prev.brand }));
                        }
                        if (analysis.model) {
                          setFormData((prev) => ({ ...prev, model: analysis.model || prev.model }));
                        }
                        if (analysis.category) {
                          setFormData((prev) => ({ ...prev, category: analysis.category || prev.category }));
                        }
                        if (analysis.condition) {
                          setFormData((prev) => ({ ...prev, condition: analysis.condition || prev.condition }));
                        }
                        if (analysis.description) {
                          setFormData((prev) => ({ ...prev, description: analysis.description || prev.description }));
                        }
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Additional Details - Collapsible */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="additional-details">
                  <AccordionTrigger className="text-sm font-medium">
                    Additional Details (Optional)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Optional description"
                        rows={2}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) =>
                            setFormData({ ...formData, brand: e.target.value })
                          }
                          placeholder="e.g., DeWalt, Milwaukee"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) =>
                            setFormData({ ...formData, model: e.target.value })
                          }
                          placeholder="Model number or name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="condition">Condition</Label>
                      <Select
                        value={formData.condition}
                        onValueChange={(value) =>
                          setFormData({ ...formData, condition: value })
                        }
                      >
                        <SelectTrigger id="condition">
                          <SelectValue placeholder="Select condition (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="location">Storage Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder="e.g., Garage, Basement, Toolbox"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Purchase Info - Collapsible */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="purchase-info">
                  <AccordionTrigger className="text-sm font-medium">
                    Purchase Information (Optional)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="purchaseDate">Purchase Date</Label>
                        <Input
                          id="purchaseDate"
                          type="date"
                          value={formData.purchaseDate}
                          onChange={(e) =>
                            setFormData({ ...formData, purchaseDate: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                        <Input
                          id="purchasePrice"
                          type="number"
                          value={formData.purchasePrice}
                          onChange={(e) =>
                            setFormData({ ...formData, purchasePrice: e.target.value })
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Notes - Collapsible */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="notes">
                  <AccordionTrigger className="text-sm font-medium">
                    Notes (Optional)
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-1.5">
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTool ? "Update Tool" : "Add Tool"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {TOOL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools List */}
      {tools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tools found</h3>
            <p className="text-muted-foreground mb-4">
              Start building your tool inventory to get better DIY project recommendations
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Tool
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Tool to Inventory</DialogTitle>
                  <DialogDescription>
                    Add a tool to your inventory so it can be automatically detected in DIY projects
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Same form fields as above */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name-new">Tool Name *</Label>
                    <Input
                      id="name-new"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Cordless Drill"
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Tool</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Card key={tool.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(tool)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tool.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {tool.category && (
                  <CardDescription>{tool.category}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {tool.brand && tool.model && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Brand/Model: </span>
                    <span className="font-medium">
                      {tool.brand} {tool.model}
                    </span>
                  </div>
                )}
                {tool.condition && (
                  <div>
                    <Badge className={getConditionColor(tool.condition)}>
                      {tool.condition}
                    </Badge>
                  </div>
                )}
                {tool.location && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Location: </span>
                    <span>{tool.location}</span>
                  </div>
                )}
                {tool.purchasePrice && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Price: </span>
                    <span>${tool.purchasePrice.toFixed(2)}</span>
                  </div>
                )}
                {tool.description && (
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

