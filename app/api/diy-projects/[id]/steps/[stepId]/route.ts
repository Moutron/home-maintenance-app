import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getOrCreateUser(clerkId: string, email: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (user) {
    if (user.email !== email) {
      user = await prisma.user.update({
        where: { clerkId },
        data: { email },
      });
    }
    return user;
  }

  user = await prisma.user.findFirst({
    where: { email },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { clerkId },
    });
    return user;
  }

  try {
    user = await prisma.user.create({
      data: {
        clerkId,
        email,
      },
    });
    return user;
  } catch (createError: any) {
    if (createError?.code === "P2002") {
      user = await prisma.user.findFirst({
        where: { email },
      });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId },
        });
        return user;
      }
    }
    throw createError;
  }
}

const updateStepSchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
  actualHours: z.number().positive().optional(),
  notes: z.string().optional(),
});

// PATCH - Update step status
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await context.params;
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

    // Verify project belongs to user
    const project = await prisma.diyProject.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Verify step belongs to project
    const step = await prisma.projectStep.findFirst({
      where: {
        id: stepId,
        projectId: id,
      },
    });

    if (!step) {
      return NextResponse.json(
        { error: "Step not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateStepSchema.parse(body);

    const updateData: any = {};
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      if (validatedData.status === "completed") {
        updateData.completedAt = new Date();
      } else if (step.completedAt) {
        updateData.completedAt = null;
      }
    }
    if (validatedData.actualHours !== undefined) {
      updateData.actualHours = validatedData.actualHours;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    const updatedStep = await prisma.projectStep.update({
      where: { id: stepId },
      data: updateData,
    });

    // Update project's actual hours if step hours changed
    if (validatedData.actualHours !== undefined) {
      const allSteps = await prisma.projectStep.findMany({
        where: { projectId: id },
      });
      const totalActualHours = allSteps.reduce((sum, s) => {
        return sum + (s.id === stepId ? validatedData.actualHours! : (s.actualHours || 0));
      }, 0);
      
      await prisma.diyProject.update({
        where: { id },
        data: { actualHours: totalActualHours },
      });
    }

    return NextResponse.json({ step: updatedStep });
  } catch (error: any) {
    console.error("Error updating step:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to update step",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

