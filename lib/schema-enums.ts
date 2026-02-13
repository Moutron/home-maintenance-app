/**
 * Schema enum value types (string unions).
 *
 * Keep in sync with prisma/schema.prisma enums. We use local unions instead of
 * importing from @prisma/client so builds (e.g. Vercel) don't depend on
 * generated client export order. Single source of truth for app/lib code.
 */

export type TaskCategory =
  | "HVAC"
  | "PLUMBING"
  | "EXTERIOR"
  | "STRUCTURAL"
  | "LANDSCAPING"
  | "APPLIANCE"
  | "SAFETY"
  | "ELECTRICAL"
  | "OTHER";

export type TaskFrequency =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "BIANNUAL"
  | "ANNUAL"
  | "SEASONAL"
  | "AS_NEEDED";

export type ProjectCategory =
  | "HVAC"
  | "PLUMBING"
  | "ELECTRICAL"
  | "EXTERIOR"
  | "INTERIOR"
  | "LANDSCAPING"
  | "APPLIANCE"
  | "STRUCTURAL"
  | "OTHER";

export type BudgetPeriod = "MONTHLY" | "QUARTERLY" | "ANNUAL";

export type BudgetAlertStatus = "PENDING" | "SENT" | "DISMISSED";
