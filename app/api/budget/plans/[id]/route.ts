import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

    const budgetPlan = await prisma.budgetPlan.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        alerts: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!budgetPlan) {
      return NextResponse.json(
        { error: "Budget plan not found" },
        { status: 404 }
      );
    }

    // Calculate actual spending for this budget period
    const startDate = new Date(budgetPlan.startDate);
    const endDate = new Date(budgetPlan.endDate);

    // Get spending from completed tasks
    const homes = await prisma.home.findMany({
      where: {
        userId: user.id,
        ...(budgetPlan.homeId ? { id: budgetPlan.homeId } : {}),
      },
      select: { id: true },
    });

    const homeIds = homes.map((h: { id: string }) => h.id);

    const completedTasks = await prisma.completedTask.findMany({
      where: {
        userId: user.id,
        task: {
          homeId: { in: homeIds },
          ...(budgetPlan.category
            ? { category: budgetPlan.category as any }
            : {}),
        },
        completedDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        task: {
          select: {
            category: true,
            home: {
              select: {
                address: true,
                city: true,
              },
            },
          },
        },
      },
    });

    // Get spending from DIY projects
    const diyProjects = await prisma.diyProject.findMany({
      where: {
        userId: user.id,
        ...(budgetPlan.homeId ? { homeId: budgetPlan.homeId } : {}),
        ...(budgetPlan.category
          ? { category: budgetPlan.category as any }
          : {}),
        OR: [
          {
            actualStartDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            actualEndDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        actualCost: true,
        budget: true,
        category: true,
      },
    });

    const taskSpending = completedTasks.reduce(
      (sum: number, task: { actualCost: number | null }) => sum + (task.actualCost || 0),
      0
    );

    const projectSpending = diyProjects.reduce(
      (sum: number, project: { actualCost: number | null }) => sum + (project.actualCost || 0),
      0
    );

    const totalSpent = taskSpending + projectSpending;
    const remaining = budgetPlan.amount - totalSpent;
    const percentUsed = (totalSpent / budgetPlan.amount) * 100;

    return NextResponse.json({
      ...budgetPlan,
      spending: {
        totalSpent,
        remaining,
        percentUsed,
        taskSpending,
        projectSpending,
        completedTasks: completedTasks.length,
        diyProjects: diyProjects.length,
      },
    });
  } catch (error) {
    console.error("Error fetching budget plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

    const body = await request.json();
    const { name, amount, startDate, endDate, isActive } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    const budgetPlan = await prisma.budgetPlan.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: updateData,
    });

    if (budgetPlan.count === 0) {
      return NextResponse.json(
        { error: "Budget plan not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.budgetPlan.findUnique({
      where: { id },
    });

    return NextResponse.json({ budgetPlan: updated });
  } catch (error) {
    console.error("Error updating budget plan:", error);
    return NextResponse.json(
      { error: "Failed to update budget plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

    const budgetPlan = await prisma.budgetPlan.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (budgetPlan.count === 0) {
      return NextResponse.json(
        { error: "Budget plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget plan:", error);
    return NextResponse.json(
      { error: "Failed to delete budget plan" },
      { status: 500 }
    );
  }
}

