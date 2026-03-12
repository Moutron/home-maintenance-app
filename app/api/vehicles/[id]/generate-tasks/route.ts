import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNextDueDate } from "@/lib/utils/task-recurrence";

async function getOrCreateUser(clerkId: string, email: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId, email },
    });
  }
  return user;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await context.params;
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }
    const user = await getOrCreateUser(clerkId, clerkUser.emailAddresses[0].emailAddress);
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: user.id },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const templates = await prisma.taskTemplate.findMany({
      where: {
        isActive: true,
        category: "VEHICLE",
      },
    });
    if (templates.length === 0) {
      return NextResponse.json(
        { error: "No vehicle task templates found. Run database seed." },
        { status: 404 }
      );
    }

    const existingByTemplate = await prisma.maintenanceTask.findMany({
      where: {
        vehicleId,
        completed: false,
        templateId: { in: templates.map((t) => t.id) },
      },
      select: { templateId: true },
    });
    const existingTemplateIds = new Set(
      existingByTemplate.map((t) => t.templateId).filter(Boolean) as string[]
    );

    const created: { id: string; name: string }[] = [];
    for (const template of templates) {
      if (existingTemplateIds.has(template.id)) continue;
      const nextDueDate = calculateNextDueDate(template.baseFrequency);
      const task = await prisma.maintenanceTask.create({
        data: {
          vehicleId,
          homeId: null,
          templateId: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          frequency: template.baseFrequency,
          nextDueDate,
          costEstimate:
            template.costRangeMin != null && template.costRangeMax != null
              ? (template.costRangeMin + template.costRangeMax) / 2
              : null,
        },
      });
      created.push({ id: task.id, name: task.name });
    }

    return NextResponse.json({
      message: `Created ${created.length} maintenance task(s) for this vehicle.`,
      created,
    });
  } catch (error) {
    console.error("Error generating vehicle tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate vehicle tasks" },
      { status: 500 }
    );
  }
}
