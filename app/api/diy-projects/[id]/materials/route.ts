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

const createMaterialSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().positive().optional(),
  totalPrice: z.number().positive().optional(),
  vendor: z.string().optional(),
  vendorUrl: z.string().url().optional().or(z.literal("")),
});

// POST - Create a material
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
    const validatedData = createMaterialSchema.parse(body);

    // Calculate totalPrice if not provided
    const totalPrice =
      validatedData.totalPrice ||
      (validatedData.unitPrice
        ? validatedData.quantity * validatedData.unitPrice
        : null);

    const material = await prisma.projectMaterial.create({
      data: {
        projectId: params.id,
        name: validatedData.name,
        description: validatedData.description,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        unitPrice: validatedData.unitPrice,
        totalPrice: totalPrice,
        vendor: validatedData.vendor,
        vendorUrl: validatedData.vendorUrl || null,
      },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating material:", error);
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
        error: "Failed to create material",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET - List all materials for a project
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

    const materials = await prisma.projectMaterial.findMany({
      where: {
        projectId: params.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ materials });
  } catch (error: any) {
    console.error("Error fetching materials:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch materials",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

