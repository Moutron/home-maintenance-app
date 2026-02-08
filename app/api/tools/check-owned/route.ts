import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

// POST - Check which tools from a list are owned
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
    const { toolNames } = body; // Array of tool names to check

    if (!Array.isArray(toolNames)) {
      return NextResponse.json(
        { error: "toolNames must be an array" },
        { status: 400 }
      );
    }

    // Get user's tool inventory
    const userTools = await prisma.toolInventory.findMany({
      where: {
        userId: user.id,
      },
    });

    // Create a map of owned tool names (case-insensitive)
    const ownedToolNames = new Set(
      userTools.map((tool) => tool.name.toLowerCase().trim())
    );

    // Check which tools are owned
    const toolOwnership = toolNames.map((toolName: string) => {
      const normalizedName = toolName.toLowerCase().trim();
      const isOwned = ownedToolNames.has(normalizedName);
      
      // Try to find exact match or partial match
      const matchingTool = userTools.find(
        (tool) => tool.name.toLowerCase().trim() === normalizedName
      ) || userTools.find(
        (tool) => normalizedName.includes(tool.name.toLowerCase().trim()) ||
                  tool.name.toLowerCase().trim().includes(normalizedName)
      );

      return {
        toolName,
        isOwned,
        toolId: matchingTool?.id || null,
      };
    });

    return NextResponse.json({ toolOwnership });
  } catch (error: any) {
    console.error("Error checking tool ownership:", error);
    return NextResponse.json(
      {
        error: "Failed to check tool ownership",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

