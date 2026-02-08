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

const updateMaterialSchema = z.object({
  purchased: z.boolean().optional(),
  purchasedAt: z.string().optional(),
});

// PATCH - Update material (mark as purchased)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
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

    // Verify material belongs to project
    const material = await prisma.projectMaterial.findFirst({
      where: {
        id: params.materialId,
        projectId: params.id,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateMaterialSchema.parse(body);

    const updateData: any = {};
    if (validatedData.purchased !== undefined) {
      updateData.purchased = validatedData.purchased;
      if (validatedData.purchased) {
        updateData.purchasedAt = validatedData.purchasedAt
          ? new Date(validatedData.purchasedAt)
          : new Date();
      } else {
        updateData.purchasedAt = null;
      }
    }

    const updatedMaterial = await prisma.projectMaterial.update({
      where: { id: params.materialId },
      data: updateData,
    });

    return NextResponse.json({ material: updatedMaterial });
  } catch (error: any) {
    console.error("Error updating material:", error);
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
        error: "Failed to update material",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

