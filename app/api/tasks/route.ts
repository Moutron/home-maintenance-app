import { Prisma } from "@prisma/client";
import type { TaskCategory } from "@/lib/schema-enums";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations/task";

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

    const searchParams = request.nextUrl.searchParams;
    const homeId = searchParams.get("homeId");
    const completed = searchParams.get("completed");
    const category = searchParams.get("category");

    // Get user's homes
    const homes = await prisma.home.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const homeIds = homes.map((h: { id: string }) => h.id);

    if (homeIds.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    // Build where clause
    const where: Prisma.MaintenanceTaskWhereInput = {
      homeId: homeId ? homeId : { in: homeIds },
      // Filter out snoozed tasks (only show if snoozedUntil is null or in the past)
      AND: [
        {
          OR: [
            { snoozedUntil: null },
            { snoozedUntil: { lt: new Date() } },
          ],
        },
      ],
    };

    if (completed !== null) {
      where.completed = completed === "true";
    }

    if (category) {
      where.category = category as TaskCategory;
    }

    const tasks = await prisma.maintenanceTask.findMany({
      where,
      include: {
        home: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            yearBuilt: true,
            homeType: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            educationalContent: true,
            diyDifficulty: true,
          },
        },
      },
      orderBy: {
        nextDueDate: "asc",
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
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
    const validatedData = createTaskSchema.parse(body);

    // Verify home belongs to user
    const home = await prisma.home.findFirst({
      where: {
        id: validatedData.homeId,
        userId: user.id,
      },
    });

    if (!home) {
      return NextResponse.json(
        { error: "Home not found or access denied" },
        { status: 404 }
      );
    }

    const task = await prisma.maintenanceTask.create({
      data: {
        homeId: validatedData.homeId,
        templateId: validatedData.templateId,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        frequency: validatedData.frequency,
        nextDueDate: new Date(validatedData.nextDueDate),
        costEstimate: validatedData.costEstimate,
        notes: validatedData.notes,
        snoozedUntil: validatedData.snoozedUntil ? new Date(validatedData.snoozedUntil) : null,
        customRecurrence: validatedData.customRecurrence ?? undefined,
      },
      include: {
        home: {
          select: {
            id: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task id is required" },
        { status: 400 }
      );
    }

    // Verify task belongs to user's home
    const task = await prisma.maintenanceTask.findUnique({
      where: { id },
      include: {
        home: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const userHomes = await prisma.home.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!userHomes.some((h: { id: string }) => h.id === task.homeId)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const validatedData = updateTaskSchema.parse(updateData);

    const updatedTask = await prisma.maintenanceTask.update({
      where: { id },
      data: {
        ...validatedData,
        nextDueDate: validatedData.nextDueDate
          ? new Date(validatedData.nextDueDate)
          : undefined,
        completedDate: validatedData.completed
          ? validatedData.completedDate || new Date()
          : null,
        snoozedUntil: validatedData.snoozedUntil !== undefined
          ? (validatedData.snoozedUntil ? new Date(validatedData.snoozedUntil) : null)
          : undefined,
        customRecurrence: validatedData.customRecurrence !== undefined
          ? (validatedData.customRecurrence === null ? Prisma.JsonNull : validatedData.customRecurrence)
          : undefined,
      },
    });

    // If task is completed, create a CompletedTask record and recalculate next due date
    if (validatedData.completed && !task.completed) {
      await prisma.completedTask.create({
        data: {
          taskId: id,
          userId: user.id,
          completedDate: validatedData.completedDate || new Date(),
        },
      });

      // Recalculate next due date based on frequency or custom recurrence
      const { calculateNextDueDate } = await import("@/lib/utils/task-recurrence");
      const completedDate = validatedData.completedDate || new Date();
      const customRecurrence = updatedTask.customRecurrence as { interval: number; unit: "days" | "weeks" | "months" } | null;
      
      const nextDueDate = calculateNextDueDate(
        updatedTask.frequency,
        completedDate,
        customRecurrence
      );

      // Update the task with the new next due date and reset completed status
      const recurringTask = await prisma.maintenanceTask.update({
        where: { id },
        data: {
          nextDueDate,
          completed: false, // Reset for next occurrence
          completedDate: null,
        },
      });

      return NextResponse.json({ task: recurringTask });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

