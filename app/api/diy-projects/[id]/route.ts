import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Helper function to get or create user from Clerk
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

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["NOT_STARTED", "PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  estimatedHours: z.number().int().positive().optional(),
  actualHours: z.number().positive().optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
  budget: z.number().positive().optional(),
  targetStartDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  satisfactionRating: z.number().int().min(1).max(5).optional(),
  wouldDoAgain: z.boolean().optional(),
  notes: z.string().optional(),
  lessonsLearned: z.string().optional(),
});

// GET - Get single project
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

    const project = await prisma.diyProject.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        home: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            difficulty: true,
            videoUrl: true,
            guideUrl: true,
            safetyNotes: true,
          },
        },
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
        materials: {
          orderBy: {
            name: "asc",
          },
        },
        tools: {
          orderBy: {
            name: "asc",
          },
        },
        photos: {
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch project",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Update project
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

    // Verify project belongs to user
    const existingProject = await prisma.diyProject.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    // Build update data
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.estimatedHours !== undefined) updateData.estimatedHours = validatedData.estimatedHours;
    if (validatedData.actualHours !== undefined) updateData.actualHours = validatedData.actualHours;
    if (validatedData.estimatedCost !== undefined) updateData.estimatedCost = validatedData.estimatedCost;
    if (validatedData.actualCost !== undefined) updateData.actualCost = validatedData.actualCost;
    if (validatedData.budget !== undefined) updateData.budget = validatedData.budget;
    if (validatedData.targetStartDate !== undefined) {
      updateData.targetStartDate = validatedData.targetStartDate ? new Date(validatedData.targetStartDate) : null;
    }
    if (validatedData.targetEndDate !== undefined) {
      updateData.targetEndDate = validatedData.targetEndDate ? new Date(validatedData.targetEndDate) : null;
    }
    if (validatedData.actualStartDate !== undefined) {
      updateData.actualStartDate = validatedData.actualStartDate ? new Date(validatedData.actualStartDate) : null;
    }
    if (validatedData.actualEndDate !== undefined) {
      updateData.actualEndDate = validatedData.actualEndDate ? new Date(validatedData.actualEndDate) : null;
    }
    if (validatedData.satisfactionRating !== undefined) updateData.satisfactionRating = validatedData.satisfactionRating;
    if (validatedData.wouldDoAgain !== undefined) updateData.wouldDoAgain = validatedData.wouldDoAgain;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.lessonsLearned !== undefined) updateData.lessonsLearned = validatedData.lessonsLearned;

    const project = await prisma.diyProject.update({
      where: { id },
      data: updateData,
      include: {
        home: {
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            difficulty: true,
          },
        },
        steps: {
          orderBy: {
            stepNumber: "asc",
          },
        },
        materials: true,
        tools: true,
        photos: {
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
    });

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error("Error updating project:", error);
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
        error: "Failed to update project",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete project
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

    // Verify project belongs to user
    const existingProject = await prisma.diyProject.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.diyProject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      {
        error: "Failed to delete project",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

