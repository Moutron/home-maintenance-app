import { BudgetPeriod, Prisma } from "@prisma/client";
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period"); // MONTHLY, QUARTERLY, ANNUAL
    const isActive = searchParams.get("isActive");

    const where: Prisma.BudgetPlanWhereInput = {
      userId: user.id,
    };

    if (period) {
      where.period = period as BudgetPeriod;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const budgetPlans = await prisma.budgetPlan.findMany({
      where,
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({ budgetPlans });
  } catch (error) {
    console.error("Error fetching budget plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { name, period, amount, startDate, endDate, category, homeId } = body;

    if (!name || !period || !amount || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const budgetPlan = await prisma.budgetPlan.create({
      data: {
        userId: user.id,
        name,
        period,
        amount: parseFloat(amount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        category: category || null,
        homeId: homeId || null,
      },
    });

    return NextResponse.json({ budgetPlan }, { status: 201 });
  } catch (error) {
    console.error("Error creating budget plan:", error);
    return NextResponse.json(
      { error: "Failed to create budget plan" },
      { status: 500 }
    );
  }
}

