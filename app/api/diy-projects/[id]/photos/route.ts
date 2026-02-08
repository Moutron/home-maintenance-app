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

// POST - Upload photo
export async function POST(
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

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const caption = formData.get("caption") as string | null;
    const stepId = formData.get("stepId") as string | null;
    const isBefore = formData.get("isBefore") === "true";
    const isAfter = formData.get("isAfter") === "true";

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Convert file to base64 for now (in production, use cloud storage)
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // In production, upload to cloud storage (Vercel Blob, Cloudinary, etc.)
    // For now, we'll store as data URL (not recommended for production)
    const photo = await prisma.projectPhoto.create({
      data: {
        projectId: id,
        stepId: stepId || null,
        url: dataUrl,
        caption: caption || null,
        isBefore,
        isAfter,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error: any) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      {
        error: "Failed to upload photo",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET - List photos
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

    const photos = await prisma.projectPhoto.findMany({
      where: {
        projectId: id,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return NextResponse.json({ photos });
  } catch (error: any) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch photos",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

