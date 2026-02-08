"use client";

import { useEffect, useState } from "react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, getMonth } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Filter, Download } from "lucide-react";

type Task = {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  nextDueDate: string;
  completed: boolean;
  priority: string | null;
  aiExplanation: string | null;
  dependsOnTaskId: string | null;
  home: {
    address: string;
    city: string;
    state: string;
  };
};

export default function SchedulePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filterHomeId, setFilterHomeId] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  useEffect(() => {
    fetchHomes();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedYear, filterHomeId, filterCategory, filterPriority]);

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
      params.append("completed", "false");
      if (filterHomeId !== "all") {
        params.append("homeId", filterHomeId);
      }
      if (filterCategory !== "all") {
        params.append("category", filterCategory);
      }

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let filteredTasks = data.tasks || [];

        // Filter by year
        const yearStart = startOfYear(new Date(selectedYear, 0, 1));
        const yearEnd = endOfYear(new Date(selectedYear, 11, 31));
        filteredTasks = filteredTasks.filter((task: Task) => {
          const taskDate = new Date(task.nextDueDate);
          return taskDate >= yearStart && taskDate <= yearEnd;
        });

        // Filter by priority if selected
        if (filterPriority !== "all") {
          filteredTasks = filteredTasks.filter(
            (task: Task) => task.priority === filterPriority
          );
        }

        setTasks(filteredTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForMonth = (monthIndex: number) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.nextDueDate);
      return getMonth(taskDate) === monthIndex;
    });
  };

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

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return "bg-gray-100 text-gray-800";
    const colors: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[priority] || colors.medium;
  };

  const months = eachMonthOfInterval({
    start: startOfYear(new Date(selectedYear, 0, 1)),
    end: endOfYear(new Date(selectedYear, 11, 31)),
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Yearly Maintenance Schedule</h1>
          <p className="text-muted-foreground">
            View and manage your maintenance tasks for {selectedYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedYear(selectedYear - 1)}>
            Previous Year
          </Button>
          <Button variant="outline" onClick={() => setSelectedYear(new Date().getFullYear())}>
            This Year
          </Button>
          <Button variant="outline" onClick={() => setSelectedYear(selectedYear + 1)}>
            Next Year
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
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

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Schedule */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {months.map((month, index) => {
          const monthTasks = getTasksForMonth(index);
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(month, "MMMM yyyy")}
                </CardTitle>
                <CardDescription>
                  {monthTasks.length} task{monthTasks.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monthTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks scheduled
                  </p>
                ) : (
                  <div className="space-y-2">
                    {monthTasks
                      .sort(
                        (a, b) =>
                          new Date(a.nextDueDate).getTime() -
                          new Date(b.nextDueDate).getTime()
                      )
                      .map((task) => (
                        <Dialog key={task.id}>
                          <DialogTrigger asChild>
                            <div className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-medium text-sm line-clamp-1">
                                      {task.name}
                                    </span>
                                    <Badge className={getCategoryColor(task.category)}>
                                      {task.category}
                                    </Badge>
                                    {task.priority && (
                                      <Badge className={getPriorityColor(task.priority)}>
                                        {task.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(task.nextDueDate), "MMM d")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{task.name}</DialogTitle>
                              <DialogDescription>
                                <div className="mt-4 space-y-4">
                                  <div>
                                    <span className="font-semibold">Description:</span>
                                    <p className="text-sm mt-1">{task.description}</p>
                                  </div>
                                  {task.aiExplanation && (
                                    <div>
                                      <span className="font-semibold">Why This Matters:</span>
                                      <p className="text-sm mt-1">{task.aiExplanation}</p>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2">
                                    <Badge className={getCategoryColor(task.category)}>
                                      {task.category}
                                    </Badge>
                                    {task.priority && (
                                      <Badge className={getPriorityColor(task.priority)}>
                                        Priority: {task.priority}
                                      </Badge>
                                    )}
                                    <Badge variant="outline">
                                      Frequency: {task.frequency}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="font-semibold">Due Date:</span>
                                    <p className="text-sm mt-1">
                                      {format(new Date(task.nextDueDate), "MMMM d, yyyy")}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="font-semibold">Home:</span>
                                    <p className="text-sm mt-1">
                                      {task.home.address}, {task.home.city}, {task.home.state}
                                    </p>
                                  </div>
                                  {task.dependsOnTaskId && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <p className="text-sm text-yellow-800">
                                        ⚠️ This task depends on another task being completed first.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Year Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {tasks.filter((t) => t.priority === "critical").length}
              </p>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {tasks.filter((t) => t.priority === "high").length}
              </p>
              <p className="text-sm text-muted-foreground">High Priority</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(tasks.map((t) => t.category)).size}
              </p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

