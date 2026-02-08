/**
 * Task Recurrence Utilities
 * Handles both standard TaskFrequency and custom recurrence patterns
 */

export interface CustomRecurrence {
  interval: number;
  unit: "days" | "weeks" | "months";
}

/**
 * Calculate next due date based on frequency or custom recurrence
 */
export function calculateNextDueDate(
  frequency: string,
  baseDate: Date = new Date(),
  customRecurrence?: CustomRecurrence | null
): Date {
  // If custom recurrence is provided, use it
  if (customRecurrence) {
    return calculateCustomRecurrenceDate(baseDate, customRecurrence);
  }

  // Otherwise use standard frequency
  const date = new Date(baseDate);
  switch (frequency) {
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "QUARTERLY":
      date.setMonth(date.getMonth() + 3);
      break;
    case "BIANNUAL":
      date.setMonth(date.getMonth() + 6);
      break;
    case "ANNUAL":
      date.setFullYear(date.getFullYear() + 1);
      break;
    case "SEASONAL":
      date.setMonth(date.getMonth() + 3);
      break;
    case "AS_NEEDED":
      date.setMonth(date.getMonth() + 6);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  return date;
}

/**
 * Calculate next due date from custom recurrence pattern
 */
function calculateCustomRecurrenceDate(
  baseDate: Date,
  recurrence: CustomRecurrence
): Date {
  const date = new Date(baseDate);
  
  switch (recurrence.unit) {
    case "days":
      date.setDate(date.getDate() + recurrence.interval);
      break;
    case "weeks":
      date.setDate(date.getDate() + (recurrence.interval * 7));
      break;
    case "months":
      date.setMonth(date.getMonth() + recurrence.interval);
      break;
    default:
      // Fallback to days
      date.setDate(date.getDate() + recurrence.interval);
  }
  
  return date;
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrence(
  frequency: string,
  customRecurrence?: CustomRecurrence | null
): string {
  if (customRecurrence) {
    const unitLabel = customRecurrence.unit === "days" 
      ? "day" 
      : customRecurrence.unit === "weeks"
      ? "week"
      : "month";
    const plural = customRecurrence.interval > 1 ? "s" : "";
    return `Every ${customRecurrence.interval} ${unitLabel}${plural}`;
  }

  const frequencyMap: Record<string, string> = {
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    QUARTERLY: "Every 3 months",
    BIANNUAL: "Every 6 months",
    ANNUAL: "Annually",
    SEASONAL: "Seasonally",
    AS_NEEDED: "As needed",
  };

  return frequencyMap[frequency] || frequency;
}

