/**
 * Local Regulations and Compliance Utilities
 * Fetches city/county/state regulations and building codes
 * to ensure maintenance recommendations comply with local laws
 */

export interface LocalRegulation {
  type: "inspection" | "permit" | "code" | "safety" | "environmental";
  title: string;
  description: string;
  frequency?: string; // "annual", "biannual", "on-sale", "on-rental", etc.
  required: boolean;
  penalty?: string; // What happens if not complied
  source?: string; // URL or source of regulation
  appliesTo?: string[]; // home types, ages, etc.
}

export interface ComplianceRequirement {
  taskName: string;
  category: string;
  regulation: LocalRegulation;
  dueDate?: Date;
  priority: "critical" | "high" | "medium" | "low";
}

/**
 * Get local regulations based on location
 * Uses city, county, and state to determine applicable regulations
 */
export async function getLocalRegulations(
  city: string,
  state: string,
  zipCode: string,
  county?: string
): Promise<LocalRegulation[]> {
  const stateUpper = state.toUpperCase();
  const regulations: LocalRegulation[] = [];

  // State-level regulations
  const stateRegulations = getStateRegulations(stateUpper);
  regulations.push(...stateRegulations);

  // City/county-specific regulations
  const localRegulations = getCityCountyRegulations(
    city,
    stateUpper,
    county
  );
  regulations.push(...localRegulations);

  // Federal regulations (applies everywhere)
  const federalRegulations = getFederalRegulations();
  regulations.push(...federalRegulations);

  return regulations;
}

/**
 * Get state-level building codes and regulations
 */
function getStateRegulations(state: string): LocalRegulation[] {
  const regulations: LocalRegulation[] = [];

  // California-specific regulations
  if (state === "CA") {
    regulations.push({
      type: "safety",
      title: "Smoke Detector Requirements",
      description:
        "California requires smoke detectors in every bedroom, outside each sleeping area, and on every level including basements. Must be interconnected and hardwired.",
      frequency: "on-installation",
      required: true,
      penalty: "Fines up to $200 per violation",
      source: "California Health and Safety Code",
    });

    regulations.push({
      type: "safety",
      title: "Carbon Monoxide Detector Requirements",
      description:
        "Required in all single-family homes with attached garages, fireplaces, or fossil fuel-burning appliances.",
      frequency: "on-installation",
      required: true,
      penalty: "Fines up to $200 per violation",
      source: "California Health and Safety Code",
    });

    regulations.push({
      type: "safety",
      title: "Water Heater Seismic Straps",
      description:
        "Water heaters must be strapped to prevent tipping during earthquakes. Required for all installations.",
      frequency: "on-installation",
      required: true,
      penalty: "Code violation, potential insurance issues",
      source: "California Building Code",
    });

    regulations.push({
      type: "environmental",
      title: "Lead Paint Disclosure",
      description:
        "Homes built before 1978 require lead paint disclosure when selling or renting.",
      frequency: "on-sale",
      required: true,
      appliesTo: ["pre-1978"],
      penalty: "Legal liability",
      source: "Federal and California law",
    });
  }

  // Florida-specific regulations
  if (state === "FL") {
    regulations.push({
      type: "safety",
      title: "Hurricane Shutters/Impact Windows",
      description:
        "Required in coastal areas. Must meet Miami-Dade County wind resistance standards.",
      frequency: "on-installation",
      required: true,
      appliesTo: ["coastal"],
      penalty: "Code violation, insurance issues",
      source: "Florida Building Code",
    });

    regulations.push({
      type: "inspection",
      title: "4-Point Insurance Inspection",
      description:
        "Required every 2 years for homes over 30 years old for insurance purposes.",
      frequency: "biannual",
      required: true,
      appliesTo: ["30+ years old"],
      penalty: "Insurance denial",
      source: "Florida insurance requirements",
    });
  }

  // New York-specific regulations
  if (state === "NY") {
    regulations.push({
      type: "inspection",
      title: "Lead Paint Inspection",
      description:
        "Required for rental properties built before 1960. Must be performed by certified inspector.",
      frequency: "annual",
      required: true,
      appliesTo: ["pre-1960", "rental"],
      penalty: "Fines up to $2,500 per violation",
      source: "NYC Local Law 1",
    });

    regulations.push({
      type: "safety",
      title: "Window Guards",
      description:
        "Required in all rental units with children under 10 years old.",
      frequency: "on-installation",
      required: true,
      appliesTo: ["rental"],
      penalty: "Fines and legal liability",
      source: "NYC Health Code",
    });
  }

  // Texas-specific regulations
  if (state === "TX") {
    regulations.push({
      type: "environmental",
      title: "Radon Testing",
      description:
        "Recommended in all homes. Required disclosure when selling.",
      frequency: "on-sale",
      required: false,
      source: "Texas Real Estate Commission",
    });
  }

  // General state regulations (apply to most states)
  regulations.push({
    type: "safety",
    title: "Smoke Detector Requirements",
    description:
      "Most states require smoke detectors on every level and in every bedroom.",
    frequency: "on-installation",
    required: true,
    source: "State building codes",
  });

  regulations.push({
    type: "safety",
    title: "Carbon Monoxide Detector Requirements",
    description:
      "Required in most states for homes with attached garages or fuel-burning appliances.",
    frequency: "on-installation",
    required: true,
    source: "State building codes",
  });

  return regulations;
}

