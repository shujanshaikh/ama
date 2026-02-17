import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway } from "ai";
import type { LanguageModel } from "ai";

export type ModelInfo = {
  id: string;
  name: string;
  type: "free" | "gateway" | "codex";
};

// Models that use /chat/completions endpoint (OpenAI-compatible)
const OPENAI_COMPATIBLE_MODELS = ["glm-4.7-free" , "kimi-k2.5-free"];

// Models that use /messages endpoint (Anthropic-compatible)
const ANTHROPIC_MODELS = ["minimax-m2.1-free"];




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

export function createOpenCodeZenModel(modelId: string): LanguageModel {
  // For OpenCode models, remove the "opencode/" prefix if present
  const cleanModelId = modelId.replace(/^opencode\//, "");

  if (OPENAI_COMPATIBLE_MODELS.includes(cleanModelId)) {
    return openaiCompatibleProvider(cleanModelId);
  }

  if (ANTHROPIC_MODELS.includes(cleanModelId)) {
    return anthropicProvider(cleanModelId);
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

export const models: ModelInfo[] = [
  // Free models (OpenCode Zen)
  { id: "minimax-m2.1-free", name: "Minimax M2.1 Free", type: "free" },
  { id: "gpt-5-nano", name: "GPT 5 Nano", type: "free" },
  { id: "big-pickle", name: "Big Pickle", type: "free" },
  { id: "kimi-k2.5-free", name: "Kimi K2.5 Free", type: "free" },
  { id: "glm-4.7-free", name: "GLM 4.7 Free", type: "free" },
  // Gateway models (BYOK — single AI_GATEWAY_API_KEY for all)
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", type: "gateway" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "gateway" },
  { id: "openai/gpt-5.2-codex", name: "GPT 5.2 Codex", type: "gateway" },
  { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5", type: "gateway" },
  // ChatGPT subscription models (Codex)
  {id : "gpt-5.3-codex", name: "GPT 5.3 Codex", type: "codex" },
  { id: "codex/gpt-5.2-codex", name: "GPT 5.2 Codex", type: "codex" },
  { id: "codex/gpt-5.2", name: "GPT 5.2", type: "codex" },
  { id: "codex/gpt-5.1-codex-mini", name: "GPT 5.1 Codex Mini", type: "codex" },
  { id: "codex/gpt-5.1-codex-max", name: "GPT 5.1 Codex Max", type: "codex" },
];

export function createGatewayModel(modelId: string, userApiKey: string): LanguageModel {
  const gw = createGateway({ apiKey: userApiKey });
  return gw(modelId);
}

export function isGatewayModel(modelId: string): boolean {
  return models.find((m) => m.id === modelId)?.type === "gateway";
}

export function isCodexModel(modelId: string): boolean {
  return models.find((m) => m.id === modelId)?.type === "codex";
}

