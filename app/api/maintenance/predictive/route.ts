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

function calculateAge(installDate: Date | null): number | null {
  if (!installDate) return null;
  const now = new Date();
  const age = now.getFullYear() - installDate.getFullYear();
  const monthDiff = now.getMonth() - installDate.getMonth();
  return monthDiff < 0 ? age - 1 : age;
}

function calculateLifespanUsed(
  age: number | null,
  expectedLifespan: number | null
): number | null {
  if (!age || !expectedLifespan) return null;
  return Math.min(100, Math.round((age / expectedLifespan) * 100));
}

function determineReplacementUrgency(
  lifespanUsed: number | null,
  age: number | null,
  expectedLifespan: number | null
): "low" | "medium" | "high" | "critical" {
  if (!lifespanUsed) {
    // If we don't have lifespan data, use age-based heuristics
    if (!age || !expectedLifespan) return "low";
    const yearsRemaining = expectedLifespan - age;
    if (yearsRemaining < 1) return "critical";
    if (yearsRemaining < 3) return "high";
    if (yearsRemaining < 5) return "medium";
    return "low";
  }

  if (lifespanUsed >= 90) return "critical";
  if (lifespanUsed >= 75) return "high";
  if (lifespanUsed >= 60) return "medium";
  return "low";
}

function calculateRecommendedReplacementDate(
  installDate: Date | null,
  expectedLifespan: number | null
): string | null {
  if (!installDate || !expectedLifespan) return null;
  const replacementDate = new Date(installDate);
  replacementDate.setFullYear(
    replacementDate.getFullYear() + expectedLifespan
  );
  return replacementDate.toISOString().split("T")[0];
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

    // Fetch all items
    const [systems, appliances, exteriorFeatures, interiorFeatures] =
      await Promise.all([
        prisma.homeSystem.findMany({ where: { homeId } }),
        prisma.appliance.findMany({ where: { homeId } }),
        prisma.exteriorFeature.findMany({ where: { homeId } }),
        prisma.interiorFeature.findMany({ where: { homeId } }),
      ]);

    const predictions: any[] = [];

    // Analyze systems
    for (const system of systems) {
      const age = calculateAge(system.installDate);
      const lifespanUsed = calculateLifespanUsed(age, system.expectedLifespan);
      const urgency = determineReplacementUrgency(
        lifespanUsed,
        age,
        system.expectedLifespan
      );

      predictions.push({
        itemId: system.id,
        itemName: system.systemType,
        itemType: "system",
        brand: system.brand,
        model: system.model,
        currentAge: age,
        expectedLifespan: system.expectedLifespan,
        lifespanUsed: lifespanUsed,
        replacementUrgency: urgency,
        recommendedReplacementDate: calculateRecommendedReplacementDate(
          system.installDate,
          system.expectedLifespan
        ),
        warningSigns: getWarningSigns(system.systemType, urgency),
      });
    }

    // Analyze appliances
    for (const appliance of appliances) {
      const age = calculateAge(appliance.installDate);
      const lifespanUsed = calculateLifespanUsed(
        age,
        appliance.expectedLifespan
      );
      const urgency = determineReplacementUrgency(
        lifespanUsed,
        age,
        appliance.expectedLifespan
      );

      predictions.push({
        itemId: appliance.id,
        itemName: appliance.applianceType,
        itemType: "appliance",
        brand: appliance.brand,
        model: appliance.model,
        currentAge: age,
        expectedLifespan: appliance.expectedLifespan,
        lifespanUsed: lifespanUsed,
        replacementUrgency: urgency,
        recommendedReplacementDate: calculateRecommendedReplacementDate(
          appliance.installDate,
          appliance.expectedLifespan
        ),
        warningSigns: getWarningSigns(appliance.applianceType, urgency),
      });
    }

    // Analyze exterior features
    for (const feature of exteriorFeatures) {
      const age = calculateAge(feature.installDate);
      const lifespanUsed = calculateLifespanUsed(
        age,
        feature.expectedLifespan
      );
      const urgency = determineReplacementUrgency(
        lifespanUsed,
        age,
        feature.expectedLifespan
      );

      predictions.push({
        itemId: feature.id,
        itemName: feature.featureType,
        itemType: "exteriorFeature",
        material: feature.material,
        currentAge: age,
        expectedLifespan: feature.expectedLifespan,
        lifespanUsed: lifespanUsed,
        replacementUrgency: urgency,
        recommendedReplacementDate: calculateRecommendedReplacementDate(
          feature.installDate,
          feature.expectedLifespan
        ),
        warningSigns: getWarningSigns(feature.featureType, urgency),
      });
    }

    // Analyze interior features
    for (const feature of interiorFeatures) {
      const age = calculateAge(feature.installDate);
      const lifespanUsed = calculateLifespanUsed(
        age,
        feature.expectedLifespan
      );
      const urgency = determineReplacementUrgency(
        lifespanUsed,
        age,
        feature.expectedLifespan
      );

      predictions.push({
        itemId: feature.id,
        itemName: feature.featureType,
        itemType: "interiorFeature",
        material: feature.material,
        room: feature.room,
        currentAge: age,
        expectedLifespan: feature.expectedLifespan,
        lifespanUsed: lifespanUsed,
        replacementUrgency: urgency,
        recommendedReplacementDate: calculateRecommendedReplacementDate(
          feature.installDate,
          feature.expectedLifespan
        ),
        warningSigns: getWarningSigns(feature.featureType, urgency),
      });
    }

    // Sort by urgency (critical first)
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    predictions.sort(
      (a, b) => {
        const aUrgency = a.replacementUrgency as keyof typeof urgencyOrder;
        const bUrgency = b.replacementUrgency as keyof typeof urgencyOrder;
        return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
      }
    );

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Error calculating predictive maintenance:", error);
    return NextResponse.json(
      { error: "Failed to calculate predictive maintenance" },
      { status: 500 }
    );
  }
}

function getWarningSigns(
  itemType: string,
  urgency: string
): string[] {
  const signs: string[] = [];

  if (urgency === "critical" || urgency === "high") {
    signs.push("Approaching or past expected lifespan");
    signs.push("Increased maintenance frequency needed");
  }

  // Type-specific signs
  if (itemType.includes("HVAC")) {
    signs.push("Reduced efficiency");
    signs.push("Frequent repairs");
    signs.push("Unusual noises");
  } else if (itemType.includes("ROOF")) {
    signs.push("Missing or damaged shingles");
    signs.push("Leaks or water stains");
    signs.push("Sagging or warping");
  } else if (itemType.includes("APPLIANCE")) {
    signs.push("Frequent breakdowns");
    signs.push("Increased energy consumption");
    signs.push("Unusual sounds or vibrations");
  }

  return signs;
}

