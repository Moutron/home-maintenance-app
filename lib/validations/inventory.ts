import { z } from "zod";

export const ApplianceTypeEnum = z.enum([
  "REFRIGERATOR",
  "DISHWASHER",
  "WASHER",
  "DRYER",
  "OVEN",
  "RANGE",
  "MICROWAVE",
  "GARBAGE_DISPOSAL",
  "GARBAGE_COMPACTOR",
  "ICE_MAKER",
  "WINE_COOLER",
  "OTHER",
]);

export const ExteriorFeatureTypeEnum = z.enum([
  "DECK",
  "FENCE",
  "POOL",
  "SPRINKLER_SYSTEM",
  "DRIVEWAY",
  "PATIO",
  "SIDING",
  "GUTTERS",
  "WINDOWS",
  "DOORS",
  "GARAGE_DOOR",
  "FOUNDATION",
  "OTHER",
]);

export const InteriorFeatureTypeEnum = z.enum([
  "CARPET",
  "HARDWOOD_FLOOR",
  "TILE_FLOOR",
  "LAMINATE_FLOOR",
  "VINYL_FLOOR",
  "WINDOWS",
  "DOORS",
  "CABINETS",
  "COUNTERTOPS",
  "PAINT",
  "WALLPAPER",
  "OTHER",
]);

export const applianceSchema = z.object({
  applianceType: ApplianceTypeEnum,
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.coerce.date().optional(),
  warrantyExpiry: z.coerce.date().optional(),
  expectedLifespan: z.number().int().positive().optional(),
  lastServiceDate: z.coerce.date().optional(),
  usageFrequency: z.enum(["daily", "weekly", "monthly", "occasional"]).optional(),
  notes: z.string().optional(),
});

export const exteriorFeatureSchema = z.object({
  featureType: ExteriorFeatureTypeEnum,
  material: z.string().optional(),
  brand: z.string().optional(),
  installDate: z.coerce.date().optional(),
  warrantyExpiry: z.coerce.date().optional(),
  expectedLifespan: z.number().int().positive().optional(),
  lastServiceDate: z.coerce.date().optional(),
  squareFootage: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const interiorFeatureSchema = z.object({
  featureType: InteriorFeatureTypeEnum,
  material: z.string().optional(),
  brand: z.string().optional(),
  installDate: z.coerce.date().optional(),
  warrantyExpiry: z.coerce.date().optional(),
  expectedLifespan: z.number().int().positive().optional(),
  lastServiceDate: z.coerce.date().optional(),
  squareFootage: z.number().positive().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
});

export const createInventorySchema = z.object({
  homeId: z.string().min(1),
  appliances: z.array(applianceSchema),
  exteriorFeatures: z.array(exteriorFeatureSchema),
  interiorFeatures: z.array(interiorFeatureSchema),
});

export type ApplianceInput = z.infer<typeof applianceSchema>;
export type ExteriorFeatureInput = z.infer<typeof exteriorFeatureSchema>;
export type InteriorFeatureInput = z.infer<typeof interiorFeatureSchema>;
export type CreateInventoryInput = z.infer<typeof createInventorySchema>;

