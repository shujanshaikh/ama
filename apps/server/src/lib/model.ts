import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Models that use /chat/completions endpoint (OpenAI-compatible)
const OPENAI_COMPATIBLE_MODELS = ["big-pickle", "glm-4.7-free" , "kimi-k2.5-free"];

// Models that use /messages endpoint (Anthropic-compatible)
const ANTHROPIC_MODELS = ["minimax-m2.1-free"];

// Models that use /responses endpoint (OpenAI)
const OPENAI_MODELS = ["gpt-5-nano"];


// Provider instances
const openaiCompatibleProvider = createOpenAICompatible({
  name: "opencodezen",
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: "https://opencode.ai/zen/v1",
});

const anthropicProvider = createAnthropic({
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: "https://opencode.ai/zen/v1",
});

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: "https://opencode.ai/zen/v1",
});

export function createOpenCodeZenModel(modelId: string): LanguageModel {
  // For OpenCode models, remove the "opencode/" prefix if present
  const cleanModelId = modelId.replace(/^opencode\//, "");

  if (OPENAI_COMPATIBLE_MODELS.includes(cleanModelId)) {
    return openaiCompatibleProvider(cleanModelId);
  }

  if (ANTHROPIC_MODELS.includes(cleanModelId)) {
    return anthropicProvider(cleanModelId);
  }

  if (OPENAI_MODELS.includes(cleanModelId)) {
    return openaiProvider(cleanModelId);
  }

  // Default to OpenAI-compatible for unknown models
  console.warn(
    `Unknown model ${modelId}, defaulting to OpenAI-compatible provider`,
  );
  return openaiCompatibleProvider(cleanModelId);
}

// Legacy exports for backward compatibility
export const opencodeZenProvider = openaiCompatibleProvider;
export const createMinimaxProvide = createOpenCodeZenModel;

export const models = [

  {
    id: "minimax-m2.1-free",
    name: "Minimax M2.1 Free",
  },
  {
    id: "gpt-5-nano",
    name: "GPT 5 Nano",
  },
  {
    id: "big-pickle",
    name: "Big Pickle",
  },
  {
    id: "kimi-k2.5-free",
    name: "Kimi K2.5 Free",
  },
  {
    id: "glm-4.7-free",
    name: "GLM 4.7 Free",
  },
];
