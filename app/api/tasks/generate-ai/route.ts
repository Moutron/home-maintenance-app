import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCompletion } from "@/lib/ai/claude";
import { buildTaskGenerationPrompt } from "@/lib/ai/prompts";
import type { HomeInventoryData } from "@/lib/ai/prompts";
import { generateComplianceTasks } from "@/lib/utils/compliance-tasks";

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

// Calculate a single next due date based on frequency and optimal timing
function calculateNextDueDate(
  frequency: string,
  optimalMonth?: number | null,
  optimalSeason?: string | null
): Date {
  const now = new Date();
  const date = new Date(now);

  if (optimalMonth) {
    date.setMonth(optimalMonth - 1);
    date.setDate(1);
    if (date < now) date.setFullYear(date.getFullYear() + 1);
    return date;
  }
  if (optimalSeason && optimalSeason !== "all") {
    const seasonMonths: Record<string, number> = {
      spring: 3,
      summer: 6,
      fall: 9,
      winter: 12,
    };
    const targetMonth = seasonMonths[optimalSeason] || 3;
    date.setMonth(targetMonth - 1);
    date.setDate(1);
    if (date < now) date.setFullYear(date.getFullYear() + 1);
    return date;
  }
  switch (frequency) {
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "QUARTERLY":
      date.setMonth(date.getMonth() + 3);
      break;
    case "BIANNUAL":
      date.setMonth(date.getMonth() + 6);
      break;
    case "ANNUAL":
      date.setFullYear(date.getFullYear() + 1);
      break;
    case "SEASONAL":
      date.setMonth(date.getMonth() + 3);
      break;
    case "AS_NEEDED":
      date.setMonth(date.getMonth() + 6);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return date;
}

/** Returns all due dates for this task type over the next 12 months (full year schedule). */
function getDueDatesForNextYear(
  frequency: string,
  optimalMonth?: number | null,
  optimalSeason?: string | null
): Date[] {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear() + 1, 0, 0); // last day of current year
  const dates: Date[] = [];
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  switch (frequency) {
    case "WEEKLY": {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      while (d <= yearEnd && dates.length < 52) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 7);
      }
      break;
    }
    case "MONTHLY": {
      for (let i = 1; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        if (d <= yearEnd) dates.push(d);
      }
      break;
    }
    case "QUARTERLY": {
      const startMonth = now.getMonth();
      for (let i = 1; i <= 4; i++) {
        const d = new Date(now.getFullYear(), startMonth + i * 3, 1);
        if (d >= now && d <= yearEnd) dates.push(d);
      }
      break;
    }
    case "BIANNUAL": {
      const d1 = new Date(now.getFullYear(), now.getMonth(), 1);
      if (d1 < now) d1.setMonth(d1.getMonth() + 1);
      const d2 = new Date(d1.getFullYear(), d1.getMonth() + 6, 1);
      if (d1 >= now && d1 <= yearEnd) dates.push(d1);
      if (d2 >= now && d2 <= yearEnd) dates.push(d2);
      if (dates.length === 0) dates.push(new Date(now.getFullYear() + 1, now.getMonth(), 1));
      break;
    }
    case "ANNUAL":
    case "SEASONAL":
    case "AS_NEEDED": {
      const single = calculateNextDueDate(frequency, optimalMonth, optimalSeason);
      dates.push(single);
      break;
    }
    default: {
      const single = calculateNextDueDate(frequency, optimalMonth, optimalSeason);
      dates.push(single);
    }
  }

  const seen = new Set<string>();
  return dates
    .filter((d) => {
      const k = monthKey(d);
      if (seen.has(k)) return false;
      seen.add(k);
      return d >= now;
    })
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, 12);
}

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

    // Fetch complete home inventory
    const home = await prisma.home.findFirst({
      where: {
        id: homeId,
        userId: user.id,
      },
      include: {
        systems: true,
        appliances: true,
        exteriorFeatures: true,
        interiorFeatures: true,
      },
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    // Prepare inventory data for AI
    const inventoryData: HomeInventoryData = {
      home: {
        address: home.address,
        city: home.city,
        state: home.state,
        zipCode: home.zipCode,
        yearBuilt: home.yearBuilt,
        squareFootage: home.squareFootage || undefined,
        lotSize: home.lotSize || undefined,
        homeType: home.homeType,
        climateZone: home.climateZone || undefined,
        stormFrequency: home.stormFrequency || undefined,
        averageRainfall: home.averageRainfall || undefined,
        averageSnowfall: home.averageSnowfall || undefined,
        windZone: home.windZone || undefined,
      },
      systems: home.systems.map((s: (typeof home.systems)[number]) => ({
        systemType: s.systemType,
        brand: s.brand || undefined,
        model: s.model || undefined,
        installDate: s.installDate?.toISOString() || undefined,
        expectedLifespan: s.expectedLifespan || undefined,
        material: s.material || undefined,
        capacity: s.capacity || undefined,
        condition: s.condition || undefined,
        lastInspection: s.lastInspection?.toISOString() || undefined,
        stormResistance: s.stormResistance || undefined,
      })),
      appliances: home.appliances.map((a: (typeof home.appliances)[number]) => ({
        applianceType: a.applianceType,
        brand: a.brand || undefined,
        model: a.model || undefined,
        installDate: a.installDate?.toISOString() || undefined,
        expectedLifespan: a.expectedLifespan || undefined,
        usageFrequency: a.usageFrequency || undefined,
      })),
      exteriorFeatures: home.exteriorFeatures.map((e: (typeof home.exteriorFeatures)[number]) => ({
        featureType: e.featureType,
        material: e.material || undefined,
        installDate: e.installDate?.toISOString() || undefined,
        expectedLifespan: e.expectedLifespan || undefined,
      })),
      interiorFeatures: home.interiorFeatures.map((i: (typeof home.interiorFeatures)[number]) => ({
        featureType: i.featureType,
        material: i.material || undefined,
        installDate: i.installDate?.toISOString() || undefined,
        expectedLifespan: i.expectedLifespan || undefined,
        room: i.room || undefined,
      })),
    };

    // Build AI prompt
    const prompt = buildTaskGenerationPrompt(inventoryData);

    // Call Claude
    let aiResponse;
    try {
      const content = await createCompletion({
        system:
          "You are an expert home maintenance advisor. Always respond with valid JSON arrays. Be thorough and comprehensive in your recommendations.",
        userMessage: prompt,
        temperature: 0.7,
        maxTokens: 4096,
      });
      if (!content) {
        throw new Error("No response from AI");
      }
      const parsed = JSON.parse(content);
      // Handle both {tasks: [...]} and [...] formats
      aiResponse = parsed.tasks || parsed;
    } catch (error) {
      console.error("Claude API error:", error);
      // Fallback to rule-based generation if AI fails
      return NextResponse.json(
        {
          error: "AI generation failed",
          message: "Please try the standard task generation instead",
        },
        { status: 500 }
      );
    }

    if (!Array.isArray(aiResponse)) {
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    // Existing tasks: dedupe by (name + month) so we can have same task name in different months
    const existingRows = (await prisma.maintenanceTask.findMany({
      where: { homeId: home.id },
      select: { name: true, nextDueDate: true },
    })) || [];
    const existingTaskNameMonths = new Set(
      existingRows.map((t: { name: string; nextDueDate: Date }) => {
        const d = new Date(t.nextDueDate);
        return `${t.name.toLowerCase().trim()}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })
    );

    const taskNameToId = new Map<string, string>();
    const createdTasks: Awaited<ReturnType<typeof prisma.maintenanceTask.create>>[] = [];

    // First pass: create AI tasks with a full year of due dates (one task per occurrence)
    for (const task of aiResponse) {
      const nameKey = task.name.toLowerCase().trim();
      const dueDates = getDueDatesForNextYear(
        task.frequency,
        task.optimalMonth,
        task.optimalSeason
      );

      const costEstimate =
        task.costEstimateMin && task.costEstimateMax
          ? (task.costEstimateMin + task.costEstimateMax) / 2
          : null;

      for (const nextDueDate of dueDates) {
        const monthKey = `${nameKey}|${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, "0")}`;
        if (existingTaskNameMonths.has(monthKey)) continue;

        const createdTask = await prisma.maintenanceTask.create({
          data: {
            homeId: home.id,
            name: task.name,
            description: task.description,
            category: task.category,
            frequency: task.frequency,
            nextDueDate: nextDueDate,
            costEstimate: costEstimate,
            aiExplanation: task.explanation,
            priority: task.priority,
            relatedItemId: task.relatedItemId || null,
            relatedItemType: task.relatedItemType || null,
          },
        });

        existingTaskNameMonths.add(monthKey);
        if (!taskNameToId.has(task.name)) taskNameToId.set(task.name, createdTask.id);
        createdTasks.push(createdTask);
      }
    }

    // Second pass: set dependencies on the first occurrence of each dependent task
    for (const task of aiResponse) {
      if (!task.dependsOnTaskName) continue;
      const myFirstId = taskNameToId.get(task.name);
      const dependsOnId = taskNameToId.get(task.dependsOnTaskName);
      if (myFirstId && dependsOnId) {
        await prisma.maintenanceTask.update({
          where: { id: myFirstId },
          data: { dependsOnTaskId: dependsOnId },
        });
      }
    }

    // Generate compliance tasks
    const complianceTasks = await generateComplianceTasks(
      home.city,
      home.state,
      home.zipCode,
      home.yearBuilt,
      home.homeType
    );

    // Create compliance tasks (skip if same name already exists for that month)
    const createdComplianceTasks = [];
    for (const task of complianceTasks) {
      const nameKey = task.name.toLowerCase().trim();
      const d = new Date(task.nextDueDate);
      const monthKey = `${nameKey}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (existingTaskNameMonths.has(monthKey)) continue;
      existingTaskNameMonths.add(monthKey);

      const createdTask = await prisma.maintenanceTask.create({
        data: {
          homeId: home.id,
          name: task.name,
          description: task.description,
          category: task.category as "HVAC" | "PLUMBING" | "EXTERIOR" | "STRUCTURAL" | "LANDSCAPING" | "APPLIANCE" | "SAFETY" | "ELECTRICAL" | "OTHER",
          frequency: task.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "SEASONAL" | "AS_NEEDED",
          nextDueDate: task.nextDueDate,
          priority: task.priority,
          notes: task.isComplianceRequired
            ? `⚠️ LEGALLY REQUIRED: ${task.regulationSource || "Local regulation"}`
            : null,
        },
      });
      createdComplianceTasks.push(createdTask);
    }

    return NextResponse.json(
      {
        message: `Generated ${createdTasks.length} AI-powered tasks + ${createdComplianceTasks.length} compliance tasks`,
        tasks: [...createdTasks, ...createdComplianceTasks],
        aiTasksCount: createdTasks.length,
        complianceTasksCount: createdComplianceTasks.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating AI tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 }
    );
  }
}

