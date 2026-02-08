/**
 * Tests for Task Recurrence Utilities
 */

import { describe, it, expect } from "vitest";
import {
  calculateNextDueDate,
  formatRecurrence,
  type CustomRecurrence,
} from "@/lib/utils/task-recurrence";

describe("Task Recurrence Utilities", () => {
  describe("calculateNextDueDate", () => {
    it("should calculate WEEKLY frequency correctly", () => {
      const baseDate = new Date("2024-01-01");
      const result = calculateNextDueDate("WEEKLY", baseDate);
      const expected = new Date("2024-01-08");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should calculate MONTHLY frequency correctly", () => {
      const baseDate = new Date("2024-01-15");
      const result = calculateNextDueDate("MONTHLY", baseDate);
      const expected = new Date("2024-02-15");
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("should calculate QUARTERLY frequency correctly", () => {
      const baseDate = new Date("2024-01-01T00:00:00.000Z");
      const result = calculateNextDueDate("QUARTERLY", baseDate);
      const expected = new Date("2024-04-01T00:00:00.000Z");
      // Compare date components instead of timestamps to avoid timezone issues
      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getDate()).toBe(expected.getDate());
    });

    it("should calculate BIANNUAL frequency correctly", () => {
      const baseDate = new Date("2024-01-01T00:00:00.000Z");
      const result = calculateNextDueDate("BIANNUAL", baseDate);
      // BIANNUAL adds 6 months, so Jan -> July
      // Compare using UTC to avoid timezone issues
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(6); // July is month 6 (0-indexed)
      expect(result.getUTCDate()).toBe(1);
    });

    it("should calculate ANNUAL frequency correctly", () => {
      const baseDate = new Date("2024-01-01T00:00:00.000Z");
      const result = calculateNextDueDate("ANNUAL", baseDate);
      const expected = new Date("2025-01-01T00:00:00.000Z");
      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getDate()).toBe(expected.getDate());
    });

    it("should calculate SEASONAL frequency correctly", () => {
      const baseDate = new Date("2024-01-01T00:00:00.000Z");
      const result = calculateNextDueDate("SEASONAL", baseDate);
      const expected = new Date("2024-04-01T00:00:00.000Z");
      expect(result.getFullYear()).toBe(expected.getFullYear());
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getDate()).toBe(expected.getDate());
    });

    it("should calculate AS_NEEDED frequency correctly", () => {
      const baseDate = new Date("2024-01-01T00:00:00.000Z");
      const result = calculateNextDueDate("AS_NEEDED", baseDate);
      // AS_NEEDED adds 6 months, so Jan -> July
      // Compare using UTC to avoid timezone issues
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(6); // July is month 6 (0-indexed)
      expect(result.getUTCDate()).toBe(1);
    });

    describe("Custom Recurrence", () => {
      it("should calculate custom recurrence with days", () => {
        const baseDate = new Date("2024-01-01T00:00:00.000Z");
        const customRecurrence: CustomRecurrence = {
          interval: 10,
          unit: "days",
        };
        const result = calculateNextDueDate("AS_NEEDED", baseDate, customRecurrence);
        const expected = new Date("2024-01-11T00:00:00.000Z");
        expect(result.getFullYear()).toBe(expected.getFullYear());
        expect(result.getMonth()).toBe(expected.getMonth());
        expect(result.getDate()).toBe(expected.getDate());
      });

      it("should calculate custom recurrence with weeks", () => {
        const baseDate = new Date("2024-01-01T00:00:00.000Z");
        const customRecurrence: CustomRecurrence = {
          interval: 2,
          unit: "weeks",
        };
        const result = calculateNextDueDate("AS_NEEDED", baseDate, customRecurrence);
        const expected = new Date("2024-01-15T00:00:00.000Z");
        expect(result.getFullYear()).toBe(expected.getFullYear());
        expect(result.getMonth()).toBe(expected.getMonth());
        expect(result.getDate()).toBe(expected.getDate());
      });

      it("should calculate custom recurrence with months", () => {
        const baseDate = new Date("2024-01-15T00:00:00.000Z");
        const customRecurrence: CustomRecurrence = {
          interval: 3,
          unit: "months",
        };
        const result = calculateNextDueDate("AS_NEEDED", baseDate, customRecurrence);
        const expected = new Date("2024-04-15T00:00:00.000Z");
        expect(result.getFullYear()).toBe(expected.getFullYear());
        expect(result.getMonth()).toBe(expected.getMonth());
        expect(result.getDate()).toBe(expected.getDate());
      });

      it("should handle edge case: end of month", () => {
        const baseDate = new Date("2024-01-31");
        const result = calculateNextDueDate("MONTHLY", baseDate);
        // Should handle month overflow gracefully (Jan 31 + 1 month = March 2, since Feb has 29 days)
        expect(result.getMonth()).toBe(2); // March (month index 2)
        expect(result.getDate()).toBeGreaterThanOrEqual(1); // Should be valid date
      });
    });
  });

  describe("formatRecurrence", () => {
    it("should format standard frequencies correctly", () => {
      expect(formatRecurrence("WEEKLY")).toBe("Weekly");
      expect(formatRecurrence("MONTHLY")).toBe("Monthly");
      expect(formatRecurrence("QUARTERLY")).toBe("Every 3 months");
      expect(formatRecurrence("BIANNUAL")).toBe("Every 6 months");
      expect(formatRecurrence("ANNUAL")).toBe("Annually");
      expect(formatRecurrence("SEASONAL")).toBe("Seasonally");
      expect(formatRecurrence("AS_NEEDED")).toBe("As needed");
    });

    it("should format custom recurrence correctly", () => {
      const customRecurrence: CustomRecurrence = {
        interval: 10,
        unit: "days",
      };
      expect(formatRecurrence("AS_NEEDED", customRecurrence)).toBe("Every 10 days");

      const customRecurrence2: CustomRecurrence = {
        interval: 2,
        unit: "weeks",
      };
      expect(formatRecurrence("AS_NEEDED", customRecurrence2)).toBe("Every 2 weeks");

      const customRecurrence3: CustomRecurrence = {
        interval: 1,
        unit: "months",
      };
      expect(formatRecurrence("AS_NEEDED", customRecurrence3)).toBe("Every 1 month");
    });

    it("should handle pluralization correctly", () => {
      const single: CustomRecurrence = { interval: 1, unit: "days" };
      const plural: CustomRecurrence = { interval: 2, unit: "days" };

      expect(formatRecurrence("AS_NEEDED", single)).toBe("Every 1 day");
      expect(formatRecurrence("AS_NEEDED", plural)).toBe("Every 2 days");
    });
  });
});

