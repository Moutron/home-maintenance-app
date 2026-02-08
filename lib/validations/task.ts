import { z } from "zod";

export const TaskCategoryEnum = z.enum([
  "HVAC",
  "PLUMBING",
  "EXTERIOR",
  "STRUCTURAL",
  "LANDSCAPING",
  "APPLIANCE",
  "SAFETY",
  "ELECTRICAL",
  "OTHER",
]);

export const TaskFrequencyEnum = z.enum([
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "BIANNUAL",
  "ANNUAL",
  "SEASONAL",
  "AS_NEEDED",
]);

export const createTaskSchema = z.object({
  homeId: z.string().min(1),
  templateId: z.string().optional(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().min(1, "Description is required"),
  category: TaskCategoryEnum,
  frequency: TaskFrequencyEnum,
  nextDueDate: z.date().or(z.string().transform((str) => new Date(str))),
  costEstimate: z.number().positive().optional(),
  notes: z.string().optional(),
  snoozedUntil: z.date().optional().or(z.string().transform((str) => new Date(str))).nullable(),
  customRecurrence: z.object({
    interval: z.number().positive(),
    unit: z.enum(["days", "weeks", "months"]),
  }).optional().nullable(),
});

export const updateTaskSchema = z.object({
  completed: z.boolean().optional(),
  completedDate: z.date().optional(),
  nextDueDate: z.date().optional().or(z.string().transform((str) => new Date(str))),
  costEstimate: z.number().positive().optional(),
  notes: z.string().optional(),
  snoozedUntil: z.date().optional().or(z.string().transform((str) => new Date(str))).nullable(),
  customRecurrence: z.object({
    interval: z.number().positive(),
    unit: z.enum(["days", "weeks", "months"]),
  }).optional().nullable(),
});

export const completeTaskSchema = z.object({
  actualCost: z.number().positive().optional(),
  notes: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
  contractorUsed: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

