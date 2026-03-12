import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateVehicleSchema } from "@/lib/validations/vehicle";

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }
    const user = await getOrCreateUser(clerkId, clerkUser.emailAddresses[0].emailAddress);
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, userId: user.id },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }
    const user = await getOrCreateUser(clerkId, clerkUser.emailAddresses[0].emailAddress);
    const existing = await prisma.vehicle.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    const body = await request.json();
    const validatedData = updateVehicleSchema.parse(body);
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(validatedData.nickname !== undefined && { nickname: validatedData.nickname ?? null }),
        ...(validatedData.year !== undefined && { year: validatedData.year }),
        ...(validatedData.make !== undefined && { make: validatedData.make.trim() }),
        ...(validatedData.model !== undefined && { model: validatedData.model.trim() }),
        ...(validatedData.trim !== undefined && { trim: validatedData.trim?.trim() ?? null }),
        ...(validatedData.vin !== undefined && { vin: validatedData.vin?.trim() ?? null }),
        ...(validatedData.currentMileage !== undefined && { currentMileage: validatedData.currentMileage ?? null }),
        ...(validatedData.purchaseDate !== undefined && {
          purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : null,
        }),
      },
    });
    return NextResponse.json({ vehicle });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "Validation error", details: (error as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }
    const user = await getOrCreateUser(clerkId, clerkUser.emailAddresses[0].emailAddress);
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, userId: user.id },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
