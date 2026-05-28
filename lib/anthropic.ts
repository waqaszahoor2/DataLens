/**
 * Server-side only Anthropic client.
 * This module must NEVER be imported by client components.
 * Used only in /app/api/ai/route.ts
 */

import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set. AI features will not work.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
