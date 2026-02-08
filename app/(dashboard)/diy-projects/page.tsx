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
import { Badge } from "@/components/ui/badge";
import { Plus, Hammer, Filter } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Project = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  difficulty: string;
  estimatedHours: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  home: {
    id: string;
    address: string;
    city: string;
    state: string;
  };
};

export default function DiyProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHomeId, setFilterHomeId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    fetchHomes();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [filterHomeId, filterStatus, filterCategory]);

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes");
      if (response.ok) {
        const data = await response.json();
        setHomes(data.homes || []);
      }
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterHomeId !== "all") params.append("homeId", filterHomeId);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterCategory !== "all") params.append("category", filterCategory);

      const response = await fetch(`/api/diy-projects?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      HVAC: "bg-blue-100 text-blue-800",
      PLUMBING: "bg-green-100 text-green-800",
      ELECTRICAL: "bg-yellow-100 text-yellow-800",
      EXTERIOR: "bg-orange-100 text-orange-800",
      INTERIOR: "bg-purple-100 text-purple-800",
      LANDSCAPING: "bg-emerald-100 text-emerald-800",
      APPLIANCE: "bg-pink-100 text-pink-800",
      STRUCTURAL: "bg-red-100 text-red-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.OTHER;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DIY Projects</h1>
          <p className="text-muted-foreground mt-1">
            Plan, track, and complete your home improvement projects
          </p>
        </div>
        <Link href="/diy-projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Home</label>
              <Select value={filterHomeId} onValueChange={setFilterHomeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Homes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Homes</SelectItem>
                  {homes.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.address}, {home.city}, {home.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Hammer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first DIY project
            </p>
            <Link href="/diy-projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/diy-projects/${project.id}`}>
              <Card className="cursor-pointer transition-all hover:shadow-lg h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardDescription>
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Category</span>
                      <Badge className={getCategoryColor(project.category)}>
                        {project.category}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Difficulty</span>
                      <Badge className={getDifficultyColor(project.difficulty)}>
                        {project.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Home</span>
                      <span className="font-medium">
                        {project.home.address}, {project.home.city}
                      </span>
                    </div>
                    {project.estimatedCost && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Estimated Cost
                        </span>
                        <span className="font-medium">
                          ${project.estimatedCost.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {project.actualCost && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Actual Cost
                        </span>
                        <span className="font-medium">
                          ${project.actualCost.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-xs">
                        {format(new Date(project.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

