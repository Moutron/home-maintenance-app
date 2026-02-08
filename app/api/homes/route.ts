import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHomeSchema } from "@/lib/validations/home";

// Helper function to get or create user from Clerk
async function getOrCreateUser(clerkId: string, email: string) {
  console.log("[GET-OR-CREATE-USER] Looking for user with clerkId:", clerkId, "email:", email);
  
  // First, try to find by clerkId
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (user) {
    console.log("[GET-OR-CREATE-USER] Found user by clerkId:", user.id);
    // If email changed, update it
    if (user.email !== email) {
      console.log("[GET-OR-CREATE-USER] Updating email from", user.email, "to", email);
      user = await prisma.user.update({
        where: { clerkId },
        data: { email },
      });
    }
    return user;
  }

  // If not found by clerkId, try to find by email
  user = await prisma.user.findFirst({
    where: { email },
  });

  if (user) {
    console.log("[GET-OR-CREATE-USER] Found user by email:", user.id, "updating clerkId");
    // Update the existing user with the new clerkId
    user = await prisma.user.update({
      where: { id: user.id },
      data: { clerkId },
    });
    return user;
  }

  // User doesn't exist, create new one
  console.log("[GET-OR-CREATE-USER] Creating new user");
  try {
    user = await prisma.user.create({
      data: {
        clerkId,
        email,
      },
    });
    console.log("[GET-OR-CREATE-USER] Created new user:", user.id);
    return user;
  } catch (createError: any) {
    // If creation fails due to unique constraint, try to find again
    if (createError?.code === "P2002") {
      console.log("[GET-OR-CREATE-USER] Unique constraint error, trying to find existing user");
      // Try to find by email one more time
      user = await prisma.user.findFirst({
        where: { email },
      });
      if (user) {
        console.log("[GET-OR-CREATE-USER] Found existing user after constraint error, updating clerkId");
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

// Helper function to estimate climate zone from ZIP code
// This is a simplified version - in production, you'd use a geocoding API
function estimateClimateZone(zipCode: string, state: string): string {
  // Simplified mapping - in production, use a proper climate zone API
  const zoneMap: Record<string, string> = {
    FL: "9-11",
    CA: "7-10",
    TX: "7-9",
    AZ: "8-10",
    NV: "6-9",
    GA: "7-9",
    SC: "7-9",
    NC: "7-8",
    VA: "6-8",
    MD: "6-7",
    DE: "7",
    NJ: "6-7",
    NY: "5-7",
    MA: "5-7",
    CT: "6",
    RI: "6",
    NH: "5",
    VT: "5",
    ME: "4-5",
    MN: "3-5",
    WI: "4-5",
    MI: "5-6",
    IL: "5-6",
    IN: "5-6",
    OH: "5-6",
    PA: "5-7",
    WA: "6-9",
    OR: "6-9",
    ID: "5-7",
    MT: "4-6",
    WY: "4-6",
    CO: "5-7",
    NM: "6-8",
    UT: "5-7",
    ND: "3-4",
    SD: "4-5",
    NE: "5",
    KS: "5-6",
    OK: "6-7",
    AR: "7-8",
    LA: "8-9",
    MS: "8-9",
    AL: "7-9",
    TN: "6-8",
    KY: "6-7",
    WV: "6",
    MO: "5-7",
    IA: "5",
  };

  return zoneMap[state] || "5-7"; // Default to temperate zone
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user email from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const user = await getOrCreateUser(clerkId, email);

    const homes = await prisma.home.findMany({
      where: { userId: user.id },
      include: {
        systems: true,
      },
    });

    return NextResponse.json({ homes });
  } catch (error) {
    console.error("Error fetching homes:", error);
    return NextResponse.json(
      { error: "Failed to fetch homes", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Log immediately - even before try block
  console.log("=== API ROUTE: POST /api/homes - START ===");
  console.log("[API-START-0] Route handler called");
  
  try {
    console.log("[API-START-1] Getting auth...");
    const { userId: clerkId } = await auth();
    console.log("[API-START-2] Auth result:", clerkId ? "authenticated" : "not authenticated");

    if (!clerkId) {
      console.log("[API-START-3] No clerkId, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[API-START-4] Clerk ID:", clerkId);
    
    console.log("[API-START-5] Parsing request body...");
    let body;
    try {
      body = await request.json();
      console.log("[API-START-6] Request body parsed successfully");
    } catch (parseError: any) {
      console.error("[API-START-6] ERROR parsing request body:", parseError);
      console.error("[API-START-6] Parse error message:", parseError?.message);
      console.error("[API-START-6] Parse error stack:", parseError?.stack);
      return NextResponse.json(
        { error: "Invalid request body", message: parseError?.message },
        { status: 400 }
      );
    }
    console.log("=== API ROUTE: POST /api/homes ===");
    console.log("[API-1] Raw request body received:", JSON.stringify(body, null, 2));
    console.log("[API-2] Body types:", {
      address: typeof body.address,
      city: typeof body.city,
      state: typeof body.state,
      zipCode: typeof body.zipCode,
      yearBuilt: typeof body.yearBuilt,
      homeType: typeof body.homeType,
    });
    console.log("[API-3] Raw values:", {
      address: body.address,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      stateLength: body.state?.length,
      zipCodeLength: body.zipCode?.length,
    });
    
    // Normalize address - extract just the street address (before first comma)
    if (body.address) {
      const originalAddress = body.address;
      // If address contains commas, take only the first part (street address)
      // Example: "123 Main St, City, State" -> "123 Main St"
      if (body.address.includes(',')) {
        body.address = body.address.split(',')[0].trim();
      }
      body.address = body.address.trim();
      console.log(`[VALIDATION] Address normalized: "${originalAddress}" -> "${body.address}"`);
    }
    
    // Normalize ZIP code and state before validation
    console.log("[API-4] Starting normalization...");
    if (body.zipCode) {
      const originalZip = body.zipCode;
      console.log("[API-5] ZIP code normalization:", {
        original: originalZip,
        type: typeof originalZip,
        isString: typeof originalZip === 'string',
      });
      // Remove all non-digit characters except dash
      body.zipCode = body.zipCode.toString().trim().replace(/[^\d-]/g, '');
      console.log("[API-6] ZIP code after trim/replace:", body.zipCode);
      // If it's 9 digits without dash, format as 12345-6789
      if (body.zipCode.length === 9 && !body.zipCode.includes('-')) {
        body.zipCode = `${body.zipCode.slice(0, 5)}-${body.zipCode.slice(5)}`;
        console.log("[API-7] ZIP code formatted to extended:", body.zipCode);
      }
      // If it's longer than 5 digits but doesn't have dash, take first 5
      if (body.zipCode.length > 5 && !body.zipCode.includes('-')) {
        body.zipCode = body.zipCode.slice(0, 5);
        console.log("[API-8] ZIP code truncated to 5 digits:", body.zipCode);
      }
      console.log(`[API-9] ZIP code normalized: "${originalZip}" -> "${body.zipCode}"`);
      console.log(`[API-10] ZIP code validation check:`, {
        value: body.zipCode,
        length: body.zipCode.length,
        matchesPattern: /^\d{5}(-\d{4})?$/.test(body.zipCode),
      });
    } else {
      console.warn("[API-5] ZIP code is missing or falsy:", body.zipCode);
    }
    
    if (body.state) {
      const originalState = body.state;
      console.log("[API-11] State normalization:", {
        original: originalState,
        type: typeof originalState,
        isString: typeof originalState === 'string',
      });
      // Extract first 2 letters, uppercase
      body.state = body.state.toString().trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
      console.log(`[API-12] State normalized: "${originalState}" -> "${body.state}"`);
      console.log(`[API-13] State validation check:`, {
        value: body.state,
        length: body.state.length,
        isValid: body.state.length === 2,
      });
    } else {
      console.warn("[API-11] State is missing or falsy:", body.state);
    }
    
    console.log("[API-14] Final normalized body before Zod validation:", JSON.stringify(body, null, 2));
    
    console.log("[API-15] Starting Zod validation...");
    let validatedData;
    try {
      validatedData = createHomeSchema.parse(body);
      console.log("[API-16] ✅ Zod validation PASSED");
      console.log("[API-17] Validated data:", JSON.stringify(validatedData, null, 2));
    } catch (validationError: any) {
      console.error("[API-16] ❌ Zod validation FAILED");
      console.error("[API-17] Validation error type:", validationError?.constructor?.name);
      console.error("[API-18] Validation error message:", validationError?.message);
      console.error("[API-19] Validation error stack:", validationError?.stack);
      
      // Check if it's a ZodError
      if (validationError?.issues) {
        console.error("[API-20] Zod error issues:", JSON.stringify(validationError.issues, null, 2));
        const errorMessages = validationError.issues.map((err: any) => {
          const fieldPath = err.path.join(".");
          const receivedValue = err.path.length > 0 ? body[err.path[0]] : undefined;
          console.error(`[API-21] Field error - ${fieldPath}:`, {
            code: err.code,
            message: err.message,
            received: receivedValue,
            receivedType: typeof receivedValue,
            receivedLength: typeof receivedValue === 'string' ? receivedValue.length : undefined,
          });
          return {
            field: fieldPath,
            message: err.message,
            code: err.code,
            received: receivedValue,
          };
        });
        
        console.error("[API-22] Formatted error messages:", errorMessages);
        
        return NextResponse.json(
          { 
            error: "Validation error", 
            details: errorMessages,
            message: errorMessages.map((e: any) => `${e.field}: ${e.message}${e.received !== undefined ? ` (received: "${e.received}" [${typeof e.received}])` : ""}`).join(", "),
            debug: {
              normalizedBody: body,
              errorIssues: validationError.issues,
            }
          },
          { status: 400 }
        );
      }
      
      // If it's not a ZodError, log it differently
      console.error("[API-23] Non-Zod error:", validationError);
      throw validationError;
    }

    // Get user email from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const user = await getOrCreateUser(clerkId, email);

    console.log("[API-29] Estimating climate zone...");
    // Estimate climate zone
    const climateZone = estimateClimateZone(
      validatedData.zipCode,
      validatedData.state
    );
    console.log("[API-30] Climate zone:", climateZone);

    // Normalize address for comparison (lowercase, trim whitespace, remove extra spaces)
    const normalizeString = (str: string) => str.toLowerCase().trim().replace(/\s+/g, " ");
    const normalizedAddress = normalizeString(validatedData.address);
    const normalizedCity = normalizeString(validatedData.city);
    const normalizedZipCode = validatedData.zipCode.trim();
    const normalizedState = validatedData.state.toUpperCase().trim();

    console.log("[API-31] Checking for existing homes...");
    // Check if a home already exists for this user with the same address
    // Use case-insensitive comparison by checking all homes and filtering
    let allUserHomes;
    try {
      allUserHomes = await prisma.home.findMany({
        where: {
          userId: user.id,
        },
        include: {
          systems: true,
        },
      });
      console.log("[API-32] Found", allUserHomes.length, "existing homes");
    } catch (dbError: any) {
      console.error("[API-32] Database error fetching homes:", dbError);
      console.error("[API-32] Error message:", dbError?.message);
      console.error("[API-32] Error stack:", dbError?.stack);
      throw dbError;
    }

    console.log(`[UPSERT] Checking ${allUserHomes.length} existing homes for user ${user.id}`);
    console.log(`[UPSERT] Looking for: "${normalizedAddress}", "${normalizedCity}", "${normalizedState}", "${normalizedZipCode}"`);
    
    if (allUserHomes.length > 0) {
      console.log(`[UPSERT] Existing homes:`, allUserHomes.map(h => ({
        id: h.id,
        address: h.address,
        city: h.city,
        state: h.state,
        zipCode: h.zipCode
      })));
    }

    // Find matching home (case-insensitive address, city, state, and zip code comparison)
    // Use fuzzy matching to handle minor differences
    const existingHome = allUserHomes.find((h) => {
      const hAddress = normalizeString(h.address);
      const hCity = normalizeString(h.city);
      const hState = h.state.toUpperCase().trim();
      const hZipCode = h.zipCode.trim();
      
      // Exact match on zip code and state (required)
      if (hZipCode !== normalizedZipCode || hState !== normalizedState) {
        return false;
      }
      
      // More lenient fuzzy match on address and city
      // Check if addresses are very similar (allowing for abbreviations, etc.)
      const addressMatch = 
        hAddress === normalizedAddress || 
        hAddress.includes(normalizedAddress) || 
        normalizedAddress.includes(hAddress) ||
        // Check if they match after removing common words
        hAddress.replace(/\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place)\b/gi, "").trim() === 
        normalizedAddress.replace(/\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place)\b/gi, "").trim();
      
      const cityMatch = 
        hCity === normalizedCity || 
        hCity.includes(normalizedCity) || 
        normalizedCity.includes(hCity);
      
      return addressMatch && cityMatch;
    });
    
    if (existingHome) {
      console.log(`[UPSERT] Found existing home match:`, {
        existingId: existingHome.id,
        existingAddress: existingHome.address,
        existingCity: existingHome.city,
        newAddress: validatedData.address,
        newCity: validatedData.city,
      });
    } else {
      console.log(`[UPSERT] No existing home match found. Will create new home.`);
    }

    let home;
    let isUpdate = false;

    if (existingHome) {
      console.log(`[API-33] Found existing home: ${existingHome.id}, updating...`);
      isUpdate = true;
      
      try {
        // Update existing home (upsert)
        // First, delete existing systems to replace them
        console.log("[API-34] Deleting existing systems...");
        await prisma.homeSystem.deleteMany({
          where: { homeId: existingHome.id },
        });
        console.log("[API-35] Systems deleted");

        // Update the home with new data
        console.log("[API-36] Updating home with data:", {
          address: validatedData.address,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zipCode,
          systemsCount: validatedData.systems?.length || 0,
        });
        home = await prisma.home.update({
        where: { id: existingHome.id },
        data: {
          address: validatedData.address,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zipCode,
          yearBuilt: validatedData.yearBuilt,
          squareFootage: validatedData.squareFootage,
          lotSize: validatedData.lotSize,
          homeType: validatedData.homeType,
          climateZone,
          stormFrequency: validatedData.stormFrequency || null,
          averageRainfall: validatedData.averageRainfall || null,
          averageSnowfall: validatedData.averageSnowfall || null,
          windZone: validatedData.windZone || null,
          systems: {
            create: (validatedData.systems || []).map((system) => ({
              systemType: system.systemType,
              brand: system.brand,
              model: system.model,
              installDate: system.installDate
                ? new Date(system.installDate)
                : null,
              expectedLifespan: system.expectedLifespan,
              material: system.material,
              capacity: system.capacity,
              condition: system.condition,
              lastInspection: system.lastInspection
                ? new Date(system.lastInspection)
                : null,
              stormResistance: system.stormResistance,
              notes: system.notes,
            })),
          },
        },
        include: {
          systems: true,
        },
      });
      console.log("[API-37] Home updated successfully");
    } catch (updateError: any) {
      console.error("[API-37] Error updating home:", updateError);
      console.error("[API-37] Error message:", updateError?.message);
      console.error("[API-37] Error stack:", updateError?.stack);
      console.error("[API-37] Error code:", updateError?.code);
      throw updateError;
    }
  } else {
      console.log(`[UPSERT] No existing home found, creating new home...`);
      
      // Try to create new home, but catch unique constraint errors
      try {
        home = await prisma.home.create({
          data: {
            userId: user.id,
            address: validatedData.address,
            city: validatedData.city,
            state: validatedData.state,
            zipCode: validatedData.zipCode,
            yearBuilt: validatedData.yearBuilt,
            squareFootage: validatedData.squareFootage,
            lotSize: validatedData.lotSize,
            homeType: validatedData.homeType,
            climateZone,
            stormFrequency: validatedData.stormFrequency || null,
            averageRainfall: validatedData.averageRainfall || null,
            averageSnowfall: validatedData.averageSnowfall || null,
            windZone: validatedData.windZone || null,
            systems: {
              create: (validatedData.systems || []).map((system) => ({
                systemType: system.systemType,
                brand: system.brand,
                model: system.model,
                installDate: system.installDate
                  ? new Date(system.installDate)
                  : null,
                expectedLifespan: system.expectedLifespan,
                material: system.material,
                capacity: system.capacity,
                condition: system.condition,
                lastInspection: system.lastInspection
                  ? new Date(system.lastInspection)
                  : null,
                stormResistance: system.stormResistance,
                notes: system.notes,
              })),
            },
          },
          include: {
            systems: true,
          },
        });
        console.log(`[UPSERT] Successfully created new home: ${home.id}`);
      } catch (createError: any) {
        // If we get a unique constraint error, try to find and update
        if (createError?.code === "P2002") {
          console.log(`[UPSERT] Unique constraint violation, attempting to find and update...`);
          
          // Re-fetch all homes to find the one that caused the conflict
          const conflictHomes = await prisma.home.findMany({
            where: {
              userId: user.id,
            },
            include: {
              systems: true,
            },
          });

          console.log(`[UPSERT] P2002 error - searching ${conflictHomes.length} homes for conflict`);
          
          // Use same fuzzy matching logic
          const conflictHome = conflictHomes.find((h) => {
            const hAddress = normalizeString(h.address);
            const hCity = normalizeString(h.city);
            const hState = h.state.toUpperCase().trim();
            const hZipCode = h.zipCode.trim();
            
            if (hZipCode !== normalizedZipCode || hState !== normalizedState) {
              return false;
            }
            
            const addressMatch = hAddress === normalizedAddress || 
              hAddress.includes(normalizedAddress) || 
              normalizedAddress.includes(hAddress);
            const cityMatch = hCity === normalizedCity || 
              hCity.includes(normalizedCity) || 
              normalizedCity.includes(hCity);
            
            return addressMatch && cityMatch;
          });
          
          console.log(`[UPSERT] Conflict search result:`, conflictHome ? `Found ${conflictHome.id}` : "Not found");

          if (conflictHome) {
            console.log(`[UPSERT] Found conflicting home: ${conflictHome.id}, updating...`);
            isUpdate = true;
            
            // Delete existing systems
            await prisma.homeSystem.deleteMany({
              where: { homeId: conflictHome.id },
            });

            // Update the conflicting home
            home = await prisma.home.update({
              where: { id: conflictHome.id },
              data: {
                address: validatedData.address,
                city: validatedData.city,
                state: validatedData.state,
                zipCode: validatedData.zipCode,
                yearBuilt: validatedData.yearBuilt,
                squareFootage: validatedData.squareFootage,
                lotSize: validatedData.lotSize,
                homeType: validatedData.homeType,
                climateZone,
                stormFrequency: validatedData.stormFrequency || null,
                averageRainfall: validatedData.averageRainfall || null,
                averageSnowfall: validatedData.averageSnowfall || null,
                windZone: validatedData.windZone || null,
                systems: {
                  create: validatedData.systems.map((system) => ({
                    systemType: system.systemType,
                    brand: system.brand,
                    model: system.model,
                    installDate: system.installDate
                      ? new Date(system.installDate)
                      : null,
                    expectedLifespan: system.expectedLifespan,
                    material: system.material,
                    capacity: system.capacity,
                    condition: system.condition,
                    lastInspection: system.lastInspection
                      ? new Date(system.lastInspection)
                      : null,
                    stormResistance: system.stormResistance,
                    notes: system.notes,
                  })),
                },
              },
              include: {
                systems: true,
              },
            });
            console.log(`[UPSERT] Successfully updated conflicting home: ${home.id}`);
          } else {
            // Couldn't find the conflicting home, re-throw the error
            throw createError;
          }
        } else {
          // Not a unique constraint error, re-throw
          throw createError;
        }
      }
    }

    return NextResponse.json({ 
      home,
      isUpdate,
      message: isUpdate ? "Home updated successfully" : "Home created successfully"
    }, { status: isUpdate ? 200 : 201 });
  } catch (error: any) {
    console.error("=== API ERROR HANDLER (TOP LEVEL) ===");
    console.error("[API-ERROR-1] Error occurred!");
    console.error("[API-ERROR-2] Error type:", error?.constructor?.name);
    console.error("[API-ERROR-3] Error name:", error?.name);
    console.error("[API-ERROR-4] Error message:", error?.message);
    console.error("[API-ERROR-5] Error stack:", error?.stack);
    console.error("[API-ERROR-6] Error code:", error?.code);
    if (error?.meta) {
      console.error("[API-ERROR-7] Prisma meta:", JSON.stringify(error.meta, null, 2));
    }
    try {
      console.error("[API-ERROR-8] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (stringifyError) {
      console.error("[API-ERROR-8] Could not stringify error:", stringifyError);
      console.error("[API-ERROR-8] Error toString:", String(error));
    }
    
    // Handle Zod validation errors
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      const errorMessages = zodError.errors?.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
      })) || [];
      
      return NextResponse.json(
        { 
          error: "Validation error", 
          details: errorMessages,
          message: errorMessages.map((e: any) => `${e.field}: ${e.message}`).join(", ")
        },
        { status: 400 }
      );
    }
    
    // Handle Prisma errors (shouldn't happen with upsert, but keep for safety)
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as any;
      if (prismaError.code === "P2002") {
        // This shouldn't happen with upsert logic, but if it does, log it
        console.error("[ERROR] Unique constraint violation still occurred after upsert attempt:", prismaError);
        console.error("[ERROR] Prisma error details:", JSON.stringify(prismaError, null, 2));
        
        // Check if this is a User creation error (from getOrCreateUser)
        if (prismaError.meta?.modelName === "User") {
          console.error("[ERROR] User creation failed - unique constraint on email");
          return NextResponse.json(
            { 
              error: "Account error",
              message: "An account with this email already exists. Please contact support if you believe this is an error.",
            },
            { status: 409 }
          );
        }
        
        // Ensure we have the user and validated data (they should be in scope)
        if (typeof user === "undefined" || !validatedData) {
          console.error("[ERROR] Missing user or validatedData in error handler");
          return NextResponse.json(
            { 
              error: "Internal error",
              message: "Could not process request. Please try again.",
            },
            { status: 500 }
          );
        }
        
        // Try one more time to find and update - actually perform the upsert
        try {
          console.log(`[ERROR RECOVERY] Starting recovery attempt...`);
          const allHomes = await prisma.home.findMany({
            where: { userId: user.id },
            include: { systems: true },
          });
          
          console.log(`[ERROR RECOVERY] Found ${allHomes.length} homes for user`);
          
          const normalizeString = (str: string) => str.toLowerCase().trim().replace(/\s+/g, " ");
          const normAddress = normalizeString(validatedData.address);
          const normCity = normalizeString(validatedData.city);
          const normState = validatedData.state.toUpperCase().trim();
          const normZip = validatedData.zipCode.trim();
          
          console.log(`[ERROR RECOVERY] Looking for: "${normAddress}", "${normCity}", "${normState}", "${normZip}"`);
          
          // Try multiple matching strategies
          let foundHome = allHomes.find((h) => {
            const hAddr = normalizeString(h.address);
            const hCity = normalizeString(h.city);
            const hState = h.state.toUpperCase().trim();
            const hZip = h.zipCode.trim();
            
            // Strategy 1: Exact match on zip and state, fuzzy on address/city
            if (hZip === normZip && hState === normState) {
              const addressMatch = hAddr === normAddress || 
                hAddr.includes(normAddress) || 
                normAddress.includes(hAddr) ||
                hAddr.replace(/\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place)\b/gi, "").trim() === 
                normAddress.replace(/\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place)\b/gi, "").trim();
              
              const cityMatch = hCity === normCity || 
                hCity.includes(normCity) || 
                normCity.includes(hCity);
              
              return addressMatch && cityMatch;
            }
            return false;
          });
          
          // Strategy 2: If not found, try matching just by zip code (most reliable)
          if (!foundHome && allHomes.length > 0) {
            console.log(`[ERROR RECOVERY] Strategy 1 failed, trying zip code only match...`);
            // If user only has one home with this zip code, use it
            const zipMatches = allHomes.filter(h => h.zipCode.trim() === normZip);
            if (zipMatches.length === 1) {
              foundHome = zipMatches[0];
              console.log(`[ERROR RECOVERY] Found single home with matching zip code: ${foundHome.id}`);
            }
          }
          
          if (foundHome) {
            console.log(`[ERROR RECOVERY] Found home ${foundHome.id}, performing upsert...`);
            console.log(`[ERROR RECOVERY] Existing home:`, {
              id: foundHome.id,
              address: foundHome.address,
              city: foundHome.city,
              state: foundHome.state,
              zipCode: foundHome.zipCode
            });
            
            try {
              // Actually perform the update
              // Delete existing systems
              await prisma.homeSystem.deleteMany({
                where: { homeId: foundHome.id },
              });
              
              console.log(`[ERROR RECOVERY] Deleted existing systems`);

              // Update the home with new data
              const updatedHome = await prisma.home.update({
                where: { id: foundHome.id },
                data: {
                  address: validatedData.address,
                  city: validatedData.city,
                  state: validatedData.state,
                  zipCode: validatedData.zipCode,
                  yearBuilt: validatedData.yearBuilt,
                  squareFootage: validatedData.squareFootage,
                  lotSize: validatedData.lotSize,
                  homeType: validatedData.homeType,
                  climateZone,
                  stormFrequency: validatedData.stormFrequency || null,
                  averageRainfall: validatedData.averageRainfall || null,
                  averageSnowfall: validatedData.averageSnowfall || null,
                  windZone: validatedData.windZone || null,
                  systems: {
                    create: validatedData.systems.map((system) => ({
                      systemType: system.systemType,
                      brand: system.brand,
                      model: system.model,
                      installDate: system.installDate
                        ? new Date(system.installDate)
                        : null,
                      expectedLifespan: system.expectedLifespan,
                      material: system.material,
                      capacity: system.capacity,
                      condition: system.condition,
                      lastInspection: system.lastInspection
                        ? new Date(system.lastInspection)
                        : null,
                      stormResistance: system.stormResistance,
                      notes: system.notes,
                    })),
                  },
                },
                include: {
                  systems: true,
                },
              });
              
              console.log(`[ERROR RECOVERY] Successfully updated home: ${updatedHome.id}`);
              
              // Return success with update flag
              return NextResponse.json({
                home: updatedHome,
                isUpdate: true,
                message: "Home updated successfully"
              }, { status: 200 });
            } catch (updateError: any) {
              console.error(`[ERROR RECOVERY] Update failed:`, updateError);
              console.error(`[ERROR RECOVERY] Update error details:`, JSON.stringify(updateError, null, 2));
              // Re-throw to be caught by outer catch
              throw updateError;
            }
          } else {
            console.log(`[ERROR RECOVERY] Could not find matching home`);
            console.log(`[ERROR RECOVERY] All user homes:`, allHomes.map(h => ({
              id: h.id,
              address: h.address,
              city: h.city,
              state: h.state,
              zipCode: h.zipCode
            })));
          }
        } catch (recoveryError: any) {
          console.error("[ERROR] Recovery attempt failed:", recoveryError);
          console.error("[ERROR] Recovery error details:", JSON.stringify(recoveryError, null, 2));
          // If recovery fails, still return the error but with more context
        }
        
        return NextResponse.json(
          { 
            error: "A home with this information already exists",
            message: "We found a potential duplicate but couldn't update it automatically. Please check your existing homes or try refreshing the page.",
            code: "DUPLICATE_HOME",
            suggestion: "Go to the Homes page to view and edit your existing homes."
          },
          { status: 409 }
        );
      }
    }
    
    // Return detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to create home",
        details: errorMessage,
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

