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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Calendar,
  Home,
  Wrench,
  Clock,
  ListTodo,
  History,
  Plus,
  Shield,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  ArrowRight,
  Bell,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DashboardData = {
  stats: {
    upcomingTasks: number;
    overdueTasks: number;
    tasksDueToday: number;
    completedThisMonth: number;
    totalSpending: number;
    monthlySpending: number;
    yearlySpending: number;
    completionRate: number;
    totalTasks: number;
    activeTasks: number;
  };
  alerts: {
    overdueTasks: any[];
    tasksDueToday: any[];
    warrantiesExpiring30: any[];
    warrantiesExpiring60: any[];
    warrantiesExpiring90: any[];
    itemsNeedingAttention: any[];
  };
  tasks: {
    upcoming: any[];
    overdue: any[];
    dueToday: any[];
  };
  spending: {
    monthly: { month: string; spending: number }[];
    yearly: { year: string; spending: number }[];
    byCategory: { category: string; amount: number }[];
  };
  activity: any[];
  homes: any[];
};

const COLORS = {
  HVAC: "#3b82f6",
  PLUMBING: "#10b981",
  EXTERIOR: "#f59e0b",
  STRUCTURAL: "#8b5cf6",
  LANDSCAPING: "#84cc16",
  APPLIANCE: "#f97316",
  SAFETY: "#ef4444",
  ELECTRICAL: "#6366f1",
  OTHER: "#6b7280",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHome, setSelectedHome] = useState<string>("all");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      HVAC: "bg-blue-100 text-blue-800",
      PLUMBING: "bg-green-100 text-green-800",
      EXTERIOR: "bg-yellow-100 text-yellow-800",
      STRUCTURAL: "bg-purple-100 text-purple-800",
      LANDSCAPING: "bg-lime-100 text-lime-800",
      APPLIANCE: "bg-orange-100 text-orange-800",
      SAFETY: "bg-red-100 text-red-800",
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
    return colors[priority] || colors.low;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load dashboard data</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { stats, alerts, tasks, spending, activity, homes } = data;

  // Calculate total alerts
  const totalAlerts =
    alerts.overdueTasks.length +
    alerts.tasksDueToday.length +
    alerts.warrantiesExpiring30.length +
    alerts.itemsNeedingAttention.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your home maintenance
          </p>
        </div>
        {homes.length > 1 && (
          <select
            value={selectedHome}
            onChange={(e) => setSelectedHome(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="all">All Homes</option>
            {homes.map((home) => (
              <option key={home.id} value={home.id}>
                {home.address}, {home.city}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Critical Alerts Banner */}
      {totalAlerts > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <Bell className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">
            {totalAlerts} Alert{totalAlerts !== 1 ? "s" : ""} Requiring Attention
          </AlertTitle>
          <AlertDescription className="text-red-700">
            {alerts.overdueTasks.length > 0 && (
              <span>{alerts.overdueTasks.length} overdue task{alerts.overdueTasks.length !== 1 ? "s" : ""} • </span>
            )}
            {alerts.tasksDueToday.length > 0 && (
              <span>{alerts.tasksDueToday.length} task{alerts.tasksDueToday.length !== 1 ? "s" : ""} due today • </span>
            )}
            {alerts.warrantiesExpiring30.length > 0 && (
              <span>{alerts.warrantiesExpiring30.length} warrant{alerts.warrantiesExpiring30.length !== 1 ? "ies" : "y"} expiring soon • </span>
            )}
            {alerts.itemsNeedingAttention.length > 0 && (
              <span>{alerts.itemsNeedingAttention.length} item{alerts.itemsNeedingAttention.length !== 1 ? "s" : ""} needing attention</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.tasksDueToday}
            </div>
            <p className="text-xs text-muted-foreground">Tasks due today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingTasks}</div>
            <p className="text-xs text-muted-foreground">Due in next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.monthlySpending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">Tasks completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalSpending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTasks}</div>
            <p className="text-xs text-muted-foreground">Out of {stats.totalTasks} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/tasks">
          <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">View All Tasks</CardTitle>
              <ListTodo className="h-4 w-4" />
            </CardHeader>
          </Card>
        </Link>
        <Link href="/maintenance-history">
          <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Add Record</CardTitle>
              <Plus className="h-4 w-4" />
            </CardHeader>
          </Card>
        </Link>
        <Link href="/calendar">
          <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">View Calendar</CardTitle>
              <Calendar className="h-4 w-4" />
            </CardHeader>
          </Card>
        </Link>
        <Link href="/budget">
          <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">View Budget</CardTitle>
              <BarChart3 className="h-4 w-4" />
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spending.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${(value ?? 0).toLocaleString()}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Spending"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Estimated costs by task category</CardDescription>
          </CardHeader>
          <CardContent>
            {spending.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Tooltip formatter={(value) => `$${(value ?? 0).toLocaleString()}`} />
                  <Legend />
                  <Pie
                    data={spending.byCategory}
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {spending.byCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.category as keyof typeof COLORS] || COLORS.OTHER}
                      />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No spending data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks and Alerts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overdue Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Overdue Tasks
                </CardTitle>
                <CardDescription>Tasks that need immediate attention</CardDescription>
              </div>
              <Badge variant="destructive">{alerts.overdueTasks.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.overdueTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No overdue tasks! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.overdueTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{task.name}</p>
                        <Badge className={getCategoryColor(task.category)} variant="outline">
                          {task.category}
                        </Badge>
                        {task.priority && (
                          <Badge className={getPriorityColor(task.priority)} variant="outline">
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.home.address}, {task.home.city}
                      </p>
                      <p className="text-xs text-red-600 font-medium mt-1">
                        Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
                {alerts.overdueTasks.length > 5 && (
                  <Link href="/tasks?filter=overdue">
                    <Button variant="outline" className="w-full">
                      View All {alerts.overdueTasks.length} Overdue Tasks
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Due Today */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Tasks Due Today
                </CardTitle>
                <CardDescription>Tasks scheduled for today</CardDescription>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                {alerts.tasksDueToday.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.tasksDueToday.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tasks due today!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.tasksDueToday.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{task.name}</p>
                        <Badge className={getCategoryColor(task.category)} variant="outline">
                          {task.category}
                        </Badge>
                        {task.priority && (
                          <Badge className={getPriorityColor(task.priority)} variant="outline">
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.home.address}, {task.home.city}
                      </p>
                    </div>
                  </div>
                ))}
                {alerts.tasksDueToday.length > 5 && (
                  <Link href="/tasks?filter=today">
                    <Button variant="outline" className="w-full">
                      View All {alerts.tasksDueToday.length} Tasks Due Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warranties and Items Needing Attention */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Warranties Expiring */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Warranties Expiring
                </CardTitle>
                <CardDescription>Warranties expiring in the next 90 days</CardDescription>
              </div>
              <Badge variant="outline">
                {alerts.warrantiesExpiring30.length + alerts.warrantiesExpiring60.length + alerts.warrantiesExpiring90.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.warrantiesExpiring30.length === 0 &&
            alerts.warrantiesExpiring60.length === 0 &&
            alerts.warrantiesExpiring90.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No warranties expiring soon!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...alerts.warrantiesExpiring30, ...alerts.warrantiesExpiring60, ...alerts.warrantiesExpiring90]
                  .slice(0, 5)
                  .map((warranty) => (
                    <div
                      key={warranty.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{warranty.name}</p>
                          {warranty.daysUntilExpiry <= 30 && (
                            <Badge variant="destructive">Expires Soon</Badge>
                          )}
                        </div>
                        {warranty.brand && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {warranty.brand} {warranty.model}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {warranty.home.address}, {warranty.home.city}
                        </p>
                        <p className="text-xs text-orange-600 font-medium mt-1">
                          Expires in {warranty.daysUntilExpiry} day{warranty.daysUntilExpiry !== 1 ? "s" : ""} • {format(new Date(warranty.expiryDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                <Link href="/warranties">
                  <Button variant="outline" className="w-full">
                    View All Warranties
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Needing Attention */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Items Needing Attention
                </CardTitle>
                <CardDescription>Items approaching end of life (80%+)</CardDescription>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                {alerts.itemsNeedingAttention.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.itemsNeedingAttention.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All items in good condition!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.itemsNeedingAttention.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{item.name}</p>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          {item.lifespanPercentage}% used
                        </Badge>
                      </div>
                      {item.brand && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.brand} {item.model}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {item.home.address}, {item.home.city}
                      </p>
                      <p className="text-xs text-orange-600 font-medium mt-1">
                        Age: {item.age} years • Expected: {item.expectedLifespan} years
                      </p>
                    </div>
                  </div>
                ))}
                {alerts.itemsNeedingAttention.length > 5 && (
                  <Link href="/inventory">
                    <Button variant="outline" className="w-full">
                      View All Items
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>Tasks due in the next 7 days</CardDescription>
            </div>
            <Badge>{tasks.upcoming.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.upcoming.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming tasks this week</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.upcoming.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{task.name}</p>
                      <Badge className={getCategoryColor(task.category)} variant="outline">
                        {task.category}
                      </Badge>
                      {task.priority && (
                        <Badge className={getPriorityColor(task.priority)} variant="outline">
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.home.address}, {task.home.city}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Due: {format(new Date(task.nextDueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.upcoming.length >= 10 && (
                <Link href="/tasks?filter=upcoming">
                  <Button variant="outline" className="w-full">
                    View All Upcoming Tasks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest maintenance activities</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.type === "task_completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Wrench className="h-4 w-4 text-blue-600" />
                      )}
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.type === "task_completed" ? "Task Completed" : "Maintenance Recorded"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.home.address}, {item.home.city}
                    </p>
                    {item.cost && (
                      <p className="text-xs font-medium text-green-600 mt-1">
                        Cost: ${item.cost.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.date), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              <Link href="/maintenance-history">
                <Button variant="outline" className="w-full">
                  View Full History
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