/**
 * Get city/county-specific regulations
 */
function getCityCountyRegulations(
  city: string,
  state: string,
  county?: string
): LocalRegulation[] {
  const regulations: LocalRegulation[] = [];
  const cityLower = city.toLowerCase();

  // San Francisco, CA
  if (cityLower.includes("san francisco") && state === "CA") {
    regulations.push({
      type: "inspection",
      title: "Mandatory Soft Story Retrofit",
      description:
        "Buildings with 3+ units and soft-story construction must be retrofitted for earthquakes.",
      frequency: "one-time",
      required: true,
      appliesTo: ["multi-unit", "soft-story"],
      penalty: "Fines and potential condemnation",
      source: "SF Building Code",
    });
  }

  // Los Angeles, CA
  if (cityLower.includes("los angeles") && state === "CA") {
    regulations.push({
      type: "inspection",
      title: "Earthquake Brace and Bolt Program",
      description:
        "State program for retrofitting older homes. May be required for insurance.",
      frequency: "one-time",
      required: false,
      appliesTo: ["pre-1980"],
      source: "California Earthquake Authority",
    });
  }

  // New York City
  if (cityLower.includes("new york") && state === "NY") {
    regulations.push({
      type: "inspection",
      title: "Local Law 11/98 - Facade Inspection",
      description:
        "Buildings over 6 stories must have facade inspected every 5 years.",
      frequency: "every-5-years",
      required: true,
      appliesTo: ["6+ stories"],
      penalty: "Fines up to $25,000",
      source: "NYC Local Law 11",
    });

    regulations.push({
      type: "inspection",
      title: "Boiler Inspection",
      description:
        "Annual boiler inspection required for buildings with central heating.",
      frequency: "annual",
      required: true,
      appliesTo: ["central-heating"],
      penalty: "Fines and shutdown",
      source: "NYC Department of Buildings",
    });
  }

  // Chicago, IL
  if (cityLower.includes("chicago") && state === "IL") {
    regulations.push({
      type: "inspection",
      title: "Point of Sale Inspection",
      description:
        "Required inspection before selling property. Checks for code violations.",
      frequency: "on-sale",
      required: true,
      penalty: "Cannot complete sale",
      source: "Chicago Building Code",
    });
  }

  // Seattle, WA
  if (cityLower.includes("seattle") && state === "WA") {
    regulations.push({
      type: "environmental",
      title: "Rental Registration and Inspection",
      description:
        "Rental properties must be registered and inspected every 3-5 years.",
      frequency: "every-3-5-years",
      required: true,
      appliesTo: ["rental"],
      penalty: "Fines and rental license revocation",
      source: "Seattle Rental Registration",
    });
  }

  // Miami-Dade County, FL
  if (
    (cityLower.includes("miami") || county?.toLowerCase().includes("dade")) &&
    state === "FL"
  ) {
    regulations.push({
      type: "safety",
      title: "Hurricane Impact Windows",
      description:
        "All windows must meet Miami-Dade County wind resistance standards.",
      frequency: "on-installation",
      required: true,
      penalty: "Code violation",
      source: "Miami-Dade Building Code",
    });
  }

  return regulations;
}

/**
 * Get federal regulations (apply everywhere)
 */
function getFederalRegulations(): LocalRegulation[] {
  return [
    {
      type: "environmental",
      title: "Lead Paint Disclosure",
      description:
        "Federal law requires disclosure of lead paint hazards in homes built before 1978 when selling or renting.",
      frequency: "on-sale",
      required: true,
      appliesTo: ["pre-1978"],
      penalty: "Fines up to $11,000 per violation",
      source: "EPA Lead Disclosure Rule",
    },
    {
      type: "environmental",
      title: "Asbestos Disclosure",
      description:
        "Must disclose known asbestos when selling property.",
      frequency: "on-sale",
      required: true,
      penalty: "Legal liability",
      source: "EPA regulations",
    },
    {
      type: "safety",
      title: "Smoke Detector Requirements",
      description:
        "Federal recommendations require smoke detectors on every level and in every bedroom.",
      frequency: "on-installation",
      required: true,
      source: "NFPA 72",
    },
  ];
}

