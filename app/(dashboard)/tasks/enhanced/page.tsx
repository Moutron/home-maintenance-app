"use client";

import { useEffect, useState } from "react";
import { format, isPast, isThisWeek, isThisMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, eachDayOfInterval } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CheckCircle2, Circle, Calendar, Home, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { getCategoryIcon, getCategoryColor, getPriorityIcon, getPriorityBadgeColor } from "@/lib/utils/task-icons";
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
  priority: string | null;
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

type ViewMode = "kanban" | "calendar";
type TimeFilter = "day" | "week" | "month" | "all";

export default function EnhancedTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [filterHomeId, setFilterHomeId] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    fetchTasks();
    fetchHomes();
  }, [filterHomeId, filterCategory, timeFilter]);

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
      params.append("completed", "false");

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let filteredTasks = data.tasks || [];

        // Apply time filter
        const now = new Date();
        if (timeFilter === "day") {
          const start = startOfDay(now);
          const end = endOfDay(now);
          filteredTasks = filteredTasks.filter((task: Task) => {
            const taskDate = new Date(task.nextDueDate);
            return taskDate >= start && taskDate <= end;
          });
        } else if (timeFilter === "week") {
          const start = startOfWeek(now);
          const end = endOfWeek(now);
          filteredTasks = filteredTasks.filter((task: Task) => {
            const taskDate = new Date(task.nextDueDate);
            return taskDate >= start && taskDate <= end;
          });
        } else if (timeFilter === "month") {
          const start = startOfMonth(now);
          const end = endOfMonth(now);
          filteredTasks = filteredTasks.filter((task: Task) => {
            const taskDate = new Date(task.nextDueDate);
            return taskDate >= start && taskDate <= end;
          });
        }

        setTasks(filteredTasks);
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

  const isOverdue = (dueDate: string, completed: boolean) => {
    return isPast(new Date(dueDate)) && !completed;
  };

  // Group tasks for Kanban
  const todoTasks = tasks.filter((t) => !t.completed);
  const inProgressTasks: Task[] = []; // Could be enhanced with status field
  const doneTasks = tasks.filter((t) => t.completed);

  // Calendar helpers
  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) =>
      isSameDay(new Date(task.nextDueDate), date)
    );
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const CategoryIcon = getCategoryIcon(task.category);
    const PriorityIcon = getPriorityIcon(task.priority);
    const overdue = isOverdue(task.nextDueDate, task.completed);

    return (
      <Card className={`${task.completed ? "opacity-60" : ""} hover:shadow-md transition-shadow ${task.priority === "critical" ? "border border-red-300" : task.priority === "high" ? "border border-orange-300" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${getCategoryColor(task.category)}`}>
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base line-clamp-1">{task.name}</CardTitle>
                {task.priority && (
                  <div className={`p-1 rounded-full ${getPriorityBadgeColor(task.priority)} shrink-0`} title={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}>
                    <PriorityIcon className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getCategoryColor(task.category)}>
                  {task.category}
                </Badge>
                {task.priority && (
                  <Badge className={`${getPriorityBadgeColor(task.priority)} text-xs flex items-center gap-1`}>
                    <PriorityIcon className="h-3 w-3" />
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleTaskComplete(task.id, task.completed)}
              className="shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className={overdue ? "text-red-600 font-medium" : ""}>
                {format(new Date(task.nextDueDate), "MMM d")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              <span className="truncate max-w-[120px]">
                {task.home.address}
              </span>
            </div>
            {task.costEstimate && (
              <span>${task.costEstimate.toFixed(0)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your home maintenance tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
        </div>
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

        {viewMode === "kanban" && (
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Tasks</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900">To Do</h3>
              <Badge className="bg-blue-200 text-blue-900">{todoTasks.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
              {todoTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No tasks
                </div>
              ) : (
                todoTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-900">In Progress</h3>
              <Badge className="bg-yellow-200 text-yellow-900">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
              {inProgressTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No tasks in progress
                </div>
              ) : (
                inProgressTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900">Done</h3>
              <Badge className="bg-green-200 text-green-900">{doneTasks.length}</Badge>
            </div>
            <div className="space-y-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
              {doneTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No completed tasks
                </div>
              ) : (
                doneTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() - 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() + 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      setCurrentMonth(today);
                      setSelectedDate(today);
                    }}
                  >
                    Today
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border"
                modifiers={{
                  hasTasks: eachDayOfInterval({
                    start: startOfMonth(currentMonth),
                    end: endOfMonth(currentMonth),
                  }).filter((date) => getTasksForDate(date).length > 0),
                }}
                modifiersClassNames={{
                  hasTasks: "bg-blue-50",
                }}
              />
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Category Icons:</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {categories.map((cat) => {
                      const Icon = getCategoryIcon(cat);
                      return (
                        <div key={cat} className="flex items-center gap-1">
                          <div className={`p-1 rounded ${getCategoryColor(cat)}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <span>{cat}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Priority Indicators:</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {["critical", "high", "medium", "low"].map((priority) => {
                      const PriorityIcon = getPriorityIcon(priority);
                      return (
                        <div key={priority} className="flex items-center gap-1">
                          <div className={`p-1 rounded-full ${getPriorityBadgeColor(priority)}`}>
                            <PriorityIcon className="h-3 w-3" />
                          </div>
                          <span className="capitalize">{priority}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Tasks for {format(selectedDate, "MMMM d, yyyy")}
              </CardTitle>
              <CardDescription>
                {getTasksForDate(selectedDate).length === 0
                  ? "No tasks due on this date"
                  : `${getTasksForDate(selectedDate).length} task${
                      getTasksForDate(selectedDate).length !== 1 ? "s" : ""
                    } due`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getTasksForDate(selectedDate).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tasks scheduled for this date
                </p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {getTasksForDate(selectedDate).map((task) => {
                    const CategoryIcon = getCategoryIcon(task.category);
                    const PriorityIcon = getPriorityIcon(task.priority);
                    return (
                      <Dialog key={task.id}>
                        <DialogTrigger asChild>
                          <Card className={`cursor-pointer hover:bg-accent transition-colors ${task.priority === "critical" ? "border border-red-300" : task.priority === "high" ? "border border-orange-300" : ""}`}>
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${getCategoryColor(task.category)} shrink-0`}>
                                  <CategoryIcon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold">{task.name}</h4>
                                    <Badge className={getCategoryColor(task.category)}>
                                      {task.category}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {task.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {task.home.address}, {task.home.city}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 flex-wrap">
                              <div className={`p-2 rounded-lg ${getCategoryColor(task.category)}`}>
                                <CategoryIcon className="h-5 w-5" />
                              </div>
                              {task.name}
                              {task.priority && (
                                <div className={`p-1.5 rounded-full ${getPriorityBadgeColor(task.priority)} shrink-0`} title={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}>
                                  <PriorityIcon className="h-4 w-4" />
                                </div>
                              )}
                            </DialogTitle>
                            <DialogDescription>
                              <div className="mt-4 space-y-3">
                                <div>
                                  <span className="font-semibold">Description:</span>
                                  <p className="text-sm mt-1">{task.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">Category:</span>
                                  <Badge className={getCategoryColor(task.category)}>
                                    {task.category}
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
                                {task.costEstimate && (
                                  <div>
                                    <span className="font-semibold">Estimated Cost:</span>
                                    <p className="text-sm mt-1">${task.costEstimate.toFixed(2)}</p>
                                  </div>
                                )}
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

