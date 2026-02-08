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

    // Get all DIY projects with budget information
    const projects = await prisma.diyProject.findMany({
      where: {
        userId: user.id,
      },
      include: {
        home: {
          select: {
            address: true,
            city: true,
            state: true,
          },
        },
        materials: {
          select: {
            purchased: true,
            totalPrice: true,
          },
        },
        tools: {
          select: {
            owned: true,
            rentalCost: true,
            rentalDays: true,
            purchaseCost: true,
            purchased: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate actual costs for each project
    const projectsWithCosts = projects.map((project: (typeof projects)[number]) => {
      // Calculate from materials
      const materialCost = project.materials
        .filter((m: { purchased: boolean; totalPrice: number | null }) => m.purchased && m.totalPrice)
        .reduce((sum: number, m: { totalPrice: number | null }) => sum + (m.totalPrice || 0), 0);

      // Calculate from tools
      const toolCost = project.tools
        .filter((t: { owned: boolean; purchased: boolean }) => !t.owned && t.purchased)
        .reduce((sum: number, t: { rentalCost: number | null; rentalDays: number | null; purchaseCost: number | null }) => {
          if (t.rentalCost && t.rentalDays) {
            return sum + t.rentalCost * t.rentalDays;
          }
          if (t.purchaseCost) {
            return sum + t.purchaseCost;
          }
          return sum;
        }, 0);

      const calculatedCost = materialCost + toolCost;
      const actualCost = project.actualCost || calculatedCost;

      const budget = project.budget || 0;
      const remaining = budget > 0 ? budget - actualCost : 0;
      const percentUsed = budget > 0 ? (actualCost / budget) * 100 : 0;
      const isOverBudget = budget > 0 && actualCost > budget;

      return {
        id: project.id,
        name: project.name,
        category: project.category,
        status: project.status,
        budget,
        estimatedCost: project.estimatedCost,
        actualCost,
        remaining,
        percentUsed,
        isOverBudget,
        home: project.home,
        createdAt: project.createdAt,
      };
    });

    // Calculate totals
    const totalBudget = projectsWithCosts.reduce(
      (sum: number, p: { budget: number }) => sum + p.budget,
      0
    );
    const totalSpent = projectsWithCosts.reduce(
      (sum: number, p: { actualCost: number }) => sum + p.actualCost,
      0
    );
    const totalRemaining = totalBudget - totalSpent;
    const projectsOverBudget = projectsWithCosts.filter((p: { isOverBudget: boolean }) => p.isOverBudget)
      .length;

    return NextResponse.json({
      projects: projectsWithCosts,
      summary: {
        totalProjects: projects.length,
        totalBudget,
        totalSpent,
        totalRemaining,
        projectsOverBudget,
        averageBudget: projects.length > 0 ? totalBudget / projects.length : 0,
        averageSpent: projects.length > 0 ? totalSpent / projects.length : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching project budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch project budgets" },
      { status: 500 }
    );
  }
}

