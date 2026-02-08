import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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

    // Handle params as Promise (Next.js 15) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params);
    const homeId = resolvedParams.id;

    const home = await prisma.home.findFirst({
      where: {
        id: homeId,
        userId: user.id,
      },
      include: {
        systems: true,
        appliances: true,
        exteriorFeatures: true,
        interiorFeatures: true,
      },
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    return NextResponse.json({ home });
  } catch (error) {
    console.error("Error fetching home:", error);
    return NextResponse.json(
      { error: "Failed to fetch home" },
      { status: 500 }
    );
  }
}

