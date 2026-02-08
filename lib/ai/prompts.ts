/**
 * AI Prompt Templates for Task Generation
 * These prompts are designed to work with OpenAI GPT-4 to generate
 * personalized maintenance tasks based on comprehensive home inventory data.
 */

export interface HomeInventoryData {
  home: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    yearBuilt: number;
    squareFootage?: number;
    lotSize?: number;
    homeType: string;
    climateZone?: string;
    stormFrequency?: string; // low, moderate, high, severe
    averageRainfall?: number; // inches per year
    averageSnowfall?: number; // inches per year
    windZone?: string;
  };
  systems: Array<{
    systemType: string;
    brand?: string;
    model?: string;
    installDate?: string;
    expectedLifespan?: number;
    material?: string; // e.g., "copper", "PVC", "asphalt shingle", "metal"
    capacity?: string; // e.g., "200A" for electrical, "50 gal" for water heater
    condition?: string; // excellent, good, fair, poor
    lastInspection?: string;
    stormResistance?: string; // For roof: "wind-rated", "hail-resistant"
  }>;
  appliances: Array<{
    applianceType: string;
    brand?: string;
    model?: string;
    installDate?: string;
    expectedLifespan?: number;
    usageFrequency?: string;
  }>;
  exteriorFeatures: Array<{
    featureType: string;
    material?: string;
    installDate?: string;
    expectedLifespan?: number;
  }>;
  interiorFeatures: Array<{
    featureType: string;
    material?: string;
    installDate?: string;
    expectedLifespan?: number;
    room?: string;
  }>;
}

export function buildTaskGenerationPrompt(data: HomeInventoryData): string {
  const currentYear = new Date().getFullYear();
  const homeAge = currentYear - data.home.yearBuilt;

  return `You are an expert home maintenance advisor. Analyze the following home inventory and generate a comprehensive, personalized yearly maintenance schedule.

HOME INFORMATION:
- Address: ${data.home.address}, ${data.home.city}, ${data.home.state} ${data.home.zipCode}
- Year Built: ${data.home.yearBuilt} (${homeAge} years old)
- Home Type: ${data.home.homeType}
- Square Footage: ${data.home.squareFootage || "Unknown"}
- Climate Zone: ${data.home.climateZone || "Unknown"}
- Storm Frequency: ${data.home.stormFrequency || "Unknown"} ${data.home.stormFrequency === "high" || data.home.stormFrequency === "severe" ? "(⚠️ HIGH RISK - More frequent inspections needed)" : ""}
- Average Rainfall: ${data.home.averageRainfall ? `${data.home.averageRainfall} inches/year` : "Unknown"}
- Average Snowfall: ${data.home.averageSnowfall ? `${data.home.averageSnowfall} inches/year` : "Unknown"}
- Wind Zone: ${data.home.windZone || "Unknown"}

MAJOR SYSTEMS:
${data.systems.length > 0 ? data.systems.map((s, i) => {
  const systemAge = s.installDate ? Math.floor((new Date().getTime() - new Date(s.installDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null;
  return `
${i + 1}. ${s.systemType}
   - Brand/Model: ${s.brand || "Unknown"} ${s.model || ""}
   - Material: ${s.material || "Unknown"} ${s.material ? `(${s.material.includes("copper") ? "⚠️ Copper pipes need special attention as they age" : s.material.includes("asphalt") ? "⚠️ Asphalt shingles degrade over time" : ""})` : ""}
   - Capacity: ${s.capacity || "Unknown"}
   - Install Date: ${s.installDate || "Unknown"} ${systemAge ? `(${systemAge} years old)` : ""}
   - Expected Lifespan: ${s.expectedLifespan || "Unknown"} years ${systemAge && s.expectedLifespan ? `(${Math.round((systemAge / s.expectedLifespan) * 100)}% of lifespan used)` : ""}
   - Condition: ${s.condition || "Unknown"} ${s.condition === "poor" || s.condition === "fair" ? "⚠️ Needs more frequent maintenance" : ""}
   - Storm Resistance: ${s.stormResistance || "Unknown"} ${s.systemType === "ROOF" && !s.stormResistance && (data.home.stormFrequency === "high" || data.home.stormFrequency === "severe") ? "⚠️ HIGH RISK - Not rated for storms" : ""}
   - Last Inspection: ${s.lastInspection || "Unknown"}
`;
}).join("") : "None listed"}

APPLIANCES:
${data.appliances.length > 0 ? data.appliances.map((a, i) => `
${i + 1}. ${a.applianceType}
   - Brand/Model: ${a.brand || "Unknown"} ${a.model || ""}
   - Install Date: ${a.installDate || "Unknown"}
   - Usage: ${a.usageFrequency || "Unknown"}
   - Expected Lifespan: ${a.expectedLifespan || "Unknown"} years
`).join("") : "None listed"}

EXTERIOR FEATURES:
${data.exteriorFeatures.length > 0 ? data.exteriorFeatures.map((e, i) => `
${i + 1}. ${e.featureType}
   - Material: ${e.material || "Unknown"}
   - Install Date: ${e.installDate || "Unknown"}
   - Expected Lifespan: ${e.expectedLifespan || "Unknown"} years
`).join("") : "None listed"}

INTERIOR FEATURES:
${data.interiorFeatures.length > 0 ? data.interiorFeatures.map((i, idx) => `
${idx + 1}. ${i.featureType}
   - Material: ${i.material || "Unknown"}
   - Room: ${i.room || "Unknown"}
   - Install Date: ${i.installDate || "Unknown"}
   - Expected Lifespan: ${i.expectedLifespan || "Unknown"} years
`).join("") : "None listed"}

TASK GENERATION REQUIREMENTS:

1. Generate maintenance tasks for EVERY item listed above (systems, appliances, exterior features, interior features)

2. For each task, provide:
   - Task name (specific and actionable)
   - Description (what needs to be done and why)
   - Category (HVAC, PLUMBING, EXTERIOR, STRUCTURAL, LANDSCAPING, APPLIANCE, SAFETY, ELECTRICAL, OTHER)
   - Frequency (WEEKLY, MONTHLY, QUARTERLY, BIANNUAL, ANNUAL, SEASONAL, AS_NEEDED)
   - Priority (low, medium, high, critical)
   - Optimal timing (specific month/season if applicable)
   - Cost estimate range (in USD)
   - DIY difficulty (easy, medium, hard, expert)
   - Explanation (why this task is important for THIS specific home/item)
   - Dependencies (any tasks that must be done before this one)

3. Consider:
   - Item age and expected lifespan (older items need more frequent maintenance)
   - Climate zone (tasks vary by climate - ${data.home.climateZone || "consider general maintenance"})
   - Storm frequency: ${data.home.stormFrequency || "Unknown"} - ${data.home.stormFrequency === "high" || data.home.stormFrequency === "severe" ? "⚠️ HIGH RISK AREA - More frequent exterior/roof inspections needed" : "Standard maintenance"}
   - Average rainfall: ${data.home.averageRainfall ? `${data.home.averageRainfall} inches/year` : "Unknown"} - Higher rainfall = more frequent gutter/roof checks
   - Average snowfall: ${data.home.averageSnowfall ? `${data.home.averageSnowfall} inches/year` : "Unknown"} - Heavy snow = more frequent roof inspections
   - Usage frequency (high-use appliances need more frequent maintenance)
   - Home age (${homeAge} years old - older homes may need different maintenance)
   - Material types (CRITICAL):
     * Plumbing: Copper pipes (>30 years old need monthly leak checks), PVC/PEX need less frequent maintenance
     * Roof: Asphalt shingles (>20 years old need quarterly checks), Metal/Tile can go longer between inspections
     * Electrical: Older systems (>30 years) or low capacity (<100A) need more frequent inspections
   - System condition: Poor/fair condition systems need more frequent maintenance
   - Storm resistance: Roofs without proper storm rating in high-risk areas need quarterly inspections
   - Manufacturer recommendations (if brand/model is known)

4. Include predictive maintenance:
   - Identify items approaching end of life
   - Suggest replacement before failure
   - Factor in warranty expiration dates

5. Generate tasks for:
   - Regular maintenance (filters, cleaning, inspections)
   - Seasonal tasks (winter prep, spring cleaning, etc.)
   - Preventive maintenance (before problems occur)
   - Safety checks (smoke detectors, carbon monoxide, etc.)

6. For items with install dates, calculate age and adjust frequency accordingly

7. Consider task dependencies (e.g., clean gutters before winter prep, inspect roof before major storms)

Return your response as a JSON array of tasks, where each task has this structure:
{
  "name": "Task name",
  "description": "Detailed description",
  "category": "CATEGORY",
  "frequency": "FREQUENCY",
  "priority": "priority level",
  "optimalMonth": "month number (1-12) or null",
  "optimalSeason": "spring|summer|fall|winter|all",
  "costEstimateMin": number,
  "costEstimateMax": number,
  "diyDifficulty": "difficulty level",
  "explanation": "Why this task is important for this specific home/item",
  "relatedItemId": "ID of the item this task relates to (if applicable)",
  "relatedItemType": "system|appliance|exteriorFeature|interiorFeature",
  "dependsOnTaskName": "name of task that must be done first (if applicable)",
  "isPredictive": boolean
}

Generate a comprehensive list covering all maintenance needs for the next 12 months.`;
}

