import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
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

// Calculate next due date based on frequency
import { calculateNextDueDate as calculateRecurrenceDate } from "@/lib/utils/task-recurrence";

function calculateNextDueDate(
  frequency: string,
  baseDate: Date = new Date()
): Date {
  return calculateRecurrenceDate(frequency, baseDate);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log("=== Task Generation Started ===", new Date().toISOString());
    console.log("[1] Request URL:", request.url);
    console.log("[2] Request method:", request.method);
    
    console.log("[3] Reading request body...");
    // Read body - should work now that middleware doesn't consume it
    let body: { homeId?: string };
    try {
      body = await request.json();
      console.log("[4] Request body parsed successfully:", body);
    } catch (bodyError: any) {
      console.error("[ERROR] Error reading request body:", bodyError);
      return NextResponse.json(
        { 
          error: "Could not read request body", 
          details: bodyError?.message || String(bodyError),
        },
        { status: 400 }
      );
    }
    
    const { homeId } = body;
    console.log("[5] Extracted homeId:", homeId);
    
    if (!homeId) {
      console.log("[ERROR] No homeId provided");
      return NextResponse.json(
        { error: "homeId is required" },
        { status: 400 }
      );
    }
    
    console.log("[6] Checking authentication...");
    const { userId: clerkId } = await auth();
    console.log("[7] Auth result - clerkId:", clerkId);

    if (!clerkId) {
      console.error("[ERROR] No clerkId found - unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[8] User authenticated:", clerkId);

    console.log("[9] Getting current user...");
    const clerkUser = await currentUser();
    console.log("[10] Current user retrieved:", clerkUser ? "Yes" : "No");
    
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      console.error("[ERROR] User email not found");
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    console.log("[11] User email:", email);
    
    console.log("[12] Getting or creating user in database...");
    let user;
    try {
      user = await getOrCreateUser(clerkId, email);
      console.log("[13] User found/created:", user.id);
    } catch (userError) {
      console.error("[ERROR] Error getting/creating user:", userError);
      throw userError;
    }

    console.log("[14] Fetching home from database:", homeId, "for user:", user.id);
    let home;
    try {
      home = await prisma.home.findFirst({
        where: {
          id: homeId,
          userId: user.id,
        },
        include: {
          systems: true,
        },
      });
      console.log("[15] Home query completed. Found:", home ? "Yes" : "No");
      if (home) {
        console.log("[16] Home details:", {
          id: home.id,
          address: home.address,
          city: home.city,
          state: home.state,
          zipCode: home.zipCode,
          systemsCount: home.systems.length,
        });
      }
    } catch (homeError) {
      console.error("[ERROR] Error fetching home:", homeError);
      throw homeError;
    }

    if (!home) {
      console.error("[ERROR] Home not found for homeId:", homeId, "userId:", user.id);
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    console.log("[17] Validating home data...");
    // Validate home has required fields
    if (!home.city || !home.state || !home.zipCode) {
      console.error("[ERROR] Home data incomplete");
      return NextResponse.json(
        { 
          error: "Home data incomplete",
          message: "Home is missing required address fields (city, state, or zipCode). Please update your home information.",
          missingFields: {
            city: !home.city,
            state: !home.state,
            zipCode: !home.zipCode,
          }
        },
        { status: 400 }
      );
    }

    console.log("[18] Validating ZIP code format...");
    // Validate ZIP code format
    const zipCodeRegex = /^\d{5}(-\d{4})?$/;
    const normalizedZipCode = home.zipCode.trim().replace(/\s+/g, '');
    if (!zipCodeRegex.test(normalizedZipCode)) {
      console.error("[ERROR] Invalid ZIP code format:", home.zipCode);
      return NextResponse.json(
        { 
          error: "Invalid ZIP code format",
          message: `ZIP code "${home.zipCode}" does not match required format. Expected: 12345 or 12345-6789`,
          received: home.zipCode,
        },
        { status: 400 }
      );
    }

    console.log("[19] Validating state format...");
    // Validate state format
    const normalizedState = home.state.trim().toUpperCase();
    if (normalizedState.length !== 2) {
      console.error("[ERROR] Invalid state format:", home.state);
      return NextResponse.json(
        { 
          error: "Invalid state format",
          message: `State "${home.state}" must be exactly 2 characters (e.g., CA, TX, NY)`,
          received: home.state,
        },
        { status: 400 }
      );
    }

    console.log("[20] Fetching task templates from database...");
    // Fetch all active task templates
    const templates = await prisma.taskTemplate.findMany({
      where: {
        isActive: true,
      },
    });
    console.log("[21] Task templates fetched. Count:", templates.length);

    if (templates.length === 0) {
      console.error("[ERROR] No task templates found");
      return NextResponse.json(
        { error: "No task templates found. Please seed the database first." },
        { status: 404 }
      );
    }

    console.log("[22] Calculating home age and season...");
    // Calculate home age
    const homeAge = new Date().getFullYear() - home.yearBuilt;
    const currentSeason = getCurrentSeason();
    console.log("[23] Home age:", homeAge, "Current season:", currentSeason);

    console.log("[24] Starting template personalization loop...");
    // Filter and personalize templates based on home data
    const personalizedTasks = [];
    let templateIndex = 0;

    for (const template of templates) {
      templateIndex++;
      if (templateIndex % 10 === 0) {
        console.log(`[24.${templateIndex}] Processing template ${templateIndex}/${templates.length}: ${template.name}`);
      }
      // Determine frequency based on rules
      let frequency = template.baseFrequency;

      // Apply age rules
      if (template.ageRules) {
        const ageRules = template.ageRules as Record<string, string>;
        if (homeAge < 10 && ageRules.newHome) {
          frequency = ageRules.newHome as any;
        } else if (homeAge > 20 && ageRules.oldHome) {
          frequency = ageRules.oldHome as any;
        }
      }

      // Apply climate rules
      if (template.climateRules && home.climateZone) {
        const climateRules = template.climateRules as Record<string, string>;
        if (home.climateZone.includes("9") || home.climateZone.includes("10")) {
          if (climateRules.highDust) {
            frequency = climateRules.highDust as any;
          }
        }
      }

      // Apply storm frequency rules (for roof, exterior tasks)
      if (template.category === "EXTERIOR" && home.stormFrequency) {
        if (home.stormFrequency === "high" || home.stormFrequency === "severe") {
          // More frequent inspections in storm-prone areas
          if (frequency === "ANNUAL") {
            frequency = "BIANNUAL" as any;
          }
        }
      }

      // Check if task applies to this home based on systems
      let appliesToHome = true;
      if (template.category === "HVAC" && home.systems.length > 0) {
        appliesToHome = home.systems.some(
          (s) => s.systemType === "HVAC"
        );
      }

      // Check roof age and material for roof-related tasks
      if (template.category === "EXTERIOR" && template.name.toLowerCase().includes("roof")) {
        const roofSystem = home.systems.find((s: { systemType: string }) => s.systemType === "ROOF");
        if (roofSystem) {
          const roofAge = roofSystem.installDate
            ? new Date().getFullYear() - new Date(roofSystem.installDate).getFullYear()
            : homeAge;
          
          // Adjust frequency based on roof age
          if (roofAge > 15 && frequency === "ANNUAL") {
            frequency = "BIANNUAL" as any; // More frequent inspections for older roofs
          }

          // Adjust based on roof material
          if (roofSystem.material) {
            const material = roofSystem.material.toLowerCase();
            if (material.includes("asphalt") && roofAge > 20) {
              frequency = "QUARTERLY" as any; // Asphalt shingles need more frequent checks when old
            } else if (material.includes("metal") || material.includes("tile")) {
              // Metal and tile roofs can go longer between inspections
              if (frequency === "BIANNUAL") {
                frequency = "ANNUAL" as any;
              }
            }
          }

          // Adjust based on storm resistance
          if (home.stormFrequency === "high" || home.stormFrequency === "severe") {
            if (!roofSystem.stormResistance || !roofSystem.stormResistance.includes("wind-rated")) {
              // More frequent inspections if not properly rated for storms
              if (frequency === "ANNUAL") {
                frequency = "QUARTERLY" as any;
              }
            }
          }
        }
      }

      // Check plumbing material for plumbing tasks
      if (template.category === "PLUMBING") {
        const plumbingSystem = home.systems.find((s: { systemType: string }) => s.systemType === "PLUMBING");
        if (plumbingSystem && plumbingSystem.material) {
          const material = plumbingSystem.material.toLowerCase();
          
          // Copper pipes need different maintenance than PVC/PEX
          if (material.includes("copper")) {
            // Copper pipes may need more frequent leak checks as they age
            if (plumbingSystem.installDate) {
              const plumbingAge = new Date().getFullYear() - new Date(plumbingSystem.installDate).getFullYear();
              if (plumbingAge > 30 && template.name.toLowerCase().includes("leak")) {
                frequency = "MONTHLY" as any; // Older copper pipes need more frequent checks
              }
            }
          } else if (material.includes("pvc") || material.includes("pex")) {
            // PVC/PEX generally need less frequent maintenance
            if (frequency === "QUARTERLY") {
              frequency = "BIANNUAL" as any;
            }
          }
        }
      }

      // Check electrical system details
      if (template.category === "ELECTRICAL") {
        const electricalSystem = home.systems.find((s: { systemType: string }) => s.systemType === "ELECTRICAL");
        if (electricalSystem) {
          // Older electrical systems need more frequent inspections
          const electricalAge = electricalSystem.installDate
            ? new Date().getFullYear() - new Date(electricalSystem.installDate).getFullYear()
            : homeAge;
          
          if (electricalAge > 30) {
            // Older electrical systems need annual inspections
            if (frequency === "BIANNUAL") {
              frequency = "ANNUAL" as any;
            }
          }

          // Check panel capacity - older homes may have insufficient capacity
          if (electricalSystem.capacity) {
            const capacity = parseInt(electricalSystem.capacity.replace("A", ""));
            if (capacity < 100 && homeAge > 20) {
              // Low capacity + old home = more frequent checks
              if (frequency === "ANNUAL") {
                frequency = "BIANNUAL" as any;
              }
            }
          }

          // Check condition
          if (electricalSystem.condition === "poor" || electricalSystem.condition === "fair") {
            if (frequency === "ANNUAL") {
              frequency = "QUARTERLY" as any; // Poor condition needs more frequent checks
            }
          }
        }
      }

      // Check season
      if (template.season && template.season !== "all") {
        if (template.season !== currentSeason) {
          // Still create but schedule for appropriate season
          const seasonMonths: Record<string, number> = {
            spring: 3,
            summer: 6,
            fall: 9,
            winter: 12,
          };
          const targetMonth = seasonMonths[template.season] || 3;
          const now = new Date();
          let nextDueDate = new Date(now.getFullYear(), targetMonth - 1, 1);
          if (nextDueDate < now) {
            nextDueDate = new Date(now.getFullYear() + 1, targetMonth - 1, 1);
          }
          frequency = "ANNUAL" as any;
        }
      }

      if (appliesToHome) {
        const nextDueDate = calculateNextDueDate(frequency);

        // Ensure category and frequency match Prisma enums exactly
        const validCategories = ["HVAC", "PLUMBING", "EXTERIOR", "STRUCTURAL", "LANDSCAPING", "APPLIANCE", "SAFETY", "ELECTRICAL", "OTHER"];
        const validFrequencies = ["WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL", "SEASONAL", "AS_NEEDED"];
        
        if (!validCategories.includes(template.category)) {
          console.error(`Invalid category: ${template.category} for template ${template.id}`);
          continue; // Skip this template
        }
        
        if (!validFrequencies.includes(frequency)) {
          console.error(`Invalid frequency: ${frequency} for template ${template.id}`);
          continue; // Skip this template
        }

        personalizedTasks.push({
          homeId: home.id,
          templateId: template.id,
          name: template.name,
          description: template.description,
          category: template.category as "HVAC" | "PLUMBING" | "EXTERIOR" | "STRUCTURAL" | "LANDSCAPING" | "APPLIANCE" | "SAFETY" | "ELECTRICAL" | "OTHER",
          frequency: frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "SEASONAL" | "AS_NEEDED",
          nextDueDate: nextDueDate,
          costEstimate:
            template.costRangeMin && template.costRangeMax
              ? (template.costRangeMin + template.costRangeMax) / 2
              : null,
        });
      }
    }
    console.log(`[25] Template personalization completed. Created ${personalizedTasks.length} personalized tasks`);

    // Generate compliance tasks (with error handling and timeout)
    console.log("[26] Starting compliance task generation...");
    let complianceTasks = [];
    // Temporarily skip compliance tasks to debug hanging issue
    const SKIP_COMPLIANCE = false; // Set to true to skip compliance tasks
    if (!SKIP_COMPLIANCE) {
    try {
      console.log("[27] Compliance task generation - checking home fields...");
      // Ensure home has required fields for compliance lookup
      if (home.city && home.state && home.zipCode) {
        // Validate ZIP code format before calling compliance tasks
        const zipCodeRegex = /^\d{5}(-\d{4})?$/;
        const normalizedZipCode = home.zipCode.trim().replace(/\s+/g, '');
        
        if (zipCodeRegex.test(normalizedZipCode)) {
          console.log("Generating compliance tasks with:", {
            city: home.city,
            state: home.state,
            zipCode: normalizedZipCode,
            yearBuilt: home.yearBuilt,
            homeType: home.homeType,
          });
          
          // Add timeout to compliance task generation (5 seconds)
          const compliancePromise = generateComplianceTasks(
            home.city,
            home.state,
            normalizedZipCode,
            home.yearBuilt,
            home.homeType || "single-family"
          );
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Compliance task generation timeout")), 5000)
          );
          
          console.log("[28] Calling generateComplianceTasks...");
          complianceTasks = await Promise.race([compliancePromise, timeoutPromise]) as any[];
          console.log(`[29] Compliance tasks generated. Count: ${complianceTasks.length}`);
          
          if (complianceTasks.length > 0) {
            console.log("[30] Sample compliance task:", {
              name: complianceTasks[0].name,
              category: complianceTasks[0].category,
              frequency: complianceTasks[0].frequency,
            });
          }
        } else {
          console.warn(`[WARN] Invalid ZIP code format for compliance tasks: ${home.zipCode}`);
        }
      } else {
        console.log("[27.5] Home missing required fields for compliance tasks");
      }
    } catch (complianceError) {
      console.error("[ERROR] Error generating compliance tasks:", complianceError);
      // Continue without compliance tasks if generation fails
      complianceTasks = [];
    }
    }
    console.log("[31] Compliance task generation completed");

    console.log("[32] Converting compliance tasks to database format...");
    // Convert compliance tasks to database format
    const validCategories = ["HVAC", "PLUMBING", "EXTERIOR", "STRUCTURAL", "LANDSCAPING", "APPLIANCE", "SAFETY", "ELECTRICAL", "OTHER"];
    const validFrequencies = ["WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL", "SEASONAL", "AS_NEEDED"];
    
    const complianceTasksForDb = complianceTasks
      .filter((task: { category: string; frequency: string }) => {
        const categoryValid = validCategories.includes(task.category);
        const frequencyValid = validFrequencies.includes(task.frequency);
        if (!categoryValid || !frequencyValid) {
          console.error(`[ERROR] Invalid compliance task: category=${task.category}, frequency=${task.frequency}`);
          return false;
        }
        return true;
      })
      .map((task: (typeof complianceTasks)[number]) => ({
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
      }));
    console.log(`[33] Converted ${complianceTasksForDb.length} compliance tasks for database`);

    console.log("[34] Combining all tasks...");
    // Combine regular tasks and compliance tasks
    const allTasks = [...personalizedTasks, ...complianceTasksForDb];
    console.log(`[35] Total tasks to create: ${allTasks.length} (${personalizedTasks.length} regular + ${complianceTasksForDb.length} compliance)`);

    // Validate we have tasks to create
    if (allTasks.length === 0) {
      console.error("[ERROR] No tasks to create");
      return NextResponse.json(
        { error: "No tasks to create", message: "No tasks matched your home criteria. Please ensure you have task templates seeded." },
        { status: 400 }
      );
    }

    console.log("[36] Validating task enum values...");
    // Final validation: ensure all tasks have valid enum values
    const invalidTasks = allTasks.filter((task: { category: string; frequency: string }) => {
      const categoryValid = validCategories.includes(task.category);
      const frequencyValid = validFrequencies.includes(task.frequency);
      return !categoryValid || !frequencyValid;
    });

    if (invalidTasks.length > 0) {
      console.error("[ERROR] Invalid tasks found before database insert:", invalidTasks);
      return NextResponse.json(
        { 
          error: "Invalid task data",
          message: `Found ${invalidTasks.length} task(s) with invalid category or frequency values`,
          details: invalidTasks.map((task: { name: string; category: string; frequency: string }) => ({
            name: task.name,
            category: task.category,
            frequency: task.frequency,
          })),
        },
        { status: 400 }
      );
    }
    console.log("[37] All tasks validated successfully");

    console.log("[38] Starting database transaction to create tasks...");
    // Create tasks in database
    let createdTasks;
    try {
      createdTasks = await prisma.$transaction(
        allTasks.map((task: (typeof allTasks)[number], index: number) => {
          if (index === 0 || index === Math.floor(allTasks.length / 2) || index === allTasks.length - 1) {
            console.log(`[38.${index}] Creating task ${index + 1}/${allTasks.length}: ${task.name}`);
          }
          return prisma.maintenanceTask.create({
            data: task,
          });
        })
      );
      console.log(`[39] Database transaction completed. Created ${createdTasks.length} tasks`);
    } catch (dbError: any) {
      console.error("[ERROR] Database error creating tasks:", dbError);
      console.error("[ERROR] First task that failed:", allTasks[0]);
      
      // Check if it's a Prisma enum validation error
      if (dbError?.message?.includes("match") || dbError?.message?.includes("pattern")) {
        return NextResponse.json(
          { 
            error: "Invalid enum value",
            message: "One or more tasks have invalid category or frequency values",
            details: {
              error: dbError.message,
              sampleTask: allTasks[0],
            },
          },
          { status: 400 }
        );
      }
      throw dbError; // Re-throw if it's not an enum error
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[40] Task generation completed successfully in ${duration}ms`);
    
    return NextResponse.json(
      {
        message: `Generated ${createdTasks.length} tasks (${personalizedTasks.length} regular + ${complianceTasks.length} compliance)`,
        tasks: createdTasks,
        complianceTasksCount: complianceTasks.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("=== ERROR GENERATING TASKS ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : undefined);
    
    // Try to stringify error for logging
    try {
      console.error("Error JSON:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (e) {
      console.error("Could not stringify error:", e);
    }
    
    // Check for Zod validation errors
    if (error && typeof error === "object" && "issues" in error) {
      const zodError = error as any;
      const issues = zodError.issues || [];
      const errorMessages = issues.map((issue: any) => ({
        field: issue.path.join("."),
        message: issue.message,
        received: issue.received,
        code: issue.code,
      }));
      
      return NextResponse.json(
        { 
          error: "Validation error",
          message: `Validation failed: ${errorMessages.map((e: any) => `${e.field}: ${e.message}`).join(", ")}`,
          details: errorMessages,
          hint: "Check that all fields match required formats (ZIP: 12345 or 12345-6789, State: 2 letters)"
        },
        { status: 400 }
      );
    }
    
    // Check for Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as any;
      console.error("Prisma error code:", prismaError.code);
      console.error("Prisma error meta:", prismaError.meta);
      
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "Duplicate task", message: "A task with this information already exists" },
          { status: 409 }
        );
      }
      if (prismaError.meta?.target) {
        return NextResponse.json(
          { 
            error: "Database error",
            message: `Invalid data for field: ${prismaError.meta.target.join(", ")}`,
            details: prismaError.message,
            code: prismaError.code
          },
          { status: 400 }
        );
      }
    }
    
    // Return detailed error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error, null, 2);
    
    // Check if it's a pattern validation error
    if (errorMessage.includes("pattern") || errorMessage.includes("match") || errorMessage.includes("regex")) {
      return NextResponse.json(
        { 
          error: "Validation error",
          message: errorMessage,
          hint: "This usually means a field format is incorrect. Common issues:\n- ZIP code must be 12345 or 12345-6789\n- State must be exactly 2 letters (e.g., CA, TX)\n- Check browser console for full error details",
          details: process.env.NODE_ENV === "development" ? errorDetails : undefined
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to generate tasks",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
        errorType: error?.constructor?.name
      },
      { status: 500 }
    );
  }
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

