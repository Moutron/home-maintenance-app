"use client";

import { useState } from "react";
import { format, isPast, isThisWeek, isThisMonth, addDays } from "date-fns";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, Circle, Calendar, Home, Clock, AlertCircle } from "lucide-react";

// Mock data - same for all views
const mockTasks = [
  {
    id: "1",
    name: "Replace HVAC Filter",
    description: "Replace the air filter in your HVAC system to maintain air quality and efficiency",
    category: "HVAC",
    frequency: "Monthly",
    nextDueDate: new Date().toISOString(), // Today - overdue
    completed: false,
    costEstimate: 15.99,
    priority: "high",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
  {
    id: "2",
    name: "Inspect Roof for Damage",
    description: "Check for missing shingles, leaks, or other damage after winter",
    category: "EXTERIOR",
    frequency: "Quarterly",
    nextDueDate: addDays(new Date(), 2).toISOString(), // This week
    completed: false,
    costEstimate: 0,
    priority: "medium",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
  {
    id: "3",
    name: "Clean Gutters",
    description: "Remove leaves and debris from gutters to prevent water damage",
    category: "EXTERIOR",
    frequency: "Seasonal",
    nextDueDate: addDays(new Date(), 5).toISOString(), // This week
    completed: false,
    costEstimate: 150,
    priority: "medium",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
  {
    id: "4",
    name: "Test Smoke Detectors",
    description: "Test all smoke detectors and replace batteries if needed",
    category: "SAFETY",
    frequency: "Monthly",
    nextDueDate: addDays(new Date(), 10).toISOString(), // This month
    completed: false,
    costEstimate: 20,
    priority: "high",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
  {
    id: "5",
    name: "Service Water Heater",
    description: "Flush the water heater to remove sediment buildup",
    category: "PLUMBING",
    frequency: "Annually",
    nextDueDate: addDays(new Date(), 15).toISOString(), // This month
    completed: false,
    costEstimate: 100,
    priority: "low",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
  {
    id: "6",
    name: "Inspect Electrical Panel",
    description: "Check for signs of overheating or loose connections",
    category: "ELECTRICAL",
    frequency: "Annually",
    nextDueDate: addDays(new Date(), 45).toISOString(), // Later
    completed: false,
    costEstimate: 200,
    priority: "medium",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
  {
    id: "7",
    name: "Trim Trees and Shrubs",
    description: "Trim overgrown branches away from house and power lines",
    category: "LANDSCAPING",
    frequency: "Seasonal",
    nextDueDate: addDays(new Date(), 60).toISOString(), // Later
    completed: false,
    costEstimate: 300,
    priority: "low",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
  {
    id: "8",
    name: "Check Appliance Seals",
    description: "Inspect refrigerator and freezer door seals for wear",
    category: "APPLIANCE",
    frequency: "Quarterly",
    nextDueDate: addDays(new Date(), 20).toISOString(), // This month
    completed: true,
    costEstimate: 0,
    priority: "low",
    home: {
      id: "h1",
      address: "123 Main St",
      city: "Rochester Hills",
      state: "MI",
    },
  },
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

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-gray-100 text-gray-800",
  };
  return colors[priority] || colors.low;
};

// Task Card Component (reusable)
const TaskCard = ({ task }: { task: typeof mockTasks[0] }) => {
  const isOverdue = isPast(new Date(task.nextDueDate)) && !task.completed;
  
  return (
    <Card className={task.completed ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{task.name}</CardTitle>
              <Badge className={getCategoryColor(task.category)}>
                {task.category}
              </Badge>
              {task.priority && (
                <Badge className={getPriorityColor(task.priority)} variant="outline">
                  {task.priority}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">
              {task.description}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon">
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
            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
              Due: {format(new Date(task.nextDueDate), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>
              {task.home.address}, {task.home.city}
            </span>
          </div>
          {task.costEstimate > 0 && (
            <span>Est. Cost: ${task.costEstimate.toFixed(2)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function TestViewsPage() {
  // Group tasks by urgency
  const overdueTasks = mockTasks.filter(
    (t) => isPast(new Date(t.nextDueDate)) && !t.completed
  );
  const thisWeekTasks = mockTasks.filter(
    (t) => isThisWeek(new Date(t.nextDueDate)) && !t.completed && !isPast(new Date(t.nextDueDate))
  );
  const thisMonthTasks = mockTasks.filter(
    (t) =>
      isThisMonth(new Date(t.nextDueDate)) &&
      !isThisWeek(new Date(t.nextDueDate)) &&
      !t.completed
  );
  const laterTasks = mockTasks.filter(
    (t) =>
      !isThisMonth(new Date(t.nextDueDate)) && !t.completed
  );
  const completedTasks = mockTasks.filter((t) => t.completed);

  // Group by category
  const tasksByCategory = mockTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, typeof mockTasks>);

  // Kanban states
  const todoTasks = mockTasks.filter((t) => !t.completed);
  const doneTasks = mockTasks.filter((t) => t.completed);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Task View Options - Test Page</h1>
        <p className="text-muted-foreground">
          Compare different UX approaches with the same mock data
        </p>
      </div>

      <Tabs defaultValue="grouped-urgency" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="grouped-urgency">1. Grouped by Urgency</TabsTrigger>
          <TabsTrigger value="kanban">2. Kanban Board</TabsTrigger>
          <TabsTrigger value="category-tabs">3. Category Tabs</TabsTrigger>
          <TabsTrigger value="category-accordion">4. Category Accordion</TabsTrigger>
          <TabsTrigger value="compact-grid">5. Compact Grid</TabsTrigger>
          <TabsTrigger value="smart-grouping">6. Smart Grouping</TabsTrigger>
        </TabsList>

        {/* Option 1: Grouped by Urgency */}
        <TabsContent value="grouped-urgency" className="space-y-6">
          <div className="space-y-6">
            {overdueTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h2 className="text-2xl font-bold text-red-600">
                    Overdue ({overdueTasks.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {overdueTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {thisWeekTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h2 className="text-2xl font-bold text-orange-600">
                    Due This Week ({thisWeekTasks.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {thisWeekTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {thisMonthTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h2 className="text-2xl font-bold text-blue-600">
                    Due This Month ({thisMonthTasks.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {thisMonthTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {laterTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h2 className="text-2xl font-bold text-gray-600">
                    Later ({laterTasks.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {laterTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h2 className="text-2xl font-bold text-green-600">
                    Completed ({completedTasks.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {completedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Option 2: Kanban Board */}
        <TabsContent value="kanban" className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900">To Do</h3>
                <Badge>{todoTasks.length}</Badge>
              </div>
              <div className="space-y-3 min-h-[400px]">
                {todoTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-yellow-900">In Progress</h3>
                <Badge>0</Badge>
              </div>
              <div className="space-y-3 min-h-[400px]">
                <div className="text-center text-muted-foreground py-8">
                  No tasks in progress
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900">Done</h3>
                <Badge>{doneTasks.length}</Badge>
              </div>
              <div className="space-y-3 min-h-[400px]">
                {doneTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Option 3: Category Tabs */}
        <TabsContent value="category-tabs" className="space-y-6">
          <Tabs defaultValue={Object.keys(tasksByCategory)[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.keys(tasksByCategory).map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category} ({tasksByCategory[category].length})
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(tasksByCategory).map(([category, tasks]) => (
              <TabsContent key={category} value={category}>
                <div className="grid gap-4 mt-4">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Option 4: Category Accordion */}
        <TabsContent value="category-accordion" className="space-y-6">
          <Accordion type="multiple" className="w-full">
            {Object.entries(tasksByCategory).map(([category, tasks]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="text-lg">
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(category)}>
                      {category}
                    </Badge>
                    <span>{tasks.length} tasks</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-4">
                    {tasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        {/* Option 5: Compact Grid */}
        <TabsContent value="compact-grid" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTasks.map((task) => (
              <Card key={task.id} className={task.completed ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">
                        {task.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={getCategoryColor(task.category)}>
                          {task.category}
                        </Badge>
                        {task.priority && (
                          <Badge
                            className={getPriorityColor(task.priority)}
                            variant="outline"
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {task.description}
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span
                        className={
                          isPast(new Date(task.nextDueDate)) && !task.completed
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {format(new Date(task.nextDueDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    {task.costEstimate > 0 && (
                      <div>Est. ${task.costEstimate.toFixed(2)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Option 6: Smart Grouping (Urgency + Category) */}
        <TabsContent value="smart-grouping" className="space-y-6">
          <div className="space-y-8">
            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h2 className="text-2xl font-bold text-red-600">
                    Overdue ({overdueTasks.length})
                  </h2>
                </div>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(
                    overdueTasks.reduce((acc, task) => {
                      if (!acc[task.category]) acc[task.category] = [];
                      acc[task.category].push(task);
                      return acc;
                    }, {} as Record<string, typeof mockTasks>)
                  ).map(([category, tasks]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(category)}>
                            {category}
                          </Badge>
                          <span>{tasks.length} tasks</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 pt-2">
                          {tasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* This Week Section */}
            {thisWeekTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h2 className="text-2xl font-bold text-orange-600">
                    Due This Week ({thisWeekTasks.length})
                  </h2>
                </div>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(
                    thisWeekTasks.reduce((acc, task) => {
                      if (!acc[task.category]) acc[task.category] = [];
                      acc[task.category].push(task);
                      return acc;
                    }, {} as Record<string, typeof mockTasks>)
                  ).map(([category, tasks]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(category)}>
                            {category}
                          </Badge>
                          <span>{tasks.length} tasks</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 pt-2">
                          {tasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* This Month Section */}
            {thisMonthTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h2 className="text-2xl font-bold text-blue-600">
                    Due This Month ({thisMonthTasks.length})
                  </h2>
                </div>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(
                    thisMonthTasks.reduce((acc, task) => {
                      if (!acc[task.category]) acc[task.category] = [];
                      acc[task.category].push(task);
                      return acc;
                    }, {} as Record<string, typeof mockTasks>)
                  ).map(([category, tasks]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(category)}>
                            {category}
                          </Badge>
                          <span>{tasks.length} tasks</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 pt-2">
                          {tasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

