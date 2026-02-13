import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Get user's homes
    const homes = await prisma.home.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const homeIds = homes.map((h: { id: string }) => h.id);

    if (homeIds.length === 0) {
      return NextResponse.json({
        totalSpent: 0,
        totalEstimated: 0,
        completedTasks: [],
        upcomingTasks: [],
        monthlySpending: [],
      });
    }

    // Get completed tasks with costs
    const completedTasks = await prisma.completedTask.findMany({
      where: {
        userId: user.id,
        task: {
          homeId: { in: homeIds },
        },
      },
      include: {
        task: {
          include: {
            home: {
              select: {
                address: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedDate: "desc",
      },
    }) as Array<{
      id: string;
      completedDate: Date;
      actualCost: number | null;
      task: { id: string; name: string; category: string; homeId: string };
    }>;

    // Get upcoming tasks with cost estimates
    const upcomingTasks = await prisma.maintenanceTask.findMany({
      where: {
        homeId: { in: homeIds },
        completed: false,
        costEstimate: { not: null },
      },
      include: {
        home: {
          select: {
            address: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: {
        nextDueDate: "asc",
      },
      take: 20,
    });

    // Calculate totals
    const totalSpent = completedTasks.reduce(
      (sum: number, task: { actualCost: number | null }) => sum + (task.actualCost || 0),
      0
    );

    const totalEstimated = upcomingTasks.reduce(
      (sum: number, task: { costEstimate: number | null }) => sum + (task.costEstimate || 0),
      0
    );

    // Calculate monthly spending (last 12 months)
    const monthlySpending: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthTasks = completedTasks.filter((completedTask: { completedDate: Date }) => {
        if (!completedTask.completedDate) return false;
        const taskDate = new Date(completedTask.completedDate);
        return taskDate >= monthStart && taskDate <= monthEnd;
      });

      const monthTotal = monthTasks.reduce(
        (sum, task) => sum + (task.actualCost || 0),
        0
      );

      monthlySpending.push({
        month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        amount: monthTotal,
      });
    }

    return NextResponse.json({
      totalSpent,
      totalEstimated,
      completedTasks: completedTasks.slice(0, 10), // Last 10
      upcomingTasks,
      monthlySpending,
    });
  } catch (error) {
    console.error("Error fetching budget data:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget data" },
      { status: 500 }
    );
  }
}

