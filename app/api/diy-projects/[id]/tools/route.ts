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

const createToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  owned: z.boolean().default(false),
  rentalCost: z.number().positive().optional(),
  rentalDays: z.number().int().positive().optional(),
  purchaseCost: z.number().positive().optional(),
});

// POST - Create a tool
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
    const validatedData = createToolSchema.parse(body);

    // Check if user owns this tool in their inventory
    let isOwned = validatedData.owned;
    if (!isOwned) {
      const userTools = await prisma.toolInventory.findMany({
        where: {
          userId: user.id,
        },
      });
      
      // Check for match (case-insensitive, partial match)
      const toolNameLower = validatedData.name.toLowerCase().trim();
      const matchingTool = userTools.find(
        (t) => t.name.toLowerCase().trim() === toolNameLower ||
               toolNameLower.includes(t.name.toLowerCase().trim()) ||
               t.name.toLowerCase().trim().includes(toolNameLower)
      );
      
      if (matchingTool) {
        isOwned = true;
      }
    }

    const tool = await prisma.projectTool.create({
      data: {
        projectId: params.id,
        name: validatedData.name,
        description: validatedData.description,
        owned: isOwned,
        rentalCost: validatedData.rentalCost,
        rentalDays: validatedData.rentalDays,
        purchaseCost: validatedData.purchaseCost,
      },
    });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tool:", error);
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
        error: "Failed to create tool",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET - List all tools for a project
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

    const tools = await prisma.projectTool.findMany({
      where: {
        projectId: params.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error("Error fetching tools:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tools",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

