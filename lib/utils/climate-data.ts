/**
 * Climate and Storm Data Utilities
 * Fetches historical climate and storm data based on location
 */

export interface ClimateData {
  stormFrequency: "low" | "moderate" | "high" | "severe";
  averageRainfall: number; // inches per year
  averageSnowfall: number; // inches per year
  windZone?: string;
  hurricaneRisk: boolean;
  tornadoRisk: boolean;
  hailRisk: boolean;
  source: string;
}

/**
 * Estimate storm frequency based on state/location
 * Uses historical data patterns
 */
export function estimateStormFrequency(
  state: string,
  city?: string
): "low" | "moderate" | "high" | "severe" {
  const stateUpper = state.toUpperCase();

  // Hurricane-prone states
  const hurricaneStates = ["FL", "LA", "TX", "NC", "SC", "GA", "AL", "MS"];
  // Tornado-prone states (Tornado Alley + others)
  const tornadoStates = [
    "TX",
    "OK",
    "KS",
    "NE",
    "IA",
    "MO",
    "AR",
    "MS",
    "AL",
    "TN",
    "KY",
    "IL",
    "IN",
    "OH",
  ];
  // High storm risk areas
  const highStormStates = [
    "FL",
    "LA",
    "TX",
    "OK",
    "KS",
    "NE",
    "IA",
    "MO",
    "AR",
    "MS",
    "AL",
  ];

  if (hurricaneStates.includes(stateUpper) || tornadoStates.includes(stateUpper)) {
    // Check for severe risk areas
    if (stateUpper === "FL" || stateUpper === "LA") {
      return "severe"; // Hurricane-prone
    }
    if (
      ["TX", "OK", "KS", "NE", "IA", "MO"].includes(stateUpper)
    ) {
      return "high"; // Tornado Alley
    }
    return "high";
  }

  // Moderate risk areas (some storms but not extreme)
  const moderateStates = [
    "CA",
    "NY",
    "NJ",
    "PA",
    "VA",
    "MD",
    "DE",
    "CT",
    "MA",
    "RI",
    "NH",
    "ME",
    "VT",
  ];
  if (moderateStates.includes(stateUpper)) {
    return "moderate";
  }

  // Low risk areas (mountain west, pacific northwest)
  return "low";
}

/**
 * Fetch climate data from OpenWeatherMap or similar API
 * Falls back to estimates if API unavailable
 * 
 * Note: This function is typically called after checking ZIP code cache
 */
export async function fetchClimateData(
  city: string,
  state: string,
  zipCode: string
): Promise<ClimateData | null> {
  try {
    // Check ZIP code cache first (should already be checked by caller, but double-check)
    const { getCachedZipCodeData } = await import("./zipcode-cache");
    const cached = await getCachedZipCodeData(zipCode);
    if (cached?.climateData) {
      return cached.climateData;
    }

    // Try to use OpenWeatherMap API if available
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (apiKey) {
      // Get coordinates from city/state
      const geoResponse = await fetch(
        `http://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${apiKey}`
      );
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        // Use historical climate data endpoint if available
        // For now, we'll use estimates based on location
      }
    }

    // Fallback: Use location-based estimates
    return estimateClimateDataFromLocation(city, state, zipCode);
  } catch (error) {
    console.error("Error fetching climate data:", error);
    return estimateClimateDataFromLocation(city, state, zipCode);
  }
}

/**
 * Estimate climate data based on location patterns
 * Uses known climate data for major regions
 */
