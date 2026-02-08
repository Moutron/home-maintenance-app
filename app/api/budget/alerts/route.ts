import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBudgetAlerts } from "@/lib/budget/alerts";

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
    const status = searchParams.get("status"); // PENDING, SENT, DISMISSED

    const where: any = {
      userId: user.id,
    };

    if (status) {
      where.status = status;
    }

    const alerts = await prisma.budgetAlert.findMany({
      where,
      include: {
        budgetPlan: {
          select: {
            name: true,
            amount: true,
            period: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching budget alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for budget alerts (can be called by cron job or manually)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If cron secret is set, require it for POST (manual trigger)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const { userId: clerkId } = await auth();
      if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await checkBudgetAlerts();

    return NextResponse.json({
      success: true,
      alertsChecked: result.alertsChecked,
      alertsCreated: result.alertsCreated,
      alertsSent: result.alertsSent,
    });
  } catch (error) {
    console.error("Error checking budget alerts:", error);
    return NextResponse.json(
      { error: "Failed to check budget alerts" },
      { status: 500 }
    );
  }
}

