import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

const createHistorySchema = z.object({
  homeId: z.string().min(1),
  applianceId: z.string().optional(),
  exteriorFeatureId: z.string().optional(),
  interiorFeatureId: z.string().optional(),
  systemId: z.string().optional(),
  serviceDate: z.date().or(z.string().transform((str) => new Date(str))),
  serviceType: z.enum(["maintenance", "repair", "replacement", "inspection"]),
  description: z.string().min(1),
  cost: z.number().positive().optional(),
  contractorName: z.string().optional(),
  contractorPhone: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  receipts: z.array(z.string().url()).optional(),
  warrantyInfo: z.string().optional(),
  notes: z.string().optional(),
  nextServiceDue: z.date().optional().or(z.string().transform((str) => new Date(str))),
});

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
    const applianceId = searchParams.get("applianceId");
    const exteriorFeatureId = searchParams.get("exteriorFeatureId");
    const interiorFeatureId = searchParams.get("interiorFeatureId");

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

    // Build where clause
    const where: any = { homeId };
    if (applianceId) where.applianceId = applianceId;
    if (exteriorFeatureId) where.exteriorFeatureId = exteriorFeatureId;
    if (interiorFeatureId) where.interiorFeatureId = interiorFeatureId;

    const history = await prisma.maintenanceHistory.findMany({
      where,
      include: {
        appliance: {
          select: {
            id: true,
            applianceType: true,
            brand: true,
            model: true,
          },
        },
        exteriorFeature: {
          select: {
            id: true,
            featureType: true,
            material: true,
          },
        },
        interiorFeature: {
          select: {
            id: true,
            featureType: true,
            material: true,
            room: true,
          },
        },
      },
      orderBy: {
        serviceDate: "desc",
      },
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching maintenance history:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance history" },
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
    const validatedData = createHistorySchema.parse(body);

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

    // Create maintenance history record
    const history = await prisma.maintenanceHistory.create({
      data: {
        homeId: validatedData.homeId,
        applianceId: validatedData.applianceId || null,
        exteriorFeatureId: validatedData.exteriorFeatureId || null,
        interiorFeatureId: validatedData.interiorFeatureId || null,
        systemId: validatedData.systemId || null,
        serviceDate: new Date(validatedData.serviceDate),
        serviceType: validatedData.serviceType,
        description: validatedData.description,
        cost: validatedData.cost || null,
        contractorName: validatedData.contractorName || null,
        contractorPhone: validatedData.contractorPhone || null,
        photos: validatedData.photos || [],
        receipts: validatedData.receipts || [],
        warrantyInfo: validatedData.warrantyInfo || null,
        notes: validatedData.notes || null,
        nextServiceDue: validatedData.nextServiceDue
          ? new Date(validatedData.nextServiceDue)
          : null,
      },
      include: {
        appliance: true,
        exteriorFeature: true,
        interiorFeature: true,
      },
    });

    // Update lastServiceDate on the related item
    if (validatedData.applianceId) {
      await prisma.appliance.update({
        where: { id: validatedData.applianceId },
        data: { lastServiceDate: new Date(validatedData.serviceDate) },
      });
    } else if (validatedData.exteriorFeatureId) {
      await prisma.exteriorFeature.update({
        where: { id: validatedData.exteriorFeatureId },
        data: { lastServiceDate: new Date(validatedData.serviceDate) },
      });
    } else if (validatedData.interiorFeatureId) {
      await prisma.interiorFeature.update({
        where: { id: validatedData.interiorFeatureId },
        data: { lastServiceDate: new Date(validatedData.serviceDate) },
      });
    }

    return NextResponse.json({ history }, { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance history:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create maintenance history" },
      { status: 500 }
    );
  }
}