export function buildTaskExplanationPrompt(
  taskName: string,
  homeData: HomeInventoryData,
  itemDetails?: {
    type: string;
    brand?: string;
    model?: string;
    age?: number;
  }
): string {
  return `Explain why the maintenance task "${taskName}" is important for this specific home:

Home: ${homeData.home.address}, built in ${homeData.home.yearBuilt}
Climate: ${homeData.home.climateZone || "Unknown"}
${itemDetails ? `
Item: ${itemDetails.type}
Brand/Model: ${itemDetails.brand || "Unknown"} ${itemDetails.model || ""}
Age: ${itemDetails.age || "Unknown"} years
` : ""}

Provide a clear, concise explanation (2-3 sentences) that helps the homeowner understand:
1. Why this task matters
2. What could happen if it's neglected
3. How it specifically relates to their home/item`;
}

export function buildPredictiveMaintenancePrompt(
  items: Array<{
    type: string;
    name: string;
    installDate?: string;
    expectedLifespan?: number;
    brand?: string;
    model?: string;
  }>
): string {
  return `Analyze the following home items and identify which ones are approaching end of life or need immediate attention:

${items.map((item, i) => `
${i + 1}. ${item.name} (${item.type})
   - Install Date: ${item.installDate || "Unknown"}
   - Expected Lifespan: ${item.expectedLifespan || "Unknown"} years
   - Brand/Model: ${item.brand || "Unknown"} ${item.model || ""}
`).join("")}

For each item, determine:
1. Current age (if install date is known)
2. Percentage of expected lifespan used
3. Whether replacement should be planned soon
4. Recommended replacement timeline
5. Signs to watch for indicating failure is imminent

Return as JSON array with structure:
{
  "itemName": "name",
  "itemType": "type",
  "currentAge": number (years),
  "lifespanUsed": number (percentage),
  "replacementUrgency": "low|medium|high|critical",
  "recommendedReplacementDate": "YYYY-MM",
  "warningSigns": ["sign1", "sign2"]
}`;
}

