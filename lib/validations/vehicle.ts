import { z } from "zod";

export const createVehicleSchema = z.object({
  nickname: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional(),
  vin: z.string().optional(),
  currentMileage: z.number().int().min(0).optional(),
  purchaseDate: z.date().optional().or(z.string().transform((str) => new Date(str))).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
