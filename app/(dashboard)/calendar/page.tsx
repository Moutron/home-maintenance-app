"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Task = {
  id: string;
  name: string;
  description: string;
  category: string;
  nextDueDate: string;
  completed: boolean;
  home: {
    address: string;
    city: string;
    state: string;
  };
};

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [currentMonth]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentMonth).toISOString();
      const endDate = endOfMonth(currentMonth).toISOString();
      
      const response = await fetch("/api/tasks?completed=false");
      if (response.ok) {
        const data = await response.json();
        // Filter tasks for the current month
        const monthTasks = (data.tasks || []).filter((task: Task) => {
          const taskDate = new Date(task.nextDueDate);
          return taskDate >= startOfMonth(currentMonth) && 
                 taskDate <= endOfMonth(currentMonth);
        });
        setTasks(monthTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) =>
      isSameDay(new Date(task.nextDueDate), date)
    );
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

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maintenance Calendar</h1>
        <p className="text-muted-foreground">
          View your maintenance tasks by due date
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateMonth("next")}
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
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Days with tasks are highlighted in blue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Tasks for {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
            <CardDescription>
              {selectedDateTasks.length === 0
                ? "No tasks due on this date"
                : `${selectedDateTasks.length} task${
                    selectedDateTasks.length !== 1 ? "s" : ""
                  } due`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No tasks scheduled for this date
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <Dialog key={task.id}>
                    <DialogTrigger asChild>
                      <Card className="cursor-pointer hover:bg-accent transition-colors">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
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
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{task.name}</DialogTitle>
                        <DialogDescription>
                          <div className="mt-4 space-y-2">
                            <div>
                              <span className="font-semibold">Description:</span>
                              <p className="text-sm mt-1">{task.description}</p>
                            </div>
                            <div>
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
      </div>

      {/* Upcoming tasks summary */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks This Month</CardTitle>
          <CardDescription>
            All tasks due in {format(currentMonth, "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No tasks scheduled for this month
            </p>
          ) : (
            <div className="space-y-2">
              {tasks
                .sort(
                  (a, b) =>
                    new Date(a.nextDueDate).getTime() -
                    new Date(b.nextDueDate).getTime()
                )
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.name}</span>
                        <Badge className={getCategoryColor(task.category)}>
                          {task.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.home.address}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {format(new Date(task.nextDueDate), "MMM d")}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

