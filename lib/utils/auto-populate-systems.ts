/**
 * Auto-populate Systems and Appliances from Enriched Property Data
 * 
 * This utility creates HomeSystem and Appliance records based on
 * property data from RentCast and other sources.
 */

import type { EnrichedPropertyData } from "./property-enrichment";

export interface AutoPopulatedSystem {
  systemType: "HVAC" | "WATER_HEATER" | "ROOF" | "PLUMBING" | "ELECTRICAL";
  brand?: string;
  model?: string;
  installDate?: Date;
  expectedLifespan?: number;
  material?: string;
  capacity?: string;
  condition?: string;
  notes?: string;
}

export interface AutoPopulatedAppliance {
  applianceType: "OVEN" | "RANGE" | "WASHER" | "DRYER" | "WATER_HEATER";
  brand?: string;
  model?: string;
  installDate?: Date;
  warrantyExpiry?: Date;
  fuelType?: string; // "Gas" or "Electric"
  notes?: string;
}

/**
 * Generate systems from enriched property data
 */
export function generateSystemsFromPropertyData(
  data: EnrichedPropertyData,
  yearBuilt?: number
): AutoPopulatedSystem[] {
  const systems: AutoPopulatedSystem[] = [];
  const currentYear = new Date().getFullYear();
  const homeAge = yearBuilt ? currentYear - yearBuilt : null;

  // HVAC System (Heating + Cooling)
  if (data.heatingType || data.coolingType) {
    const hvacNotes: string[] = [];
    if (data.heatingType) hvacNotes.push(`Heating: ${data.heatingType}`);
    if (data.heatingFuel) hvacNotes.push(`Fuel: ${data.heatingFuel}`);
    if (data.coolingType) hvacNotes.push(`Cooling: ${data.coolingType}`);

    systems.push({
      systemType: "HVAC",
      notes: hvacNotes.join(", "),
      expectedLifespan: homeAge && homeAge > 15 ? 10 : 15, // Older homes might need replacement sooner
      condition: homeAge && homeAge > 20 ? "fair" : homeAge && homeAge > 10 ? "good" : "excellent",
    });
  }

  // Water Heater
  if (data.waterHeaterType || data.waterHeaterFuel) {
    const waterHeaterNotes: string[] = [];
    if (data.waterHeaterType) waterHeaterNotes.push(`Type: ${data.waterHeaterType}`);
    if (data.waterHeaterFuel) waterHeaterNotes.push(`Fuel: ${data.waterHeaterFuel}`);

    systems.push({
      systemType: "WATER_HEATER",
      notes: waterHeaterNotes.join(", "),
      expectedLifespan: data.waterHeaterType?.toLowerCase().includes("tankless") ? 20 : 10,
      condition: homeAge && homeAge > 10 ? "fair" : "good",
    });
  }

  // Roof (if we have roof type)
  if (data.roofType) {
    const roofMaterial = data.roofType.toLowerCase();
    let material: string | undefined;
    let expectedLifespan: number | undefined;

    if (roofMaterial.includes("asphalt") || roofMaterial.includes("shingle")) {
      material = "asphalt";
      expectedLifespan = 20;
    } else if (roofMaterial.includes("metal")) {
      material = "metal";
      expectedLifespan = 40;
    } else if (roofMaterial.includes("tile")) {
      material = "tile";
      expectedLifespan = 50;
    }

    systems.push({
      systemType: "ROOF",
      material,
      notes: `Type: ${data.roofType}`,
      expectedLifespan,
      condition: homeAge && homeAge > (expectedLifespan || 20) * 0.7 ? "fair" : "good",
    });
  }

  // Plumbing (if we have info about materials)
  if (data.constructionType) {
    // Estimate plumbing age based on home age
    systems.push({
      systemType: "PLUMBING",
      notes: `Construction: ${data.constructionType}`,
      expectedLifespan: 50, // Plumbing typically lasts 50+ years
      condition: homeAge && homeAge > 40 ? "fair" : "good",
    });
  }

  // Electrical (always add if we have home age)
  if (homeAge !== null) {
    systems.push({
      systemType: "ELECTRICAL",
      notes: `Home built in ${yearBuilt}`,
      expectedLifespan: 50,
      condition: homeAge > 40 ? "fair" : homeAge > 20 ? "good" : "excellent",
    });
  }

  return systems;
}

/**
 * Generate appliances from enriched property data
 */
export function generateAppliancesFromPropertyData(
  data: EnrichedPropertyData
): AutoPopulatedAppliance[] {
  const appliances: AutoPopulatedAppliance[] = [];

  // Stove/Range/Oven
  if (data.stoveFuel) {
    appliances.push({
      applianceType: "RANGE",
      fuelType: data.stoveFuel,
      notes: `${data.stoveFuel} stove/range`,
    });
  }

  // Washer
  if (data.washerType || data.interiorFeatures?.some(f => 
    f.toLowerCase().includes("washer") || f.toLowerCase().includes("laundry")
  )) {
    appliances.push({
      applianceType: "WASHER",
      notes: data.washerType ? `Type: ${data.washerType}` : "Washer",
    });
  }

  // Dryer
  if (data.dryerFuel || data.interiorFeatures?.some(f => 
    f.toLowerCase().includes("dryer") || f.toLowerCase().includes("laundry")
  )) {
    appliances.push({
      applianceType: "DRYER",
      fuelType: data.dryerFuel,
      notes: data.dryerFuel ? `${data.dryerFuel} dryer` : "Dryer",
    });
  }

  // Water Heater (as appliance if not already added as system)
  if (data.waterHeaterType && !data.waterHeaterType.toLowerCase().includes("tankless")) {
    appliances.push({
      applianceType: "WATER_HEATER",
      fuelType: data.waterHeaterFuel,
      notes: `${data.waterHeaterType} water heater${data.waterHeaterFuel ? ` (${data.waterHeaterFuel})` : ""}`,
    });
  }

  return appliances;
}

