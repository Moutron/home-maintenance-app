import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInventorySchema } from "@/lib/validations/inventory";

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

    const searchParams = request.nextUrl.searchParams;
    const homeId = searchParams.get("homeId");

    if (!homeId) {
      return NextResponse.json(
        { error: "homeId is required" },
        { status: 400 }
      );
    }

    // Verify home belongs to user
    const home = await prisma.home.findFirst({
      where: {
        id: homeId,
        userId: user.id,
      },
    });

    if (!home) {
      return NextResponse.json(
        { error: "Home not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch all inventory items
    const [appliances, exteriorFeatures, interiorFeatures] = await Promise.all([
      prisma.appliance.findMany({
        where: { homeId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.exteriorFeature.findMany({
        where: { homeId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.interiorFeature.findMany({
        where: { homeId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      appliances,
      exteriorFeatures,
      interiorFeatures,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
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
    // Ensure arrays are always present (default to empty arrays if not provided)
    const dataWithDefaults = {
      ...body,
      appliances: body.appliances || [],
      exteriorFeatures: body.exteriorFeatures || [],
      interiorFeatures: body.interiorFeatures || [],
    };
    const validatedData = createInventorySchema.parse(dataWithDefaults);

    // Verify home belongs to user
    const home = await prisma.home.findFirst({
      where: {
        id: validatedData.homeId,
        userId: user.id,
      },
    });

    if (!home) {
      return NextResponse.json(
        { error: "Home not found or access denied" },
        { status: 404 }
      );
    }

    // Create all inventory items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing inventory items (optional - you might want to update instead)
      // For now, we'll create new ones and let users manage them separately

      // Create appliances
      const appliances = await Promise.all(
        validatedData.appliances.map((appliance) =>
          tx.appliance.create({
            data: {
              homeId: validatedData.homeId,
              applianceType: appliance.applianceType,
              brand: appliance.brand,
              model: appliance.model,
              serialNumber: appliance.serialNumber,
              installDate: appliance.installDate
                ? new Date(appliance.installDate)
                : null,
              warrantyExpiry: appliance.warrantyExpiry
                ? new Date(appliance.warrantyExpiry)
                : null,
              expectedLifespan: appliance.expectedLifespan,
              lastServiceDate: appliance.lastServiceDate
                ? new Date(appliance.lastServiceDate)
                : null,
              usageFrequency: appliance.usageFrequency,
              notes: appliance.notes,
            },
          })
        )
      );

      // Create exterior features
      const exteriorFeatures = await Promise.all(
        validatedData.exteriorFeatures.map((feature) =>
          tx.exteriorFeature.create({
            data: {
              homeId: validatedData.homeId,
              featureType: feature.featureType,
              material: feature.material,
              brand: feature.brand,
              installDate: feature.installDate
                ? new Date(feature.installDate)
                : null,
              warrantyExpiry: feature.warrantyExpiry
                ? new Date(feature.warrantyExpiry)
                : null,
              expectedLifespan: feature.expectedLifespan,
              lastServiceDate: feature.lastServiceDate
                ? new Date(feature.lastServiceDate)
                : null,
              squareFootage: feature.squareFootage,
              notes: feature.notes,
            },
          })
        )
      );

      // Create interior features
      const interiorFeatures = await Promise.all(
        validatedData.interiorFeatures.map((feature) =>
          tx.interiorFeature.create({
            data: {
              homeId: validatedData.homeId,
              featureType: feature.featureType,
              material: feature.material,
              brand: feature.brand,
              installDate: feature.installDate
                ? new Date(feature.installDate)
                : null,
              warrantyExpiry: feature.warrantyExpiry
                ? new Date(feature.warrantyExpiry)
                : null,
              expectedLifespan: feature.expectedLifespan,
              lastServiceDate: feature.lastServiceDate
                ? new Date(feature.lastServiceDate)
                : null,
              squareFootage: feature.squareFootage,
              room: feature.room,
              notes: feature.notes,
            },
          })
        )
      );

      return {
        appliances,
        exteriorFeatures,
        interiorFeatures,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create inventory" },
      { status: 500 }
    );
  }
}

