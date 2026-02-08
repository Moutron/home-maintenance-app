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
    // If email changed, update it
    if (user.email !== email) {
      user = await prisma.user.update({
        where: { clerkId },
        data: { email },
      });
    }
    return user;
  }

  // If not found by clerkId, try to find by email
  user = await prisma.user.findFirst({
    where: { email },
  });

  if (user) {
    // Update the existing user with the new clerkId
    user = await prisma.user.update({
      where: { id: user.id },
      data: { clerkId },
    });
    return user;
  }

  // User doesn't exist, create new one
  try {
    user = await prisma.user.create({
      data: {
        clerkId,
        email,
      },
    });
    return user;
  } catch (createError: any) {
    // If creation fails due to unique constraint, try to find again
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

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  category: z.enum([
    "HVAC",
    "PLUMBING",
    "ELECTRICAL",
    "EXTERIOR",
    "INTERIOR",
    "LANDSCAPING",
    "APPLIANCE",
    "STRUCTURAL",
    "OTHER",
  ]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]),
  homeId: z.string().min(1, "Home ID is required"),
  estimatedHours: z.number().int().positive().optional(),
  estimatedCost: z.number().positive().optional(),
  budget: z.number().positive().optional(),
  targetStartDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  linkedTaskId: z.string().optional(),
  linkedSystemId: z.string().optional(),
  linkedApplianceId: z.string().optional(),
  linkedExteriorFeatureId: z.string().optional(),
  linkedInteriorFeatureId: z.string().optional(),
  permitRequired: z.boolean().optional(),
  permitInfo: z.string().optional(),
  templateId: z.string().optional(),
});

// GET - List all projects for user
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
    const homeId = searchParams.get("homeId");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const where: any = {
      userId: user.id,
    };

    if (homeId && homeId !== "all") {
      where.homeId = homeId;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (category && category !== "all") {
      where.category = category;
    }

    const projects = await prisma.diyProject.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch projects",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Create new project
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
    const validatedData = createProjectSchema.parse(body);

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

    // Create project
    const project = await prisma.diyProject.create({
      data: {
        userId: user.id,
        homeId: validatedData.homeId,
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        difficulty: validatedData.difficulty,
        estimatedHours: validatedData.estimatedHours,
        estimatedCost: validatedData.estimatedCost,
        budget: validatedData.budget,
        targetStartDate: validatedData.targetStartDate
          ? new Date(validatedData.targetStartDate)
          : null,
        targetEndDate: validatedData.targetEndDate
          ? new Date(validatedData.targetEndDate)
          : null,
        linkedTaskId: validatedData.linkedTaskId,
        linkedSystemId: validatedData.linkedSystemId,
        linkedApplianceId: validatedData.linkedApplianceId,
        linkedExteriorFeatureId: validatedData.linkedExteriorFeatureId,
        linkedInteriorFeatureId: validatedData.linkedInteriorFeatureId,
        permitRequired: validatedData.permitRequired || false,
        permitInfo: validatedData.permitInfo,
        templateId: validatedData.templateId,
        status: "NOT_STARTED",
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
          },
        },
        steps: true,
        materials: true,
        tools: true,
        photos: true,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating project:", error);
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
        error: "Failed to create project",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

