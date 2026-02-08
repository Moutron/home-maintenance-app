import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageBase64, systemTypeHint } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Prepare the prompt based on system type hint
    const systemPrompt = systemTypeHint
      ? `This is a photo of a ${systemTypeHint} system or component.`
      : "This is a photo of a home system or component.";

    const prompt = `${systemPrompt}

Please analyze this image and provide:
1. System Type: What type of system/component is this? (HVAC, ROOF, WATER_HEATER, PLUMBING, ELECTRICAL, APPLIANCE, EXTERIOR, LANDSCAPING, POOL, DECK, FENCE, or OTHER)
2. Brand: If visible, what brand is this? (e.g., Carrier, Trane, Rheem, etc.)
3. Model: If visible, what model number or name?
4. Estimated Age: Based on visual appearance, condition, and any visible dates/serial numbers, estimate the age in years. If you can see a date code or serial number, use that. Otherwise, estimate based on wear, style, and technology.
5. Condition: Rate the condition as "excellent", "good", "fair", or "poor" based on visible wear and damage.
6. Material: If applicable, what material is this made of? (e.g., copper, PVC, asphalt shingle, metal, etc.)
7. Capacity: If applicable, what capacity? (e.g., "200A" for electrical, "50 gal" for water heater, "3 ton" for HVAC)
8. Additional Details: Any other relevant information visible in the image (model numbers, serial numbers, installation dates, etc.)

Respond in JSON format with the following structure:
{
  "systemType": "HVAC",
  "brand": "Carrier",
  "model": "Infinity 19VS",
  "estimatedAge": 5,
  "condition": "good",
  "material": null,
  "capacity": "3 ton",
  "additionalDetails": "Serial number visible: 1234567890, Installation date sticker shows 2019"
}`;

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error("No response from AI");
    }

    const analysis = JSON.parse(analysisText);

    // Calculate install date from estimated age
    let installDate: string | null = null;
    if (analysis.estimatedAge) {
      const installYear = new Date().getFullYear() - analysis.estimatedAge;
      installDate = `${installYear}-01-01`; // Use January 1st as default
    }

    return NextResponse.json({
      success: true,
      analysis: {
        systemType: analysis.systemType || null,
        brand: analysis.brand || null,
        model: analysis.model || null,
        installDate: installDate,
        estimatedAge: analysis.estimatedAge || null,
        condition: analysis.condition || null,
        material: analysis.material || null,
        capacity: analysis.capacity || null,
        additionalDetails: analysis.additionalDetails || null,
      },
    });
  } catch (error: any) {
    console.error("Error analyzing photo:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze photo",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

