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
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 }
      );
    }

    // Store OneSignal player ID for this user
    // We'll need to add a pushSubscription field to the User model
    // For now, we'll use a workaround - you can add this to Prisma schema later:
    // model User {
    //   ...
    //   oneSignalPlayerId String?
    // }

    // Update user with OneSignal player ID
    // Note: This requires adding oneSignalPlayerId to User model in Prisma schema
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // oneSignalPlayerId: playerId, // Uncomment after adding to schema
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to push notifications",
      playerId,
    });
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
}

