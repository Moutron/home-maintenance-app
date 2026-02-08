import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

/**
 * Test endpoint to validate home data and check what would be generated
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { homeId } = body;

    if (!homeId) {
      return NextResponse.json(
        { error: "homeId is required" },
        { status: 400 }
      );
    }

    // Get user
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const user = await getOrCreateUser(clerkId, email);

    // Fetch home with systems
    const home = await prisma.home.findFirst({
      where: {
        id: homeId,
        userId: user.id,
      },
      include: {
        systems: true,
      },
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    // Validate home data
    const zipCodeRegex = /^\d{5}(-\d{4})?$/;
    const normalizedZipCode = home.zipCode?.trim().replace(/\s+/g, '') || '';
    const zipValid = zipCodeRegex.test(normalizedZipCode);
    
    const normalizedState = home.state?.trim().toUpperCase() || '';
    const stateValid = normalizedState.length === 2;

    // Fetch task templates
    const templates = await prisma.taskTemplate.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        baseFrequency: true,
      },
      take: 5,
    });

    return NextResponse.json({
      home: {
        id: home.id,
        address: home.address,
        city: home.city,
        state: home.state,
        zipCode: home.zipCode,
        zipValid,
        stateValid,
        yearBuilt: home.yearBuilt,
        homeType: home.homeType,
      },
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        frequency: t.baseFrequency,
        categoryType: typeof t.category,
        frequencyType: typeof t.baseFrequency,
      })),
      validCategories: ["HVAC", "PLUMBING", "EXTERIOR", "STRUCTURAL", "LANDSCAPING", "APPLIANCE", "SAFETY", "ELECTRICAL", "OTHER"],
      validFrequencies: ["WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL", "SEASONAL", "AS_NEEDED"],
    });
  } catch (error) {
    console.error("Test validation error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

