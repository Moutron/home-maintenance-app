import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { buildTaskGenerationPrompt } from "@/lib/ai/prompts";
import type { HomeInventoryData } from "@/lib/ai/prompts";
import { generateComplianceTasks } from "@/lib/utils/compliance-tasks";

// Lazy-load OpenAI client to avoid build-time errors
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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

// Calculate next due date based on frequency and optimal timing
function calculateNextDueDate(
  frequency: string,
  optimalMonth?: number | null,
  optimalSeason?: string | null
): Date {
  const now = new Date();
  const date = new Date(now);

  // If optimal month is specified, schedule for that month
  if (optimalMonth) {
    date.setMonth(optimalMonth - 1);
    date.setDate(1); // First of the month
    if (date < now) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  // If optimal season is specified, schedule for that season
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
    if (date < now) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  // Otherwise, use frequency
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

    // Call OpenAI
    let aiResponse;
    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert home maintenance advisor. Always respond with valid JSON arrays. Be thorough and comprehensive in your recommendations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const parsed = JSON.parse(content);
      // Handle both {tasks: [...]} and [...] formats
      aiResponse = parsed.tasks || parsed;
    } catch (error) {
      console.error("OpenAI API error:", error);
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

    // Create a map of task names to IDs for dependency resolution
    const taskNameToId = new Map<string, string>();
    const createdTasks: any[] = [];

    // First pass: create all tasks
    for (const task of aiResponse) {
      const nextDueDate = calculateNextDueDate(
        task.frequency,
        task.optimalMonth,
        task.optimalSeason
      );

      const costEstimate =
        task.costEstimateMin && task.costEstimateMax
          ? (task.costEstimateMin + task.costEstimateMax) / 2
          : null;

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

      taskNameToId.set(task.name, createdTask.id);
      createdTasks.push(createdTask);
    }

    // Second pass: update dependencies
    for (let i = 0; i < aiResponse.length; i++) {
      const task = aiResponse[i];
      const createdTask = createdTasks[i];

      if (task.dependsOnTaskName) {
        const dependsOnId = taskNameToId.get(task.dependsOnTaskName);
        if (dependsOnId) {
          await prisma.maintenanceTask.update({
            where: { id: createdTask.id },
            data: { dependsOnTaskId: dependsOnId },
          });
        }
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

    // Create compliance tasks in database
    const createdComplianceTasks = [];
    for (const task of complianceTasks) {
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

