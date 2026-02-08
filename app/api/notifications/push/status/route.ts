import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
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

    // Check if user has OneSignal player ID stored
    // Note: This requires adding oneSignalPlayerId to User model in Prisma schema
    const subscribed = false; // user.oneSignalPlayerId !== null; // Uncomment after adding to schema

    return NextResponse.json({
      subscribed,
    });
  } catch (error) {
    console.error("Error checking push notification status:", error);
    return NextResponse.json(
      { error: "Failed to check push notification status" },
      { status: 500 }
    );
  }
}

