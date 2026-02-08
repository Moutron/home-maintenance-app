/**
 * Compliance Task Generation Utilities
 * Creates maintenance tasks from local regulations
 */

import {
  getComplianceRecommendations,
  LocalRegulation,
  ComplianceRequirement,
} from "./local-regulations";
import { addYears, addMonths, addDays } from "date-fns";

export interface ComplianceTask {
  name: string;
  description: string;
  category: string;
  frequency: string;
  nextDueDate: Date;
  priority: "critical" | "high" | "medium" | "low";
  isComplianceRequired: boolean;
  regulationSource?: string;
  permitRequired?: boolean;
  permitType?: string;
}

/**
 * Convert regulation frequency to task frequency
 */
function regulationFrequencyToTaskFrequency(
  regulationFrequency?: string
): "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "SEASONAL" | "AS_NEEDED" {
  if (!regulationFrequency) return "ANNUAL";

  const frequencyMap: Record<string, "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL" | "SEASONAL" | "AS_NEEDED"> = {
    annual: "ANNUAL",
    biannual: "BIANNUAL",
    "every-3-5-years": "ANNUAL", // Check annually, but note the requirement
    "every-5-years": "ANNUAL", // Check annually
    "on-sale": "AS_NEEDED",
    "on-rental": "AS_NEEDED",
    "on-installation": "AS_NEEDED",
    "one-time": "AS_NEEDED",
  };

  return frequencyMap[regulationFrequency.toLowerCase()] || "ANNUAL";
}

/**
 * Calculate next due date based on regulation frequency
 */
function calculateComplianceDueDate(
  regulationFrequency?: string,
  baseDate: Date = new Date()
): Date {
  if (!regulationFrequency) return addYears(baseDate, 1);

  const freq = regulationFrequency.toLowerCase();

  if (freq === "annual") {
    return addYears(baseDate, 1);
  } else if (freq === "biannual") {
    return addMonths(baseDate, 6);
  } else if (freq === "every-3-5-years") {
    // Check annually, but note requirement is every 3-5 years
    return addYears(baseDate, 1);
  } else if (freq === "every-5-years") {
    // Check annually
    return addYears(baseDate, 1);
  } else if (freq === "on-sale" || freq === "on-rental") {
    // Set to far future, but mark as required when selling/renting
    return addYears(baseDate, 10);
  } else if (freq === "on-installation") {
    // Due immediately or when item is installed
    return baseDate;
  } else if (freq === "one-time") {
    // Due immediately
    return baseDate;
  }

  return addYears(baseDate, 1);
}

/**
 * Generate compliance tasks from regulations
 */
export async function generateComplianceTasks(
  city: string,
  state: string,
  zipCode: string,
  yearBuilt: number,
  homeType: string,
  county?: string
): Promise<ComplianceTask[]> {
  // Validate and normalize inputs
  if (!city || !state || !zipCode) {
    console.warn("Missing required fields for compliance task generation:", { city, state, zipCode });
    return [];
  }

  // Normalize ZIP code (remove spaces, ensure format)
  const normalizedZipCode = zipCode.trim().replace(/\s+/g, '');
  
  // Normalize state (ensure uppercase, 2 characters)
  const normalizedState = state.trim().toUpperCase().substring(0, 2);

  const compliance = await getComplianceRecommendations(
    city.trim(),
    normalizedState,
    normalizedZipCode,
    yearBuilt,
    homeType || "single-family",
    county
  );

  const tasks: ComplianceTask[] = [];

  for (const regulation of compliance.regulations) {
    // Only create tasks for required regulations or those with specific frequencies
    if (
      !regulation.required &&
      !regulation.frequency &&
      regulation.frequency !== "one-time"
    ) {
      continue;
    }

    const frequency = regulationFrequencyToTaskFrequency(regulation.frequency);
    const nextDueDate = calculateComplianceDueDate(regulation.frequency);

    // Determine category based on regulation type
    // Must match TaskCategory enum: HVAC, PLUMBING, EXTERIOR, STRUCTURAL, LANDSCAPING, APPLIANCE, SAFETY, ELECTRICAL, OTHER
    let category: "HVAC" | "PLUMBING" | "EXTERIOR" | "STRUCTURAL" | "LANDSCAPING" | "APPLIANCE" | "SAFETY" | "ELECTRICAL" | "OTHER" = "SAFETY";
    if (regulation.type === "inspection") {
      category = "SAFETY";
    } else if (regulation.type === "environmental") {
      category = "OTHER";
    } else if (regulation.type === "code") {
      category = "STRUCTURAL";
    }

    // Determine priority
    let priority: "critical" | "high" | "medium" | "low" = "high";
    if (regulation.required && regulation.type === "safety") {
      priority = "critical";
    } else if (regulation.required) {
      priority = "high";
    } else {
      priority = "medium";
    }

    // Build description with regulation details
    let description = regulation.description;
    if (regulation.penalty) {
      description += ` Penalty: ${regulation.penalty}`;
    }
    if (regulation.source) {
      description += ` (Source: ${regulation.source})`;
    }
    if (regulation.frequency) {
      description += ` Required frequency: ${regulation.frequency.replace(
        /-/g,
        " "
      )}`;
    }

    tasks.push({
      name: regulation.title,
      description,
      category,
      frequency,
      nextDueDate,
      priority,
      isComplianceRequired: regulation.required,
      regulationSource: regulation.source,
      permitRequired: false, // Will be checked separately
    });
  }

  return tasks;
}

