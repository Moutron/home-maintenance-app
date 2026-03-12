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
    const vehicleIdParam = searchParams.get("vehicleId");
    const source = searchParams.get("source"); // "home" | "vehicle" – limit to home or vehicle tasks when no specific id
    const completed = searchParams.get("completed");
    const category = searchParams.get("category");

    const homes = await prisma.home.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const homeIds = homes.map((h: { id: string }) => h.id);
    const vehicleIds = vehicles.map((v: { id: string }) => v.id);

    if (homeIds.length === 0 && vehicleIds.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    let taskOwnerCondition: Prisma.MaintenanceTaskWhereInput;
    if (homeId && homeIds.includes(homeId)) {
      taskOwnerCondition = { homeId };
    } else if (vehicleIdParam && vehicleIds.includes(vehicleIdParam)) {
      taskOwnerCondition = { vehicleId: vehicleIdParam };
    } else if (source === "home" && homeIds.length > 0) {
      taskOwnerCondition = { homeId: { in: homeIds } };
    } else if (source === "vehicle" && vehicleIds.length > 0) {
      taskOwnerCondition = { vehicleId: { in: vehicleIds } };
    } else {
      const ownerConditions: Prisma.MaintenanceTaskWhereInput[] = [];
      if (homeIds.length > 0) ownerConditions.push({ homeId: { in: homeIds } });
      if (vehicleIds.length > 0) ownerConditions.push({ vehicleId: { in: vehicleIds } });
      taskOwnerCondition = ownerConditions.length === 1 ? ownerConditions[0]! : { OR: ownerConditions };
    }

    const where: Prisma.MaintenanceTaskWhereInput = {
      ...taskOwnerCondition,
      AND: [
        {
          OR: [
            { snoozedUntil: null },
            { snoozedUntil: { lt: new Date() } },
          ],
        },
      ],
    };

    if (completed !== null && completed !== undefined) {
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
            systems: {
              select: { id: true, systemType: true, brand: true, model: true },
            },
          },
        },
        vehicle: {
          select: {
            id: true,
            nickname: true,
            year: true,
            make: true,
            model: true,
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

    if (validatedData.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: validatedData.vehicleId, userId: user.id },
      });
      if (!vehicle) {
        return NextResponse.json(
          { error: "Vehicle not found or access denied" },
          { status: 404 }
        );
      }
      const task = await prisma.maintenanceTask.create({
        data: {
          homeId: null,
          vehicleId: validatedData.vehicleId,
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
          vehicle: { select: { id: true, nickname: true, year: true, make: true, model: true } },
          template: { select: { id: true, name: true, description: true, educationalContent: true, diyDifficulty: true } },
        },
      });
      return NextResponse.json({ task }, { status: 201 });
    }

    const home = await prisma.home.findFirst({
      where: { id: validatedData.homeId!, userId: user.id },
    });
    if (!home) {
      return NextResponse.json(
        { error: "Home not found or access denied" },
        { status: 404 }
      );
    }

    const task = await prisma.maintenanceTask.create({
      data: {
        homeId: validatedData.homeId!,
        vehicleId: null,
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
        home: { select: { id: true, address: true } },
        template: { select: { id: true, name: true, description: true, educationalContent: true, diyDifficulty: true } },
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

    const task = await prisma.maintenanceTask.findUnique({
      where: { id },
      include: { home: true, vehicle: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [userHomes, userVehicles] = await Promise.all([
      prisma.home.findMany({ where: { userId: user.id }, select: { id: true } }),
      prisma.vehicle.findMany({ where: { userId: user.id }, select: { id: true } }),
    ]);
    const homeIds = userHomes.map((h: { id: string }) => h.id);
    const vehicleIds = userVehicles.map((v: { id: string }) => v.id);
    const ownsTask =
      (task.homeId && homeIds.includes(task.homeId)) ||
      (task.vehicleId && vehicleIds.includes(task.vehicleId));
    if (!ownsTask) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

