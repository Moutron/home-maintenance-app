import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subDays, addDays, startOfYear, endOfYear } from "date-fns";

// Helper function to get or create user from Clerk
async function getOrCreateUser(clerkId: string, email: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId,
        email,
      },
    });
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const user = await getOrCreateUser(clerkId, email);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysFromNow = addDays(today, 7);
    const thirtyDaysFromNow = addDays(today, 30);
    const ninetyDaysFromNow = addDays(today, 90);
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    const startOfCurrentYear = startOfYear(now);
    const endOfCurrentYear = endOfYear(now);

    // Get user's homes
    const homes = await prisma.home.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const homeIds = homes.map((h: { id: string }) => h.id);

    if (homeIds.length === 0) {
      return NextResponse.json({
        stats: {
          upcomingTasks: 0,
          overdueTasks: 0,
          tasksDueToday: 0,
          completedThisMonth: 0,
          totalSpending: 0,
          monthlySpending: 0,
          yearlySpending: 0,
          completionRate: 0,
          totalTasks: 0,
          activeTasks: 0,
        },
        alerts: {
          overdueTasks: [],
          tasksDueToday: [],
          warrantiesExpiring30: [],
          warrantiesExpiring60: [],
          warrantiesExpiring90: [],
          itemsNeedingAttention: [],
        },
        tasks: {
          upcoming: [],
          overdue: [],
          dueToday: [],
        },
        spending: {
          monthly: [],
          yearly: [],
          byCategory: [],
        },
        activity: [],
        homes: [],
      });
    }

    // Fetch all tasks
    const allTasks = await prisma.maintenanceTask.findMany({
      where: {
        homeId: { in: homeIds },
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lt: now } },
        ],
      },
      include: {
        home: {
          select: {
            id: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: {
        nextDueDate: "asc",
      },
    });

    // Fetch maintenance history for spending
    const history = await prisma.maintenanceHistory.findMany({
      where: {
        homeId: { in: homeIds },
      },
      select: {
        cost: true,
        serviceDate: true,
        serviceType: true,
      },
    });

    // Fetch warranties from appliances, features, and systems
    const allAppliances = await prisma.appliance.findMany({
      where: { homeId: { in: homeIds } },
      select: {
        id: true,
        applianceType: true,
        brand: true,
        model: true,
        warrantyExpiry: true,
        installDate: true,
        expectedLifespan: true,
        home: {
          select: {
            id: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const allExteriorFeatures = await prisma.exteriorFeature.findMany({
      where: { homeId: { in: homeIds } },
      select: {
        id: true,
        featureType: true,
        material: true,
        warrantyExpiry: true,
        installDate: true,
        expectedLifespan: true,
        home: {
          select: {
            id: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const allInteriorFeatures = await prisma.interiorFeature.findMany({
      where: { homeId: { in: homeIds } },
      select: {
        id: true,
        featureType: true,
        material: true,
        warrantyExpiry: true,
        installDate: true,
        expectedLifespan: true,
        home: {
          select: {
            id: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const allSystems = await prisma.homeSystem.findMany({
      where: { homeId: { in: homeIds } },
      select: {
        id: true,
        systemType: true,
        brand: true,
        model: true,
        installDate: true,
        expectedLifespan: true,
        home: {
          select: {
            id: true,
            address: true,
            city: true,
          },
        },
      },
    });

    // Calculate task stats
    const overdueTasks = allTasks.filter(
      (task) => !task.completed && new Date(task.nextDueDate) < today
    );

    const tasksDueToday = allTasks.filter(
      (task) =>
        !task.completed &&
        new Date(task.nextDueDate).toDateString() === today.toDateString()
    );

    const upcomingTasks = allTasks.filter(
      (task) =>
        !task.completed &&
        new Date(task.nextDueDate) >= today &&
        new Date(task.nextDueDate) <= sevenDaysFromNow
    );

    const completedThisMonth = allTasks.filter(
      (task) =>
        task.completed &&
        task.completedDate &&
        new Date(task.completedDate) >= startOfCurrentMonth &&
        new Date(task.completedDate) <= endOfCurrentMonth
    ).length;

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: { completed: boolean }) => t.completed).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate spending
    const totalSpending = history.reduce(
      (sum: number, record: { cost: number | null }) => sum + (record.cost || 0),
      0
    );

    const monthlySpending = history
      .filter(
        (record: { serviceDate: Date }) =>
          new Date(record.serviceDate) >= startOfCurrentMonth &&
          new Date(record.serviceDate) <= endOfCurrentMonth
      )
      .reduce(
        (sum: number, record: { cost: number | null }) => sum + (record.cost || 0),
        0
      );

    const yearlySpending = history
      .filter(
        (record: { serviceDate: Date }) =>
          new Date(record.serviceDate) >= startOfCurrentYear &&
          new Date(record.serviceDate) <= endOfCurrentYear
      )
      .reduce(
        (sum: number, record: { cost: number | null }) => sum + (record.cost || 0),
        0
      );

    // Spending by category (from tasks with cost estimates)
    const spendingByCategory: Record<string, number> = {};
    allTasks.forEach((task: { costEstimate: number | null; category: string }) => {
      if (task.costEstimate) {
        spendingByCategory[task.category] =
          (spendingByCategory[task.category] || 0) + task.costEstimate;
      }
    });

    // Monthly spending trend (last 12 months)
    const monthlySpendingData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subDays(now, i * 30));
      const monthEnd = endOfMonth(monthStart);
      const monthSpending = history
        .filter(
          (record: { serviceDate: Date }) =>
            new Date(record.serviceDate) >= monthStart &&
            new Date(record.serviceDate) <= monthEnd
        )
        .reduce(
          (sum: number, record: { cost: number | null }) => sum + (record.cost || 0),
          0
        );

      monthlySpendingData.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        spending: monthSpending,
      });
    }

    // Yearly spending trend (last 5 years)
    const yearlySpendingData = [];
    const currentYear = now.getFullYear();
    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i;
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const yearSpending = history
        .filter(
          (record: { serviceDate: Date }) =>
            new Date(record.serviceDate) >= yearStart &&
            new Date(record.serviceDate) <= yearEnd
        )
        .reduce(
          (sum: number, record: { cost: number | null }) => sum + (record.cost || 0),
          0
        );

      yearlySpendingData.push({
        year: year.toString(),
        spending: yearSpending,
      });
    }

    // Warranty alerts
    const warrantiesExpiring30: any[] = [];
    const warrantiesExpiring60: any[] = [];
    const warrantiesExpiring90: any[] = [];

    [...allAppliances, ...allExteriorFeatures, ...allInteriorFeatures].forEach((item: { id: string; warrantyExpiry: Date | null; applianceType?: string; featureType?: string; brand?: string | null; model?: string | null; home: unknown }) => {
      if (item.warrantyExpiry) {
        const expiryDate = new Date(item.warrantyExpiry);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const warrantyItem = {
          id: item.id,
          name: "applianceType" in item ? item.applianceType : "featureType" in item ? item.featureType : "",
          type: "applianceType" in item ? "appliance" : "featureType" in item ? "exterior" : "interior",
          brand: "brand" in item ? item.brand : null,
          model: "model" in item ? item.model : null,
          expiryDate: item.warrantyExpiry,
          daysUntilExpiry,
          home: item.home,
        };

        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
          warrantiesExpiring30.push(warrantyItem);
        } else if (daysUntilExpiry > 30 && daysUntilExpiry <= 60) {
          warrantiesExpiring60.push(warrantyItem);
        } else if (daysUntilExpiry > 60 && daysUntilExpiry <= 90) {
          warrantiesExpiring90.push(warrantyItem);
        }
      }
    });

    // Items needing attention (approaching end of life)
    const itemsNeedingAttention: any[] = [];
    [...allAppliances, ...allExteriorFeatures, ...allInteriorFeatures, ...allSystems].forEach(
      (item) => {
        if (item.installDate && item.expectedLifespan) {
          const installDate = new Date(item.installDate);
          const ageInYears =
            (now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          const lifespanPercentage = (ageInYears / item.expectedLifespan) * 100;

          if (lifespanPercentage >= 80) {
            itemsNeedingAttention.push({
              id: item.id,
              name:
                "applianceType" in item
                  ? item.applianceType
                  : "featureType" in item
                  ? item.featureType
                  : "systemType" in item
                  ? item.systemType
                  : "",
              type: "applianceType" in item
                ? "appliance"
                : "featureType" in item
                ? "exterior"
                : "systemType" in item
                ? "system"
                : "interior",
              brand: "brand" in item ? item.brand : null,
              model: "model" in item ? item.model : null,
              age: Math.round(ageInYears),
              expectedLifespan: item.expectedLifespan,
              lifespanPercentage: Math.round(lifespanPercentage),
              home: item.home,
            });
          }
        }
      }
    );

    // Recent activity (last 10 items)
    const recentActivity: any[] = [];

    // Add recent task completions
    const recentCompletedTasks = await prisma.completedTask.findMany({
      where: {
        userId: user.id,
      },
      include: {
        task: {
          include: {
            home: {
              select: {
                address: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedDate: "desc",
      },
      take: 5,
    });

    recentCompletedTasks.forEach((completed: (typeof recentCompletedTasks)[number]) => {
      recentActivity.push({
        type: "task_completed",
        title: completed.task.name,
        description: `Completed ${completed.task.category} task`,
        date: completed.completedDate,
        home: completed.task.home,
        cost: completed.actualCost,
      });
    });

    // Add recent maintenance records
    const recentHistory = await prisma.maintenanceHistory.findMany({
      where: {
        homeId: { in: homeIds },
      },
      include: {
        home: {
          select: {
            address: true,
            city: true,
          },
        },
      },
      orderBy: {
        serviceDate: "desc",
      },
      take: 5,
    });

    recentHistory.forEach((record: (typeof recentHistory)[number]) => {
      recentActivity.push({
        type: "maintenance_recorded",
        title: record.description,
        description: `${record.serviceType} service`,
        date: record.serviceDate,
        home: record.home,
        cost: record.cost,
      });
    });

    // Sort by date and take most recent 10
    recentActivity.sort(
      (a: { date: Date }, b: { date: Date }) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Get home details for display
    const homeDetails = await prisma.home.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
      },
    });

    return NextResponse.json({
      stats: {
        upcomingTasks: upcomingTasks.length,
        overdueTasks: overdueTasks.length,
        tasksDueToday: tasksDueToday.length,
        completedThisMonth,
        totalSpending,
        monthlySpending,
        yearlySpending,
        completionRate,
        totalTasks,
        activeTasks: allTasks.filter((t: { completed: boolean }) => !t.completed).length,
      },
      alerts: {
        overdueTasks: overdueTasks.slice(0, 10).map((task: (typeof overdueTasks)[number]) => ({
          id: task.id,
          name: task.name,
          category: task.category,
          dueDate: task.nextDueDate,
          priority: task.priority,
          home: task.home,
        })),
        tasksDueToday: tasksDueToday.slice(0, 10).map((task: (typeof tasksDueToday)[number]) => ({
          id: task.id,
          name: task.name,
          category: task.category,
          priority: task.priority,
          home: task.home,
        })),
        warrantiesExpiring30,
        warrantiesExpiring60,
        warrantiesExpiring90,
        itemsNeedingAttention,
      },
      tasks: {
        upcoming: upcomingTasks.slice(0, 10).map((task: (typeof upcomingTasks)[number]) => ({
          id: task.id,
          name: task.name,
          description: task.description,
          category: task.category,
          nextDueDate: task.nextDueDate,
          priority: task.priority,
          home: task.home,
        })),
        overdue: overdueTasks.slice(0, 10).map((task: (typeof overdueTasks)[number]) => ({
          id: task.id,
          name: task.name,
          description: task.description,
          category: task.category,
          nextDueDate: task.nextDueDate,
          priority: task.priority,
          home: task.home,
        })),
        dueToday: tasksDueToday.slice(0, 10).map((task: (typeof tasksDueToday)[number]) => ({
          id: task.id,
          name: task.name,
          description: task.description,
          category: task.category,
          priority: task.priority,
          home: task.home,
        })),
      },
      spending: {
        monthly: monthlySpendingData,
        yearly: yearlySpendingData,
        byCategory: Object.entries(spendingByCategory).map(([category, amount]) => ({
          category,
          amount,
        })),
      },
      activity: recentActivity.slice(0, 10),
      homes: homeDetails,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

