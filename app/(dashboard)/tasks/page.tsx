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
import { CheckCircle2, Circle, Calendar, Home } from "lucide-react";
import { ComplianceBadge } from "@/components/compliance-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Task = {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  nextDueDate: string;
  completed: boolean;
  costEstimate: number | null;
  notes: string | null;
  home: {
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    yearBuilt: number;
    homeType: string;
  };
  template: {
    id: string;
    name: string;
    description: string;
    educationalContent: any;
    diyDifficulty: string | null;
  } | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHomeId, setFilterHomeId] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCompleted, setFilterCompleted] = useState<string>("all");

  useEffect(() => {
    fetchTasks();
    fetchHomes();
  }, [filterHomeId, filterCategory, filterCompleted]);

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

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterHomeId !== "all") {
        params.append("homeId", filterHomeId);
      }
      if (filterCategory !== "all") {
        params.append("category", filterCategory);
      }
      if (filterCompleted !== "all") {
        params.append("completed", filterCompleted);
      }

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: taskId,
          completed: !currentStatus,
        }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const categories = [
    "HVAC",
    "PLUMBING",
    "EXTERIOR",
    "STRUCTURAL",
    "LANDSCAPING",
    "APPLIANCE",
    "SAFETY",
    "ELECTRICAL",
    "OTHER",
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      HVAC: "bg-blue-100 text-blue-800",
      PLUMBING: "bg-green-100 text-green-800",
      EXTERIOR: "bg-yellow-100 text-yellow-800",
      STRUCTURAL: "bg-red-100 text-red-800",
      LANDSCAPING: "bg-emerald-100 text-emerald-800",
      APPLIANCE: "bg-purple-100 text-purple-800",
      SAFETY: "bg-orange-100 text-orange-800",
      ELECTRICAL: "bg-indigo-100 text-indigo-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.OTHER;
  };

  const isOverdue = (dueDate: string, completed: boolean) => {
    return new Date(dueDate) < new Date() && !completed;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maintenance Tasks</h1>
        <p className="text-muted-foreground">
          Manage and track your home maintenance tasks
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterHomeId} onValueChange={setFilterHomeId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Homes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {homes.map((home) => (
              <SelectItem key={home.id} value={home.id}>
                {home.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCompleted} onValueChange={setFilterCompleted}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Tasks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="false">Pending</SelectItem>
            <SelectItem value="true">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No tasks found. Add a home to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{task.name}</CardTitle>
                      <Badge className={getCategoryColor(task.category)}>
                        {task.category}
                      </Badge>
                      <ComplianceBadge
                        city={task.home.city}
                        state={task.home.state}
                        zipCode={task.home.zipCode}
                        yearBuilt={task.home.yearBuilt}
                        homeType={task.home.homeType}
                        taskCategory={task.category}
                        taskName={task.name}
                      />
                    </div>
                    <CardDescription className="mt-2">
                      {task.description}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleTaskComplete(task.id, task.completed)}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span
                      className={
                        isOverdue(task.nextDueDate, task.completed)
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      Due: {format(new Date(task.nextDueDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>
                      {task.home.address}, {task.home.city}, {task.home.state}
                    </span>
                  </div>
                  {task.costEstimate && (
                    <span>Est. Cost: ${task.costEstimate.toFixed(2)}</span>
                  )}
                </div>
                {task.template?.educationalContent && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link" className="mt-4">
                        Learn More
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{task.name}</DialogTitle>
                        <DialogDescription>
                          {task.template.educationalContent.whyImportant && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">
                                Why This Matters
                              </h4>
                              <p className="text-sm">
                                {task.template.educationalContent.whyImportant}
                              </p>
                            </div>
                          )}
                          {task.template.educationalContent.diyGuidance && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">DIY Guide</h4>
                              <p className="text-sm">
                                {task.template.educationalContent.diyGuidance}
                              </p>
                            </div>
                          )}
                          {task.template.diyDifficulty && (
                            <div className="mt-4">
                              <Badge>
                                Difficulty: {task.template.diyDifficulty}
                              </Badge>
                            </div>
                          )}
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