/**
 * Match regulations to maintenance tasks
 */
export function matchRegulationsToTasks(
  regulations: LocalRegulation[],
  tasks: Array<{ name: string; category: string }>
): ComplianceRequirement[] {
  const complianceRequirements: ComplianceRequirement[] = [];

  for (const regulation of regulations) {
    // Match regulation to task based on keywords
    const matchingTasks = tasks.filter((task: { name: string; category: string }) => {
      const taskLower = task.name.toLowerCase();
      const categoryLower = task.category.toLowerCase();

      // Smoke detector matching
      if (
        regulation.title.toLowerCase().includes("smoke") &&
        (taskLower.includes("smoke") || taskLower.includes("detector"))
      ) {
        return true;
      }

      // Carbon monoxide matching
      if (
        regulation.title.toLowerCase().includes("carbon monoxide") &&
        (taskLower.includes("carbon monoxide") || taskLower.includes("co detector"))
      ) {
        return true;
      }

      // Inspection matching
      if (
        regulation.type === "inspection" &&
        (taskLower.includes("inspect") || categoryLower === "safety")
      ) {
        return true;
      }

      // Water heater matching
      if (
        regulation.title.toLowerCase().includes("water heater") &&
        taskLower.includes("water heater")
      ) {
        return true;
      }

      return false;
    });

    if (matchingTasks.length > 0) {
      matchingTasks.forEach((task: { name: string; category: string }) => {
        complianceRequirements.push({
          taskName: task.name,
          category: task.category,
          regulation,
          priority: regulation.required ? "critical" : "high",
        });
      });
    } else {
      // Create new compliance task if no matching task exists
      complianceRequirements.push({
        taskName: regulation.title,
        category: regulation.type === "safety" ? "SAFETY" : "OTHER",
        regulation,
        priority: regulation.required ? "critical" : "high",
      });
    }
  }

  return complianceRequirements;
}

/**
 * Get compliance recommendations for a home
 */
export async function getComplianceRecommendations(
  city: string,
  state: string,
  zipCode: string,
  yearBuilt: number,
  homeType: string,
  county?: string
): Promise<{
  regulations: LocalRegulation[];
  complianceTasks: ComplianceRequirement[];
  summary: {
    required: number;
    recommended: number;
    critical: number;
  };
}> {
  const regulations = await getLocalRegulations(
    city,
    state,
    zipCode,
    county
  );

  // Filter regulations that apply to this home
  const applicableRegulations = regulations.filter((reg: LocalRegulation) => {
    if (!reg.appliesTo || reg.appliesTo.length === 0) return true;

    // Check if regulation applies to this home
    const homeAge = new Date().getFullYear() - yearBuilt;
    if (reg.appliesTo.includes("pre-1978") && yearBuilt >= 1978) return false;
    if (reg.appliesTo.includes("pre-1960") && yearBuilt >= 1960) return false;
    if (reg.appliesTo.includes("30+ years old") && homeAge < 30) return false;
    if (reg.appliesTo.includes("rental") && homeType !== "rental") return false;
    if (reg.appliesTo.includes("multi-unit") && homeType === "single-family")
      return false;

    return true;
  });

  // Generate compliance tasks
  const complianceTasks = matchRegulationsToTasks(applicableRegulations, []);

  const summary = {
    required: applicableRegulations.filter((r: LocalRegulation) => r.required).length,
    recommended: applicableRegulations.filter((r: LocalRegulation) => !r.required).length,
    critical: applicableRegulations.filter(
      (r: LocalRegulation) => r.required && r.type === "safety"
    ).length,
  };

  return {
    regulations: applicableRegulations,
    complianceTasks,
    summary,
  };
}

/**
 * Get permit requirements for common maintenance tasks
 */
export function getPermitRequirements(
  city: string,
  state: string,
  taskCategory: string,
  taskName: string
): {
  requiresPermit: boolean;
  permitType?: string;
  description?: string;
  source?: string;
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
      source: "Local building codes",
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
        source: "Local building codes",
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
      description:
        "Structural work requires a building permit and inspection.",
      source: "Local building codes",
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
      description:
        "HVAC installation and replacement typically requires permits.",
      source: "Local building codes",
    };
  }

  // Roof replacement
  if (taskLower.includes("roof") && taskLower.includes("replace")) {
    return {
      requiresPermit: true,
      permitType: "Roofing Permit",
      description:
        "Roof replacement typically requires a permit in most jurisdictions.",
      source: "Local building codes",
    };
  }

  return {
    requiresPermit: false,
  };
}

