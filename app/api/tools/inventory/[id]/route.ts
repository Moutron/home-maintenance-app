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

const updateToolSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  condition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Get single tool
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

    const tool = await prisma.toolInventory.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { error: "Tool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tool });
  } catch (error: any) {
    console.error("Error fetching tool:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tool",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Update tool
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

    const tool = await prisma.toolInventory.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { error: "Tool not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateToolSchema.parse(body);

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.category !== undefined) updateData.category = validatedData.category;
    if (validatedData.brand !== undefined) updateData.brand = validatedData.brand;
    if (validatedData.model !== undefined) updateData.model = validatedData.model;
    if (validatedData.purchaseDate !== undefined) {
      updateData.purchaseDate = validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : null;
    }
    if (validatedData.purchasePrice !== undefined) updateData.purchasePrice = validatedData.purchasePrice;
    if (validatedData.condition !== undefined) updateData.condition = validatedData.condition;
    if (validatedData.location !== undefined) updateData.location = validatedData.location;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    const updatedTool = await prisma.toolInventory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ tool: updatedTool });
  } catch (error: any) {
    console.error("Error updating tool:", error);
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
        error: "Failed to update tool",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete tool
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

    const tool = await prisma.toolInventory.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!tool) {
      return NextResponse.json(
        { error: "Tool not found" },
        { status: 404 }
      );
    }

    await prisma.toolInventory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting tool:", error);
    return NextResponse.json(
      {
        error: "Failed to delete tool",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

