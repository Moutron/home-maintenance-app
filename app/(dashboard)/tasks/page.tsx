"use client";

import { useCallback, useEffect, useState } from "react";
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
import { CheckCircle2, Circle, Calendar, Home, Wrench, BookOpen } from "lucide-react";
import { ComplianceBadge } from "@/components/compliance-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

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
    systems?: { id: string; systemType: string; brand: string | null; model: string | null }[];
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
  const [sortBy, setSortBy] = useState<"dueDate" | "category" | "name">("dueDate");
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [learnMoreTask, setLearnMoreTask] = useState<Task | null>(null);
  const [howToCache, setHowToCache] = useState<Record<string, string>>({});
  const [howToLoading, setHowToLoading] = useState<string | null>(null);

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

  const fetchHowTo = useCallback(async (task: Task) => {
    setHowToLoading(task.id);
    try {
      const res = await fetch("/api/tasks/how-to", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: task.name,
          description: task.description,
          category: task.category,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHowToCache((prev) => ({ ...prev, [task.id]: data.howTo }));
      } else {
        const msg = res.status === 503 ? "How-to guides are not configured for this app." : "Unable to load how-to guide.";
        setHowToCache((prev) => ({ ...prev, [task.id]: msg }));
      }
    } catch {
      setHowToCache((prev) => ({ ...prev, [task.id]: "Unable to load how-to guide." }));
    } finally {
      setHowToLoading(null);
    }
  }, []);

  useEffect(() => {
    if (!learnMoreTask) return;
    const hasGuidance = learnMoreTask.template?.educationalContent?.diyGuidance;
    if (hasGuidance || howToCache[learnMoreTask.id]) return;
    fetchHowTo(learnMoreTask);
  }, [learnMoreTask, howToCache, fetchHowTo]);

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

  // Task category → system type (for "add system" recommendation)
  const categoryToSystemType: Record<string, string> = {
    HVAC: "HVAC",
    PLUMBING: "PLUMBING",
    ELECTRICAL: "ELECTRICAL",
    EXTERIOR: "ROOF",
    APPLIANCE: "APPLIANCE",
  };

  const homeHasRelevantSystemWithDetails = (task: Task) => {
    const systemType = categoryToSystemType[task.category];
    if (!systemType || !task.home.systems?.length) return false;
    const match = task.home.systems.find(
      (s) => s.systemType === systemType || (systemType === "ROOF" && s.systemType === "EXTERIOR")
    );
    return !!(match && (match.brand || match.model));
  };

  const shouldRecommendAddingSystem = (task: Task) => {
    return categoryToSystemType[task.category] != null && !homeHasRelevantSystemWithDetails(task);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    }
    if (sortBy === "category") {
      const cat = a.category.localeCompare(b.category);
      return cat !== 0 ? cat : new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    }
    const name = a.name.localeCompare(b.name);
    return name !== 0 ? name : new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
  });

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

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "dueDate" | "category" | "name")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Due date</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="name">Name</SelectItem>
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
          {sortedTasks.map((task) => (
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

                {shouldRecommendAddingSystem(task) && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground border-l-2 border-l-muted-foreground/30 pl-2 py-0.5">
                    <Wrench className="h-3 w-3 shrink-0" />
                    Add {task.category.toLowerCase()} with brand/model for better recommendations.{" "}
                    <Link href="/homes" className="font-medium text-foreground underline hover:no-underline">
                      Homes
                    </Link>
                  </p>
                )}

                <Button
                  variant="link"
                  className="mt-4 gap-1.5"
                  onClick={() => {
                    setLearnMoreTask(task);
                    setLearnMoreOpen(true);
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={learnMoreOpen} onOpenChange={(open) => { setLearnMoreOpen(open); if (!open) setLearnMoreTask(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {learnMoreTask && (
            <>
              <DialogHeader>
                <DialogTitle>{learnMoreTask.name}</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-4">
                    {learnMoreTask.template?.educationalContent?.whyImportant && (
                      <div>
                        <h4 className="font-semibold mb-2">Why This Matters</h4>
                        <p className="text-sm text-muted-foreground">
                          {learnMoreTask.template.educationalContent.whyImportant}
                        </p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold mb-2">How To (DIY)</h4>
                      {learnMoreTask.template?.educationalContent?.diyGuidance ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">
                            {learnMoreTask.template.educationalContent.diyGuidance}
                          </p>
                          {learnMoreTask.template?.diyDifficulty && (
                            <Badge variant="secondary">
                              Difficulty: {learnMoreTask.template.diyDifficulty}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          {howToLoading === learnMoreTask.id ? (
                            <p className="text-sm text-muted-foreground">Loading how-to guide…</p>
                          ) : howToCache[learnMoreTask.id] ? (
                            <>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                                {howToCache[learnMoreTask.id]}
                              </p>
                              {learnMoreTask.template?.diyDifficulty && (
                                <Badge variant="secondary">
                                  Difficulty: {learnMoreTask.template.diyDifficulty}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Unable to load how-to guide.</p>
                          )}
                        </>
                      )}
                    </div>
                    {shouldRecommendAddingSystem(learnMoreTask) && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground border-l-2 border-l-muted-foreground/30 pl-2 py-0.5">
                        <Wrench className="h-3 w-3 shrink-0" />
                        Add {learnMoreTask.category.toLowerCase()} with brand/model in{" "}
                        <Link href="/homes" className="font-medium text-foreground underline hover:no-underline">
                          Home settings
                        </Link>{" "}
                        for better AI guidance.
                      </p>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