/**
 * Check if a task requires a permit based on category and name
 */
export function checkPermitRequirement(
  city: string,
  state: string,
  taskCategory: string,
  taskName: string
): {
  requiresPermit: boolean;
  permitType?: string;
  description?: string;
} {
  const taskLower = taskName.toLowerCase();
  const categoryLower = taskCategory.toLowerCase();

  // Electrical work typically requires permits
  if (categoryLower === "electrical") {
    return {
      requiresPermit: true,
      permitType: "Electrical Permit",
      description:
        "Most electrical work requires a permit. Check with local building department.",
    };
  }

  // Plumbing work often requires permits
  if (categoryLower === "plumbing") {
    if (
      taskLower.includes("replace") ||
      taskLower.includes("install") ||
      taskLower.includes("repair")
    ) {
      return {
        requiresPermit: true,
        permitType: "Plumbing Permit",
        description:
          "Plumbing installations and major repairs typically require permits.",
      };
    }
  }

  // Structural work always requires permits
  if (
    categoryLower === "structural" ||
    taskLower.includes("foundation") ||
    taskLower.includes("load-bearing")
  ) {
    return {
      requiresPermit: true,
      permitType: "Building Permit",
      description: "Structural work requires a building permit and inspection.",
    };
  }

  // HVAC installation/replacement
  if (
    categoryLower === "hvac" &&
    (taskLower.includes("install") || taskLower.includes("replace"))
  ) {
    return {
      requiresPermit: true,
      permitType: "HVAC Permit",
      description: "HVAC installation and replacement typically require permits.",
    };
  }

  // Roof replacement
  if (taskLower.includes("roof") && taskLower.includes("replace")) {
    return {
      requiresPermit: true,
      permitType: "Roofing Permit",
      description:
        "Roof replacement typically requires a permit in most jurisdictions.",
    };
  }

  return {
    requiresPermit: false,
  };
}

/**
 * Enhance task with compliance information
 */
export async function enhanceTaskWithCompliance(
  task: {
    name: string;
    category: string;
  },
  city: string,
  state: string,
  zipCode: string,
  yearBuilt: number,
  homeType: string
): Promise<{
  isComplianceRequired: boolean;
  permitRequired: boolean;
  permitType?: string;
  complianceDescription?: string;
}> {
  // Check permit requirements
  const permitInfo = checkPermitRequirement(city, state, task.category, task.name);

  // Check if task matches any compliance requirements
  const compliance = await getComplianceRecommendations(
    city,
    state,
    zipCode,
    yearBuilt,
    homeType
  );

  // Check if task name matches any regulation
  const taskLower = task.name.toLowerCase();
  let isComplianceRequired = false;
  let complianceDescription = "";

  for (const regulation of compliance.regulations) {
    const regTitleLower = regulation.title.toLowerCase();

    // Check for keyword matches
    if (
      (taskLower.includes("smoke") && regTitleLower.includes("smoke")) ||
      (taskLower.includes("carbon monoxide") &&
        regTitleLower.includes("carbon monoxide")) ||
      (taskLower.includes("detector") && regTitleLower.includes("detector")) ||
      (taskLower.includes("water heater") &&
        regTitleLower.includes("water heater")) ||
      (taskLower.includes("inspect") && regulation.type === "inspection")
    ) {
      if (regulation.required) {
        isComplianceRequired = true;
        complianceDescription = regulation.description;
        break;
      }
    }
  }

  return {
    isComplianceRequired,
    permitRequired: permitInfo.requiresPermit,
    permitType: permitInfo.permitType,
    complianceDescription,
  };
}

