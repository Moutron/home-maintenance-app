/**
 * Shared OpenAI Mock Utilities
 * Provides consistent mocking for OpenAI across all tests
 */

import { vi } from "vitest";

// Create a mock create function that can be controlled per test
export const createMockOpenAIClient = () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            name: "Cordless Drill",
            brand: "DeWalt",
            model: "DCD771",
            category: "Power Tools",
            condition: "good",
            description: "20V Max cordless drill",
          }),
        },
      },
    ],
  });

  return {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    _mockCreate: mockCreate, // Expose for test control
  };
};

// Create a mock for systems analysis
export const createMockOpenAISystemsClient = () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            systemType: "HVAC",
            brand: "Carrier",
            model: "Infinity 19VS",
            estimatedAge: 5,
            condition: "good",
            material: null,
            capacity: "3 ton",
            additionalDetails: "Serial number: 123456",
          }),
        },
      },
    ],
  });

  return {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    _mockCreate: mockCreate, // Expose for test control
  };
};

// Setup OpenAI mock that can be controlled
export function setupOpenAIMock() {
  const mockImplementation = vi.fn().mockImplementation(() => createMockOpenAIClient());
  
  vi.mock("openai", () => ({
    default: mockImplementation,
  }));

  return mockImplementation;
}
