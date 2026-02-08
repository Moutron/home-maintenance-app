"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Home,
  AlertTriangle,
  Plus,
  FileText,
  Target,
  BarChart3,
} from "lucide-react";
import { BudgetPlanForm } from "@/components/budget-plan-form";
import Link from "next/link";

type BudgetData = {
  totalSpent: number;
  totalEstimated: number;
  completedTasks: {
    id: string;
    actualCost: number | null;
    completedDate: string;
    task: {
      name: string;
      category: string;
      home: {
        address: string;
        city: string;
        state: string;
      };
    };
  }[];
  upcomingTasks: {
    id: string;
    name: string;
    category: string;
    costEstimate: number | null;
    nextDueDate: string;
    home: {
      address: string;
      city: string;
      state: string;
    };
  }[];
  monthlySpending: {
    month: string;
    amount: number;
  }[];
};

type BudgetPlan = {
  id: string;
  name: string;
  period: string;
  amount: number;
  startDate: string;
  endDate: string;
  category: string | null;
  homeId: string | null;
  isActive: boolean;
  spending?: {
    totalSpent: number;
    remaining: number;
    percentUsed: number;
    taskSpending: number;
    projectSpending: number;
  };
};

type ProjectBudget = {
  id: string;
  name: string;
  category: string;
  status: string;
  budget: number;
  estimatedCost: number | null;
  actualCost: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  home: {
    address: string;
    city: string;
    state: string;
  };
};

type BudgetAlert = {
  id: string;
  alertType: string;
  status: string;
  message: string;
  createdAt: string;
  budgetPlan?: {
    name: string;
    amount: number;
  };
};

