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

const createStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string(),
  instructions: z.string(),
  estimatedHours: z.number().positive().optional(),
  dependsOnStepId: z.string().optional(),
});

// POST - Create a step
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        id: params.id,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createStepSchema.parse(body);

    const step = await prisma.projectStep.create({
      data: {
        projectId: params.id,
        stepNumber: validatedData.stepNumber,
        name: validatedData.name,
        description: validatedData.description,
        instructions: validatedData.instructions,
        estimatedHours: validatedData.estimatedHours,
        dependsOnStepId: validatedData.dependsOnStepId,
        status: "not_started",
      },
    });

    return NextResponse.json({ step }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating step:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to create step",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET - List all steps for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        id: params.id,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const steps = await prisma.projectStep.findMany({
      where: {
        projectId: params.id,
      },
      orderBy: {
        stepNumber: "asc",
      },
    });

    return NextResponse.json({ steps });
  } catch (error: any) {
    console.error("Error fetching steps:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch steps",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

