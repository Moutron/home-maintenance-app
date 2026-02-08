import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getOrCreateUser(clerkId: string, email: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (user) {
    if (user.email !== email) {
      user = await prisma.user.update({
        where: { clerkId },
        data: { email },
      });
    }
    return user;
  }

  user = await prisma.user.findFirst({
    where: { email },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { clerkId },
    });
    return user;
  }

  try {
    user = await prisma.user.create({
      data: {
        clerkId,
        email,
      },
    });
    return user;
  } catch (createError: any) {
    if (createError?.code === "P2002") {
      user = await prisma.user.findFirst({
        where: { email },
      });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId },
        });
        return user;
      }
    }
    throw createError;
  }
}

const createToolSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.union([z.number(), z.string()]).optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const updateToolSchema = createToolSchema.partial();

// GET - List all tools in user's inventory
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: any = {
      userId: user.id,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }

    const tools = await (prisma as any).toolInventory.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error("Error fetching tool inventory:", error);
    console.error("Error name:", error?.name);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      {
        error: "Failed to fetch tool inventory",
        details: error?.message || String(error),
        message: error?.message || "An error occurred while fetching tools",
      },
      { status: 500 }
    );
  }
}

// POST - Add tool to inventory
export async function POST(request: NextRequest) {
  let body: any = null;
  let cleanedBody: any = null;
  
  try {
    console.log("[TOOL-INVENTORY] POST request received");
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
    console.log("[TOOL-INVENTORY] Getting/creating user:", email);
    const user = await getOrCreateUser(clerkId, email);
    console.log("[TOOL-INVENTORY] User ID:", user.id);

    console.log("[TOOL-INVENTORY] Parsing request body...");
    body = await request.json();
    console.log("[TOOL-INVENTORY] Request body received:", JSON.stringify(body, null, 2));
    
    // Clean up empty strings and handle special cases - be very permissive
    cleanedBody = {
      name: (body.name || "").trim(),
    };
    
    // Only include fields that have non-empty values
    if (body.description && typeof body.description === "string" && body.description.trim()) {
      cleanedBody.description = body.description.trim();
    }
    if (body.category && typeof body.category === "string" && body.category.trim()) {
      cleanedBody.category = body.category.trim();
    }
    if (body.brand && typeof body.brand === "string" && body.brand.trim()) {
      cleanedBody.brand = body.brand.trim();
    }
    if (body.model && typeof body.model === "string" && body.model.trim()) {
      cleanedBody.model = body.model.trim();
    }
    if (body.purchaseDate && typeof body.purchaseDate === "string" && body.purchaseDate.trim()) {
      cleanedBody.purchaseDate = body.purchaseDate.trim();
    }
    if (body.location && typeof body.location === "string" && body.location.trim()) {
      cleanedBody.location = body.location.trim();
    }
    if (body.notes && typeof body.notes === "string" && body.notes.trim()) {
      cleanedBody.notes = body.notes.trim();
    }
    
    // Handle purchasePrice - convert string to number, but don't include if invalid
    if (body.purchasePrice !== undefined && body.purchasePrice !== null && body.purchasePrice !== "") {
      const price = typeof body.purchasePrice === "string" ? parseFloat(body.purchasePrice) : body.purchasePrice;
      if (!isNaN(price) && price > 0) {
        cleanedBody.purchasePrice = price;
      }
    }
    
    // Handle condition - only include if it's a valid enum value
    if (body.condition && typeof body.condition === "string" && body.condition.trim()) {
      const cond = body.condition.trim();
      if (["excellent", "good", "fair", "poor"].includes(cond)) {
        cleanedBody.condition = cond;
      }
    }
    
    console.log("Cleaned body before validation:", JSON.stringify(cleanedBody, null, 2));
    
    let validatedData;
    try {
      validatedData = createToolSchema.parse(cleanedBody);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
    } catch (validationError: any) {
      console.error("Validation error:", validationError);
      if (validationError instanceof z.ZodError) {
        const errorMessages = validationError.issues.map((err: any) => ({
          field: err.path.length > 0 ? err.path.join(".") : "unknown",
          message: err.message,
          code: err.code,
        }));
        return NextResponse.json(
          {
            error: "Validation error",
            details: errorMessages,
            message: `Validation failed: ${errorMessages.map((e: any) => `${e.field}: ${e.message}`).join(", ")}`,
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Ensure toolInventory is available (check safely)
    try {
      if (!prisma.toolInventory) {
        console.error("Prisma client does not have toolInventory model. Please restart the server.");
        return NextResponse.json(
          {
            error: "Server configuration error",
            details: "ToolInventory model not available. Please restart the server.",
          },
          { status: 500 }
        );
      }
    } catch (checkError: any) {
      console.error("Error checking toolInventory:", checkError);
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "ToolInventory model not available. Please restart the server and run 'npx prisma generate'.",
          message: checkError.message,
        },
        { status: 500 }
      );
    }

    // Build database data object
    const dbData: any = {
      userId: user.id,
      name: validatedData.name,
    };
    
    if (validatedData.description) dbData.description = validatedData.description;
    if (validatedData.category) dbData.category = validatedData.category;
    if (validatedData.brand) dbData.brand = validatedData.brand;
    if (validatedData.model) dbData.model = validatedData.model;
    if (validatedData.purchaseDate) {
      try {
        dbData.purchaseDate = new Date(validatedData.purchaseDate);
      } catch (e) {
        // Invalid date, skip it
      }
    }
    if (validatedData.purchasePrice !== undefined && validatedData.purchasePrice !== null) {
      const price = typeof validatedData.purchasePrice === "number" 
        ? validatedData.purchasePrice 
        : parseFloat(String(validatedData.purchasePrice));
      if (!isNaN(price) && price > 0) {
        dbData.purchasePrice = price;
      }
    }
    if (validatedData.condition && ["excellent", "good", "fair", "poor"].includes(validatedData.condition)) {
      dbData.condition = validatedData.condition;
    }
    if (validatedData.location) dbData.location = validatedData.location;
    if (validatedData.notes) dbData.notes = validatedData.notes;

    console.log("Database data to insert:", JSON.stringify(dbData, null, 2));
    
    let tool;
    try {
      // Use type assertion to avoid TypeScript errors if model doesn't exist
      tool = await (prisma as any).toolInventory.create({
        data: dbData,
      });
      console.log("Tool created successfully:", tool.id);
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      console.error("Database error code:", dbError?.code);
      console.error("Database error meta:", dbError?.meta);
      console.error("Database error message:", dbError?.message);
      
      // Return proper JSON error instead of throwing
      return NextResponse.json(
        {
          error: "Database error",
          details: dbError?.message || String(dbError),
          message: `Failed to create tool: ${dbError?.message || "Database error occurred"}`,
          code: dbError?.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating tool:", error);
    console.error("Error name:", error?.name);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Request body:", body ? JSON.stringify(body, null, 2) : "null");
    console.error("Cleaned body:", cleanedBody ? JSON.stringify(cleanedBody, null, 2) : "null");
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error("Zod validation errors:", JSON.stringify(error.issues, null, 2));
      const errorMessages = error.issues.map((err: any) => ({
        field: err.path.length > 0 ? err.path.join(".") : "unknown",
        message: err.message,
        code: err.code,
        path: err.path,
      }));
      return NextResponse.json(
        {
          error: "Validation error",
          details: errorMessages,
          message: `Validation failed: ${errorMessages.map((e: any) => `${e.field}: ${e.message}`).join(", ")}`,
        },
        { status: 400 }
      );
    }
    
    // Handle Prisma errors
    if (error?.code && error.code.startsWith("P")) {
      console.error("Prisma error:", error.code, error.meta);
      return NextResponse.json(
        {
          error: "Database error",
          details: error.message || String(error),
          message: `Database error: ${error.message || "Failed to save tool"}`,
          code: error.code,
        },
        { status: 500 }
      );
    }
    
    // Generic error handler
    return NextResponse.json(
      {
        error: "Failed to create tool",
        details: error?.message || String(error),
        message: error?.message || "An unexpected error occurred",
        type: error?.constructor?.name || "UnknownError",
      },
      { status: 500 }
    );
  }
}