export default function BudgetPage() {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [projectBudgets, setProjectBudgets] = useState<ProjectBudget[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBudgetData(),
        fetchBudgetPlans(),
        fetchProjectBudgets(),
        fetchBudgetAlerts(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetData = async () => {
    try {
      const response = await fetch("/api/budget");
      if (response.ok) {
        const data = await response.json();
        setBudgetData(data);
      }
    } catch (error) {
      console.error("Error fetching budget data:", error);
    }
  };

  const fetchBudgetPlans = async () => {
    try {
      const response = await fetch("/api/budget/plans?isActive=true");
      if (response.ok) {
        const data = await response.json();
        setBudgetPlans(data.budgetPlans || []);
      }
    } catch (error) {
      console.error("Error fetching budget plans:", error);
    }
  };

  const fetchProjectBudgets = async () => {
    try {
      const response = await fetch("/api/budget/projects");
      if (response.ok) {
        const data = await response.json();
        setProjectBudgets(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching project budgets:", error);
    }
  };

  const fetchBudgetAlerts = async () => {
    try {
      const response = await fetch("/api/budget/alerts?status=PENDING");
      if (response.ok) {
        const data = await response.json();
        setBudgetAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching budget alerts:", error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading budget data...</p>
      </div>
    );
  }

  if (!budgetData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Failed to load budget data</p>
      </div>
    );
  }

  const maxMonthlySpending = Math.max(
    ...budgetData.monthlySpending.map((m) => m.amount),
    1
  );

  const totalBudgetPlans = budgetPlans.reduce(
    (sum, plan) => sum + plan.amount,
    0
  );
  const totalSpentOnPlans = budgetPlans.reduce(
    (sum, plan) => sum + (plan.spending?.totalSpent || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget & Spending</h1>
          <p className="text-muted-foreground">
            Track your home maintenance costs and budgets
          </p>
        </div>
        <Dialog open={showPlanForm} onOpenChange={setShowPlanForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Budget Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Budget Plan</DialogTitle>
              <DialogDescription>
                Set up a monthly, quarterly, or annual budget for your home
                maintenance
              </DialogDescription>
            </DialogHeader>
            <BudgetPlanForm
              onSuccess={() => {
                setShowPlanForm(false);
                fetchAllData();
              }}
              onCancel={() => setShowPlanForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budgetAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-3 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    {alert.budgetPlan && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Budget: {alert.budgetPlan.name}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      alert.alertType === "EXCEEDED_LIMIT"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {alert.alertType.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Target className="mr-2 h-4 w-4" />
            Budget Plans
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Home className="mr-2 h-4 w-4" />
            Project Budgets
          </TabsTrigger>
          <TabsTrigger value="spending">
            <DollarSign className="mr-2 h-4 w-4" />
            Spending
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${budgetData.totalSpent.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  All completed tasks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Estimated Upcoming
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${budgetData.totalEstimated.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Next 20 tasks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Budget Plans Total
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalBudgetPlans.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {budgetPlans.length} active plan{budgetPlans.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Monthly
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {(
                    budgetData.monthlySpending.reduce(
                      (sum, m) => sum + m.amount,
                      0
                    ) / 12
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Last 12 months</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Budget Plans Summary */}
          {budgetPlans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Budget Plans</CardTitle>
                <CardDescription>
                  Your current budget plans and spending
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetPlans.map((plan) => {
                    const spending = plan.spending || {
                      totalSpent: 0,
                      remaining: plan.amount,
                      percentUsed: 0,
                    };
                    return (
                      <div
                        key={plan.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {plan.period} • {format(new Date(plan.startDate), "MMM d")} - {format(new Date(plan.endDate), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Badge>{plan.period}</Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-medium">
                              ${plan.amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Spent</span>
                            <span
                              className={`font-medium ${
                                spending.percentUsed >= 100
                                  ? "text-red-600"
                                  : spending.percentUsed >= 80
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }`}
                            >
                              ${spending.totalSpent.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                spending.percentUsed >= 100
                                  ? "bg-red-600"
                                  : spending.percentUsed >= 80
                                  ? "bg-orange-600"
                                  : "bg-green-600"
                              }`}
                              style={{
                                width: `${Math.min(spending.percentUsed, 100)}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{spending.percentUsed.toFixed(1)}% used</span>
                            <span>
                              ${spending.remaining.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              remaining
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Budget Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          {budgetPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  No budget plans yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create a budget plan to track your spending
                </p>
                <Button onClick={() => setShowPlanForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Budget Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {budgetPlans.map((plan) => {
                const spending = plan.spending || {
                  totalSpent: 0,
                  remaining: plan.amount,
                  percentUsed: 0,
                };
                return (
                  <Card key={plan.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>
                            {plan.period} • {format(new Date(plan.startDate), "MMM d, yyyy")} - {format(new Date(plan.endDate), "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                        <Badge>{plan.period}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="text-2xl font-bold">
                            ${plan.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Spent</p>
                          <p
                            className={`text-2xl font-bold ${
                              spending.percentUsed >= 100
                                ? "text-red-600"
                                : spending.percentUsed >= 80
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}
                          >
                            ${spending.totalSpent.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Remaining
                          </p>
                          <p
                            className={`text-2xl font-bold ${
                              spending.remaining >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${spending.remaining.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Usage
                          </span>
                          <span className="font-medium">
                            {spending.percentUsed.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              spending.percentUsed >= 100
                                ? "bg-red-600"
                                : spending.percentUsed >= 80
                                ? "bg-orange-600"
                                : "bg-green-600"
                            }`}
                            style={{
                              width: `${Math.min(spending.percentUsed, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      {spending.taskSpending !== undefined && (
                        <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Task Spending
                            </p>
                            <p className="text-lg font-semibold">
                              ${spending.taskSpending.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Project Spending
                            </p>
                            <p className="text-lg font-semibold">
                              ${spending.projectSpending.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Project Budgets Tab */}
        <TabsContent value="projects" className="space-y-6">
          {projectBudgets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  No projects with budgets yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create a DIY project and set a budget to track it here
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
            <div className="space-y-4">
              {projectBudgets.map((project) => (
                <Card
                  key={project.id}
                  className={
                    project.isOverBudget ? "border-red-200 bg-red-50" : ""
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>
                          <Link
                            href={`/diy-projects/${project.id}`}
                            className="hover:underline"
                          >
                            {project.name}
                          </Link>
                        </CardTitle>
                        <CardDescription>
                          {project.home.address}, {project.home.city}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getCategoryColor(project.category)}>
                          {project.category}
                        </Badge>
                        {project.isOverBudget && (
                          <Badge variant="destructive">Over Budget</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="text-xl font-bold">
                          ${project.budget.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Spent</p>
                        <p
                          className={`text-xl font-bold ${
                            project.isOverBudget
                              ? "text-red-600"
                              : project.percentUsed >= 80
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          ${project.actualCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Remaining
                        </p>
                        <p
                          className={`text-xl font-bold ${
                            project.remaining >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ${project.remaining.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Usage</span>
                        <span className="font-medium">
                          {project.percentUsed.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            project.isOverBudget
                              ? "bg-red-600"
                              : project.percentUsed >= 80
                              ? "bg-orange-600"
                              : "bg-green-600"
                          }`}
                          style={{
                            width: `${Math.min(project.percentUsed, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Spending Tab */}
        <TabsContent value="spending" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Spending Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Spending</CardTitle>
                <CardDescription>Last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {budgetData.monthlySpending.map((month) => (
                    <div key={month.month} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{month.month}</span>
                        <span className="font-medium">
                          ${month.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{
                            width: `${(month.amount / maxMonthlySpending) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Spending */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Spending</CardTitle>
                <CardDescription>Last 10 completed tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {budgetData.completedTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No completed tasks yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {budgetData.completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between border rounded-lg p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{task.task.name}</span>
                            <Badge className={getCategoryColor(task.task.category)}>
                              {task.task.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Home className="h-3 w-3" />
                            <span>
                              {task.task.home.address}, {task.task.home.city}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(task.completedDate), "MMM d, yyyy")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${(task.actualCost || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Estimated Costs</CardTitle>
              <CardDescription>
                Cost estimates for your next maintenance tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budgetData.upcomingTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No upcoming tasks with cost estimates
                </p>
              ) : (
                <div className="space-y-3">
                  {budgetData.upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between border rounded-lg p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{task.name}</span>
                          <Badge className={getCategoryColor(task.category)}>
                            {task.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Home className="h-3 w-3" />
                          <span>
                            {task.home.address}, {task.home.city}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Due: {format(new Date(task.nextDueDate), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${(task.costEstimate || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Estimate
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
