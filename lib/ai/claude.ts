/**
 * Shared Anthropic (Claude) API client and helpers.
 * Used for task generation, DIY plan generation, and photo analysis.
 */

import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey: key });
}

/**
 * Extract plain text from Claude message content (array of blocks).
 */
export function getTextFromContent(
  content: Anthropic.Message["content"]
): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") {
      parts.push(block.text);
    }
  }
  return parts.join("\n").trim();
}

export interface CreateCompletionOptions {
  system?: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Call Claude for text-only completion (e.g. task generation, DIY plan).
 * Returns the full text of the assistant reply.
 */
export async function createCompletion(options: {
  system?: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    ...(options.system ? { system: options.system } : {}),
    messages: [{ role: "user", content: options.userMessage }],
  });
  return getTextFromContent(response.content);
}

export interface CreateCompletionWithImageOptions {
  system?: string;
  userText: string;
  imageBase64: string;
  imageMediaType?: string;
  maxTokens?: number;
}

/**
 * Call Claude with a single user message that includes text + one image (vision).
 * Returns the full text of the assistant reply.
 */
export async function createCompletionWithImage(options: {
  system?: string;
  userText: string;
  imageBase64: string;
  imageMediaType?: string;
  maxTokens?: number;
}): Promise<string> {
  const anthropic = getAnthropic();
  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    { type: "text", text: options.userText },
    {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: (options.imageMediaType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: options.imageBase64,
      },
    },
  ];
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 1024,
    ...(options.system ? { system: options.system } : {}),
    messages: [{ role: "user", content }],
  });
  return getTextFromContent(response.content);
}

/**
 * Check if the AI provider is configured (for routes that return 501 when not set).
 */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
