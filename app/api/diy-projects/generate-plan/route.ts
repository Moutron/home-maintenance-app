import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Lazy-load OpenAI client to avoid build-time errors
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const projectPlanSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "A clear, concise project name",
    },
    description: {
      type: "string",
      description: "A detailed description of the project",
    },
    category: {
      type: "string",
      enum: [
        "HVAC",
        "PLUMBING",
        "ELECTRICAL",
        "EXTERIOR",
        "INTERIOR",
        "LANDSCAPING",
        "APPLIANCE",
        "STRUCTURAL",
        "OTHER",
      ],
      description: "The category this project belongs to",
    },
    difficulty: {
      type: "string",
      enum: ["EASY", "MEDIUM", "HARD", "EXPERT"],
      description: "The difficulty level required for this project",
    },
    estimatedHours: {
      type: "number",
      description: "Total estimated hours to complete the project",
    },
    estimatedCostMin: {
      type: "number",
      description: "Minimum estimated cost in USD",
    },
    estimatedCostMax: {
      type: "number",
      description: "Maximum estimated cost in USD",
    },
    permitRequired: {
      type: "boolean",
      description: "Whether a permit is required for this project",
    },
    permitInfo: {
      type: "string",
      description: "Information about permit requirements if needed",
    },
    safetyNotes: {
      type: "string",
      description: "Important safety considerations and warnings",
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepNumber: { type: "number" },
          name: { type: "string" },
          description: { type: "string" },
          instructions: {
            type: "string",
            description: "Detailed step-by-step instructions",
          },
          estimatedHours: { type: "number" },
        },
        required: ["stepNumber", "name", "description", "instructions"],
      },
    },
    materials: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          quantity: { type: "number" },
          unit: {
            type: "string",
            description: "Unit of measurement (e.g., 'pieces', 'gallons', 'sq ft', 'linear feet')",
          },
          unitPrice: { type: "number", description: "Estimated price per unit in USD" },
          vendor: { type: "string", description: "Suggested vendor (e.g., 'Home Depot', 'Lowe's')" },
        },
        required: ["name", "quantity", "unit"],
      },
    },
    tools: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          owned: {
            type: "boolean",
            description: "Whether this is a common tool most homeowners would own",
          },
          rentalCost: {
            type: "number",
            description: "Daily rental cost in USD if tool needs to be rented",
          },
          rentalDays: {
            type: "number",
            description: "Number of days the tool would be needed",
          },
          purchaseCost: {
            type: "number",
            description: "Purchase cost in USD if buying the tool",
          },
        },
        required: ["name"],
      },
    },
    commonMistakes: {
      type: "array",
      items: { type: "string" },
      description: "Common mistakes to avoid when doing this project",
    },
  },
  required: [
    "name",
    "description",
    "category",
    "difficulty",
    "estimatedHours",
    "estimatedCostMin",
    "estimatedCostMax",
    "steps",
    "materials",
    "tools",
  ],
};

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectDescription, homeContext } = body;

    if (!projectDescription || projectDescription.trim().length === 0) {
      return NextResponse.json(
        { error: "Project description is required" },
        { status: 400 }
      );
    }

    // Build the prompt
    let prompt = `You are an expert DIY home improvement advisor. Create a comprehensive project plan for the following DIY project:

Project Description: ${projectDescription}`;

    if (homeContext) {
      prompt += `\n\nHome Context:\n`;
      if (homeContext.yearBuilt) {
        prompt += `- Year Built: ${homeContext.yearBuilt}\n`;
      }
      if (homeContext.homeType) {
        prompt += `- Home Type: ${homeContext.homeType}\n`;
      }
      if (homeContext.squareFootage) {
        prompt += `- Square Footage: ${homeContext.squareFootage}\n`;
      }
      if (homeContext.location) {
        prompt += `- Location: ${homeContext.location}\n`;
      }
    }

    prompt += `\n\nPlease provide:
1. A clear project name
2. A detailed description
3. The appropriate category
4. Difficulty level (EASY for beginners, MEDIUM for those with some experience, HARD for advanced DIYers, EXPERT for professionals)
5. Realistic time estimate in hours
6. Cost estimate range (minimum and maximum in USD)
7. Whether permits are required (be conservative - if unsure, mark as true)
8. Safety notes and important warnings
9. Step-by-step instructions (break down into logical, sequential steps)
10. Complete material list with quantities and estimated prices
11. Complete tool list (mark common tools as 'owned', provide rental/purchase costs for specialized tools)
12. Common mistakes to avoid

Be thorough, accurate, and safety-conscious. Provide realistic estimates based on current market prices.`;

    // Call OpenAI
    const openai = getOpenAI();
    
    // Enhanced prompt with JSON format instructions
    const enhancedPrompt = `${prompt}

Please respond with a valid JSON object matching this exact structure:
{
  "name": "Project name",
  "description": "Detailed description",
  "category": "CATEGORY",
  "difficulty": "DIFFICULTY",
  "estimatedHours": number,
  "estimatedCostMin": number,
  "estimatedCostMax": number,
  "permitRequired": boolean,
  "permitInfo": "string or null",
  "safetyNotes": "string or null",
  "steps": [{"stepNumber": number, "name": "string", "description": "string", "instructions": "string", "estimatedHours": number}],
  "materials": [{"name": "string", "description": "string", "quantity": number, "unit": "string", "unitPrice": number, "vendor": "string"}],
  "tools": [{"name": "string", "description": "string", "owned": boolean, "rentalCost": number, "rentalDays": number, "purchaseCost": number}],
  "commonMistakes": ["string"]
}

Return ONLY valid JSON, no other text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert DIY home improvement advisor. Always provide comprehensive, accurate, and safety-conscious project plans. Be realistic with time and cost estimates. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: enhancedPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // Validate required fields
    if (!parsed.name || !parsed.category || !parsed.difficulty || !parsed.steps || !parsed.materials || !parsed.tools) {
      throw new Error("AI response missing required fields");
    }

    return NextResponse.json({ plan: parsed });
  } catch (error: any) {
    console.error("Error generating project plan:", error);
    
    // Handle OpenAI API errors
    if (error.message?.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        {
          error: "AI service not configured",
          message: "OpenAI API key is not set up. Please configure OPENAI_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate project plan",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

