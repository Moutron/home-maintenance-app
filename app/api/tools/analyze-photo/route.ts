import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createCompletionWithImage } from "@/lib/ai/claude";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64Image = buffer.toString("base64");

    const prompt = `Analyze this image of a tool. Identify the tool name, brand, model, category (e.g., "Power Tools", "Hand Tools", "Measuring Tools", "Safety Equipment", "Garden Tools", "Plumbing Tools", "Electrical Tools", "Painting Tools", "Other"), and estimate the condition (excellent, good, fair, poor) if visible.

Return the information as a JSON object with the following structure:
{
  "name": "string", // Tool name (e.g., "Cordless Drill", "Circular Saw", "Hammer")
  "brand": "string | null", // Brand name if visible (e.g., "DeWalt", "Milwaukee", "Bosch")
  "model": "string | null", // Model number or name if visible
  "category": "string | null", // Category from the list above
  "condition": "excellent" | "good" | "fair" | "poor" | null, // Estimated condition
  "description": "string | null" // Any additional details about the tool
}

If you cannot determine a field, set it to null. Do not include any other text in your response, just the JSON object.`;

    const content = await createCompletionWithImage({
      userText: prompt,
      imageBase64: base64Image,
      imageMediaType: imageFile.type || "image/jpeg",
      maxTokens: 1024,
    });
    const analysis = JSON.parse(content || "{}");
    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error("Error analyzing tool photo:", error);
    return NextResponse.json(
      { error: "Failed to analyze photo", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

