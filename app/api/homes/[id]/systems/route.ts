import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { homeSystemSchema } from "@/lib/validations/home";
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

const addSystemsSchema = z.object({
  systems: z.array(homeSystemSchema).min(1, "At least one system is required"),
});

/**
 * POST /api/homes/[id]/systems
 * Add systems to an existing home
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: homeId } = await context.params;
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

    // Verify home belongs to user
    const home = await prisma.home.findFirst({
      where: {
        id: homeId,
        userId: user.id,
      },
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = addSystemsSchema.parse(body);

    // Create systems
    const createdSystems = await Promise.all(
      validatedData.systems.map((system: (typeof validatedData.systems)[number]) =>
        prisma.homeSystem.create({
          data: {
            homeId,
            systemType: system.systemType,
            brand: system.brand,
            model: system.model,
            installDate: system.installDate
              ? new Date(system.installDate)
              : undefined,
            expectedLifespan: system.expectedLifespan,
            material: system.material,
            capacity: system.capacity,
            condition: system.condition,
            lastInspection: system.lastInspection
              ? new Date(system.lastInspection)
              : undefined,
            stormResistance: system.stormResistance,
            notes: system.notes,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      systems: createdSystems,
      message: `Successfully added ${createdSystems.length} system(s)`,
    });
  } catch (error) {
    console.error("Error adding systems:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((issue: z.ZodIssue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add systems" },
      { status: 500 }
    );
  }
}

