/**
 * Tests for Task Validation Schemas
 */

import { describe, it, expect } from "vitest";
import {
  createTaskSchema,
  updateTaskSchema,
  TaskCategoryEnum,
  TaskFrequencyEnum,
} from "@/lib/validations/task";

describe("Task Validation Schemas", () => {
  describe("createTaskSchema", () => {
    it("should validate valid task data", () => {
      const validData = {
        homeId: "home123",
        name: "Test Task",
        description: "Test Description",
        category: "HVAC",
        frequency: "MONTHLY",
        nextDueDate: new Date("2024-12-31"),
      };

      const result = createTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const invalidData = {
        name: "Test Task",
        // Missing other required fields
      };

      const result = createTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate snoozedUntil field", () => {
      const validData = {
        homeId: "home123",
        name: "Test Task",
        description: "Test Description",
        category: "HVAC",
        frequency: "MONTHLY",
        nextDueDate: new Date("2024-12-31"),
        snoozedUntil: new Date("2025-01-15"),
      };

      const result = createTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate customRecurrence field", () => {
      const validData = {
        homeId: "home123",
        name: "Test Task",
        description: "Test Description",
        category: "HVAC",
        frequency: "AS_NEEDED",
        nextDueDate: new Date("2024-12-31"),
        customRecurrence: {
          interval: 10,
          unit: "days",
        },
      };

      const result = createTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid customRecurrence unit", () => {
      const invalidData = {
        homeId: "home123",
        name: "Test Task",
        description: "Test Description",
        category: "HVAC",
        frequency: "AS_NEEDED",
        nextDueDate: new Date("2024-12-31"),
        customRecurrence: {
          interval: 10,
          unit: "invalid", // Invalid unit
        },
      };

      const result = createTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject negative interval", () => {
      const invalidData = {
        homeId: "home123",
        name: "Test Task",
        description: "Test Description",
        category: "HVAC",
        frequency: "AS_NEEDED",
        nextDueDate: new Date("2024-12-31"),
        customRecurrence: {
          interval: -5, // Negative interval
          unit: "days",
        },
      };

      const result = createTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should validate all task categories", () => {
      const categories = [
        "HVAC",
        "PLUMBING",
        "EXTERIOR",
        "STRUCTURAL",
        "LANDSCAPING",
        "APPLIANCE",
        "SAFETY",
        "ELECTRICAL",
        "OTHER",
      ];

      categories.forEach((category) => {
        const data = {
          homeId: "home123",
          name: "Test Task",
          description: "Test Description",
          category,
          frequency: "MONTHLY",
          nextDueDate: new Date("2024-12-31"),
        };

        const result = createTaskSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it("should validate all task frequencies", () => {
      const frequencies = [
        "WEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "BIANNUAL",
        "ANNUAL",
        "SEASONAL",
        "AS_NEEDED",
      ];

      frequencies.forEach((frequency) => {
        const data = {
          homeId: "home123",
          name: "Test Task",
          description: "Test Description",
          category: "HVAC",
          frequency,
          nextDueDate: new Date("2024-12-31"),
        };

        const result = createTaskSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("updateTaskSchema", () => {
    it("should validate partial update data", () => {
      const validData = {
        completed: true,
        notes: "Updated notes",
      };

      const result = updateTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate snoozedUntil update", () => {
      const validData = {
        snoozedUntil: new Date("2025-01-15"),
      };

      const result = updateTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should allow null snoozedUntil to unsnooze", () => {
      const validData = {
        snoozedUntil: null,
      };

      const result = updateTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate customRecurrence update", () => {
      const validData = {
        customRecurrence: {
          interval: 5,
          unit: "weeks",
        },
      };

      const result = updateTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should allow empty update object", () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

