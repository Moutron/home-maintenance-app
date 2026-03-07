import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createCompletion, isAiConfigured } from "@/lib/ai/claude";

const SYSTEM = `You are a helpful home maintenance advisor. Write a short, clear "How to" DIY guide for the given maintenance task. Use plain language. Output 3–5 numbered steps or a short paragraph homeowners can follow. No preamble—only the steps or instructions. Keep it under 150 words.`;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "How-to guides are not configured. Set ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { taskName, description, category } = body as {
      taskName?: string;
      description?: string;
      category?: string;
    };

    if (!taskName || !description) {
      return NextResponse.json(
        { error: "taskName and description are required" },
        { status: 400 }
      );
    }

    const userMessage = `Task: ${taskName}\nCategory: ${category || "General"}\nDescription: ${description}\n\nWrite a brief DIY how-to guide for this task.`;

    const howTo = await createCompletion({
      system: SYSTEM,
      userMessage,
      maxTokens: 512,
      temperature: 0.3,
    });

    return NextResponse.json({ howTo: howTo.trim() });
  } catch (error) {
    console.error("Error generating how-to:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate how-to" },
      { status: 500 }
    );
  }
}
