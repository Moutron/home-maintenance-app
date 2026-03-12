import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCompletion } from "@/lib/ai/claude";
import { isAiConfigured } from "@/lib/ai/claude";
import { buildVehicleMaintenancePrompt } from "@/lib/ai/prompts";
import { calculateNextDueDate } from "@/lib/utils/task-recurrence";

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

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "AI is not configured. Set ANTHROPIC_API_KEY to use AI task generation." },
        { status: 503 }
      );
    }

    const { id: vehicleId } = await context.params;
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
      where: { id: vehicleId, userId: user.id },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const prompt = buildVehicleMaintenancePrompt({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      currentMileage: vehicle.currentMileage,
      purchaseDate: vehicle.purchaseDate?.toISOString().slice(0, 10) ?? null,
    });

    let content: string;
    try {
      content = await createCompletion({
        system:
          "You are an expert automotive maintenance advisor. Always respond with a single valid JSON array of maintenance tasks. No markdown, no code fences, only the array.",
        userMessage: prompt,
        temperature: 0.4,
        maxTokens: 4096,
      });
    } catch (error) {
      console.error("Claude API error:", error);
      return NextResponse.json(
        { error: "AI generation failed. Please try again or use Quick add from templates." },
        { status: 500 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Strip possible markdown code fence
    const raw = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("AI response was not valid JSON:", raw.slice(0, 200));
      return NextResponse.json(
        { error: "AI returned invalid format. Please try again." },
        { status: 500 }
      );
    }

    const tasks = Array.isArray(parsed) ? parsed : (parsed as { tasks?: unknown[] }).tasks;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: "AI returned no tasks. Please try again." },
        { status: 500 }
      );
    }

    const created: { id: string; name: string }[] = [];
    const now = new Date();

    for (const t of tasks) {
      const name = typeof t?.name === "string" ? t.name.trim() : "";
      const description = typeof t?.description === "string" ? t.description.trim() : "";
      const category = t?.category === "VEHICLE" ? "VEHICLE" : "VEHICLE";
      const frequency =
        typeof t?.frequency === "string" &&
        ["WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL", "SEASONAL", "AS_NEEDED"].includes(t.frequency)
          ? t.frequency
          : "ANNUAL";
      const costEstimateMin = typeof t?.costEstimateMin === "number" ? t.costEstimateMin : null;
      const costEstimateMax = typeof t?.costEstimateMax === "number" ? t.costEstimateMax : null;
      const costEstimate =
        costEstimateMin != null && costEstimateMax != null
          ? (costEstimateMin + costEstimateMax) / 2
          : null;
      const explanation = typeof t?.explanation === "string" ? t.explanation.trim() : null;

      if (!name || !description) continue;

      const nextDueDate = calculateNextDueDate(frequency, now);

      const task = await prisma.maintenanceTask.create({
        data: {
          vehicleId,
          homeId: null,
          name,
          description,
          category,
          frequency,
          nextDueDate,
          costEstimate,
          aiExplanation: explanation ?? undefined,
          priority: typeof t?.priority === "string" ? t.priority : undefined,
        },
      });
      created.push({ id: task.id, name: task.name });
    }

    return NextResponse.json({
      message: `Created ${created.length} maintenance task(s) from the owner's manual schedule.`,
      created,
    });
  } catch (error) {
    console.error("Error generating vehicle AI tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 }
    );
  }
}
