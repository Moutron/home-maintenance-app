import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TaskCategoryEnum, TaskFrequencyEnum } from "@/lib/validations/task";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  category: TaskCategoryEnum,
  baseFrequency: TaskFrequencyEnum,
  diyDifficulty: z.string().optional(),
  costRangeMin: z.number().positive().optional(),
  costRangeMax: z.number().positive().optional(),
  importance: z.string().optional(),
  season: z.string().optional(),
});

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

// GET - List templates (system templates + user's custom templates)
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

    // Get system templates (no userId) and user's custom templates
    const templates = await prisma.taskTemplate.findMany({
      where: {
        OR: [
          { userId: null }, // System templates
          { userId: user.id }, // User's custom templates
        ],
        isActive: true,
      },
      orderBy: [
        { userId: "asc" }, // System templates first
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST - Create custom template
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
    const validatedData = createTemplateSchema.parse(body);

    // Create custom template
    const template = await prisma.taskTemplate.create({
      data: {
        ...validatedData,
        userId: user.id, // Mark as user-created
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