export function estimateClimateDataFromLocation(
  city: string,
  state: string,
  zipCode: string
): ClimateData {
  const stateUpper = state.toUpperCase();
  const cityLower = city.toLowerCase();

  // Estimate storm frequency
  const stormFrequency = estimateStormFrequency(state, city);

  // Estimate average rainfall (inches per year) by region
  const rainfallData: Record<string, number> = {
    // Southeast (high rainfall)
    FL: 54,
    LA: 60,
    AL: 56,
    MS: 56,
    GA: 50,
    SC: 49,
    NC: 50,
    // Northeast (moderate-high rainfall)
    NY: 42,
    PA: 42,
    NJ: 45,
    MA: 47,
    CT: 50,
    RI: 47,
    // Pacific Northwest (high rainfall)
    WA: 38,
    OR: 28,
    // Southwest (low rainfall)
    AZ: 13,
    NV: 9,
    UT: 15,
    NM: 14,
    // Midwest (moderate rainfall)
    IL: 39,
    IN: 41,
    OH: 39,
    MI: 32,
    WI: 32,
    MN: 27,
    // Plains (moderate-low rainfall)
    TX: 28,
    OK: 36,
    KS: 28,
    NE: 23,
    // Mountain states (low rainfall)
    CO: 17,
    WY: 13,
    MT: 15,
    ID: 18,
    // California (varies by region)
    CA: 22, // Average
  };

  // Estimate average snowfall (inches per year)
  const snowfallData: Record<string, number> = {
    // High snowfall states
    ME: 77,
    VT: 89,
    NH: 71,
    NY: 61,
    MI: 60,
    WI: 46,
    MN: 54,
    CO: 67,
    UT: 51,
    WY: 47,
    MT: 48,
    ID: 47,
    // Moderate snowfall
    MA: 43,
    CT: 37,
    PA: 38,
    OH: 28,
    IN: 25,
    IL: 26,
    // Low/no snowfall
    FL: 0,
    CA: 0,
    AZ: 0,
    NV: 0,
    TX: 2,
    LA: 0,
    GA: 1,
    SC: 1,
    NC: 5,
  };

  // Determine wind zone (simplified)
  const windZones: Record<string, string> = {
    FL: "Zone 3 (High wind)",
    TX: "Zone 2 (Moderate wind)",
    LA: "Zone 3 (High wind)",
    CA: "Zone 2 (Moderate wind)",
    CO: "Zone 2 (Moderate wind)",
    WY: "Zone 2 (Moderate wind)",
  };

  const averageRainfall = rainfallData[stateUpper] || 30; // Default estimate
  const averageSnowfall = snowfallData[stateUpper] || 10; // Default estimate
  const windZone = windZones[stateUpper] || "Zone 1 (Standard)";

  // Determine specific risks
  const hurricaneRisk = ["FL", "LA", "TX", "NC", "SC", "GA", "AL", "MS"].includes(
    stateUpper
  );
  const tornadoRisk = [
    "TX",
    "OK",
    "KS",
    "NE",
    "IA",
    "MO",
    "AR",
    "MS",
    "AL",
    "TN",
  ].includes(stateUpper);
  const hailRisk = ["TX", "OK", "KS", "NE", "CO", "WY"].includes(stateUpper);

  return {
    stormFrequency,
    averageRainfall,
    averageSnowfall,
    windZone,
    hurricaneRisk,
    tornadoRisk,
    hailRisk,
    source: "location-based-estimate",
  };
}

/**
 * Fetch historical storm data from NOAA or similar
 * This would require API access to NOAA's storm database
 */
export async function fetchHistoricalStormData(
  city: string,
  state: string,
  zipCode: string,
  years: number = 10
): Promise<{
  hurricaneCount: number;
  tornadoCount: number;
  severeStormCount: number;
  averagePerYear: {
    hurricanes: number;
    tornadoes: number;
    severeStorms: number;
  };
} | null> {
  // This would require NOAA API access
  // For now, return null and use estimates
  // In production, you could:
  // 1. Use NOAA's Storm Events Database API
  // 2. Use a third-party weather API with historical data
  // 3. Use a geocoding service that includes climate data

  return null;
}

/**
 * Get climate recommendations based on fetched data
 */
export function getClimateRecommendations(data: ClimateData): string[] {
  const recommendations: string[] = [];

  if (data.stormFrequency === "severe" || data.stormFrequency === "high") {
    recommendations.push(
      "⚠️ High storm risk area - Consider quarterly roof inspections"
    );
    recommendations.push(
      "⚠️ More frequent gutter cleaning recommended (monthly during storm season)"
    );
  }

  if (data.hurricaneRisk) {
    recommendations.push(
      "🌀 Hurricane-prone area - Ensure roof is wind-rated and properly secured"
    );
    recommendations.push("🌀 Prepare storm shutters and emergency supplies");
  }

  if (data.tornadoRisk) {
    recommendations.push(
      "🌪️ Tornado-prone area - Ensure safe room/basement is prepared"
    );
  }

  if (data.averageRainfall > 45) {
    recommendations.push(
      "🌧️ High rainfall area - More frequent gutter maintenance needed"
    );
  }

  if (data.averageSnowfall > 40) {
    recommendations.push(
      "❄️ Heavy snowfall area - More frequent roof inspections for snow load"
    );
    recommendations.push("❄️ Ensure proper insulation and heating system maintenance");
  }

  return recommendations;
}

