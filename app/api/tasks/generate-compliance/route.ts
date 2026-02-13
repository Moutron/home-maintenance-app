import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateComplianceTasks } from "@/lib/utils/compliance-tasks";

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

/**
 * API route to generate compliance tasks for a home
 * Creates tasks based on local regulations and requirements
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { homeId } = body;

    if (!homeId) {
      return NextResponse.json(
        { error: "homeId is required" },
        { status: 400 }
      );
    }

    // Get user
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const user = await getOrCreateUser(clerkId, email);

    // Fetch home
    const home = await prisma.home.findFirst({
      where: {
        id: homeId,
        userId: user.id,
      },
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    // Generate compliance tasks
    const complianceTasks = await generateComplianceTasks(
      home.city,
      home.state,
      home.zipCode,
      home.yearBuilt,
      home.homeType
    );

    if (complianceTasks.length === 0) {
      return NextResponse.json({
        message: "No compliance tasks required for this location",
        tasks: [],
      });
    }

    // Check for existing compliance tasks to avoid duplicates
    const existingTasks = await prisma.maintenanceTask.findMany({
      where: {
        homeId: home.id,
        notes: {
          contains: "LEGALLY REQUIRED",
        },
      },
    });

    const existingTaskNames = new Set(
      existingTasks.map((t: { name: string }) => t.name.toLowerCase())
    );

    // Filter out tasks that already exist
    const newComplianceTasks = complianceTasks.filter(
      (task: { name: string }) => !existingTaskNames.has(task.name.toLowerCase())
    );

    if (newComplianceTasks.length === 0) {
      return NextResponse.json({
        message: "All compliance tasks already exist",
        tasks: existingTasks,
      });
    }

    // Create compliance tasks in database
    const createdTasks = await prisma.$transaction(
      newComplianceTasks.map((task: (typeof newComplianceTasks)[number]) =>
        prisma.maintenanceTask.create({
          data: {
            homeId: home.id,
          name: task.name,
          description: task.description,
          category: task.category as "HVAC" | "PLUMBING" | "EXTERIOR" | "STRUCTURAL" | "LANDSCAPING" | "APPLIANCE" | "SAFETY" | "ELECTRICAL" | "OTHER",
          frequency: task.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "SEASONAL" | "AS_NEEDED",
            nextDueDate: task.nextDueDate,
            priority: task.priority,
            notes: task.isComplianceRequired
              ? `⚠️ LEGALLY REQUIRED: ${task.regulationSource || "Local regulation"}`
              : null,
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: `Generated ${createdTasks.length} compliance tasks`,
        tasks: createdTasks,
        totalComplianceTasks: complianceTasks.length,
        newTasks: createdTasks.length,
        existingTasks: existingTasks.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating compliance tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate compliance tasks" },
      { status: 500 }
    );
  }
}

