import { z } from "zod";

export const SystemTypeEnum = z.enum([
  "HVAC",
  "ROOF",
  "WATER_HEATER",
  "PLUMBING",
  "ELECTRICAL",
  "APPLIANCE",
  "EXTERIOR",
  "LANDSCAPING",
  "POOL",
  "DECK",
  "FENCE",
  "OTHER",
]);

export const homeSystemSchema = z.object({
  systemType: SystemTypeEnum,
  brand: z.string().optional(),
  model: z.string().optional(),
  installDate: z.union([z.date(), z.string()]).optional(),
  expectedLifespan: z.number().int().positive().optional(),
  material: z.string().optional(), // e.g., "copper", "PVC", "PEX" for plumbing; "asphalt shingle", "metal", "tile" for roof
  capacity: z.string().optional(), // e.g., "200A" for electrical panel, "50 gal" for water heater
  condition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  lastInspection: z.union([z.date(), z.string()]).optional(),
  stormResistance: z.string().optional(), // For roof: "wind-rated", "hail-resistant", etc.
  notes: z.string().optional(),
});

// Helper functions to normalize state and ZIP code
function normalizeState(val: unknown): string {
  if (typeof val !== 'string') return '';
  const normalized = val.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  return normalized;
}

function normalizeZipCode(val: unknown): string {
  if (typeof val !== 'string') return '';
  let normalized = val.trim().replace(/[^\d-]/g, '');
  // If 9 digits without dash, format as 12345-6789
  if (normalized.length === 9 && !normalized.includes('-')) {
    normalized = `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
  }
  // If longer than 5 digits without dash, take first 5
  if (normalized.length > 5 && !normalized.includes('-')) {
    normalized = normalized.slice(0, 5);
  }
  return normalized;
}

// Schema for step 1 (basic home info) - systems are optional
// Note: Client-side validation is lenient (just checks it's a string)
// Strict validation happens on the server after normalization
export const createHomeSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"), // Lenient - just check it's a non-empty string
  zipCode: z.string().min(1, "ZIP code is required"), // Lenient - just check it's a non-empty string
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 1),
  squareFootage: z.number().int().positive().optional(),
  lotSize: z.number().positive().optional(),
  homeType: z.enum([
    "single-family",
    "townhouse",
    "condo",
    "apartment",
    "mobile-home",
    "other",
  ]),
  climateZone: z.string().optional(),
  stormFrequency: z.enum(["low", "moderate", "high", "severe"]).optional(),
  averageRainfall: z.number().positive().optional(),
  averageSnowfall: z.number().positive().optional(),
  windZone: z.string().optional(),
  systems: z.array(homeSystemSchema),
});
export type HomeSystemInput = z.infer<typeof homeSystemSchema>;
