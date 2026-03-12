import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVehicleSchema } from "@/lib/validations/vehicle";

async function getOrCreateUser(clerkId: string, email: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId, email },
    });
  }
  return user;
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }
    const user = await getOrCreateUser(clerkId, clerkUser.emailAddresses[0].emailAddress);
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: [{ year: "desc" }, { make: "asc" }, { model: "asc" }],
    });
    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
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
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }
    const user = await getOrCreateUser(clerkId, clerkUser.emailAddresses[0].emailAddress);
    const body = await request.json();
    const validatedData = createVehicleSchema.parse(body);
    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        nickname: validatedData.nickname ?? null,
        year: validatedData.year,
        make: validatedData.make.trim(),
        model: validatedData.model.trim(),
        trim: validatedData.trim?.trim() ?? null,
        vin: validatedData.vin?.trim() ?? null,
        currentMileage: validatedData.currentMileage ?? null,
        purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : null,
      },
    });
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "Validation error", details: (error as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
