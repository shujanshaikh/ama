import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway } from "ai";
import type { LanguageModel } from "ai";
import type { WorkerBindings } from "@/env";

export type ModelInfo = {
  id: string;
  name: string;
  type: "free" | "gateway" | "codex";
};

const OPENAI_COMPATIBLE_MODELS = ["glm-5-free", "glm-4.7-free", "kimi-k2.5-free"];
const ANTHROPIC_MODELS = ["minimax-m2.1-free"];

const openAiProviderCache = new Map<string, ReturnType<typeof createOpenAICompatible>>();
const anthropicProviderCache = new Map<string, ReturnType<typeof createAnthropic>>();

function getOpenAICompatibleProvider(apiKey: string) {
  let provider = openAiProviderCache.get(apiKey);
  if (!provider) {
    provider = createOpenAICompatible({
      name: "opencodezen",
      apiKey,
      baseURL: "https://opencode.ai/zen/v1",
    });
    openAiProviderCache.set(apiKey, provider);
  }
  return provider;
}

function getAnthropicProvider(apiKey: string) {
  let provider = anthropicProviderCache.get(apiKey);
  if (!provider) {
    provider = createAnthropic({
      apiKey,
      baseURL: "https://opencode.ai/zen/v1",
    });
    anthropicProviderCache.set(apiKey, provider);
  }
  return provider;
}

export function createOpenCodeZenModel(modelId: string, env: WorkerBindings): LanguageModel {
  const apiKey = env.OPENCODE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCODE_API_KEY is required");
  }

  const cleanModelId = modelId.replace(/^opencode\//, "");

  if (OPENAI_COMPATIBLE_MODELS.includes(cleanModelId)) {
    return getOpenAICompatibleProvider(apiKey)(cleanModelId);
  }

  if (ANTHROPIC_MODELS.includes(cleanModelId)) {
    return getAnthropicProvider(apiKey)(cleanModelId);
  }

  return getOpenAICompatibleProvider(apiKey)(cleanModelId);
}

export const models: ModelInfo[] = [
  { id: "minimax-m2.1-free", name: "Minimax M2.1 Free", type: "free" },
  { id: "kimi-k2.5-free", name: "Kimi K2.5 Free", type: "free" },
  { id: "glm-4.7-free", name: "GLM 4.7 Free", type: "free" },
  { id: "glm-5-free", name: "GLM 5 Free", type: "free" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", type: "gateway" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "gateway" },
  { id: "openai/gpt-5.2-codex", name: "GPT 5.2 Codex", type: "gateway" },
  { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5", type: "gateway" },
  { id: "codex/gpt-5.2-codex", name: "GPT 5.2 Codex", type: "codex" },
  { id: "codex/gpt-5.2", name: "GPT 5.2", type: "codex" },
  { id: "codex/gpt-5.1-codex-mini", name: "GPT 5.1 Codex Mini", type: "codex" },
  { id: "codex/gpt-5.1-codex-max", name: "GPT 5.1 Codex Max", type: "codex" },
];

const CODEX_MODEL_SUFFIXES = new Set([
  "gpt-5.2-codex",
  "gpt-5.2",
  "gpt-5.1-codex-mini",
  "gpt-5.1-codex-max",
]);

export function resolveRequestedModel(
  modelId: string,
  options?: { preferCodex?: boolean },
): string {
  const trimmed = modelId.trim();

  if (options?.preferCodex && trimmed === "openai/gpt-5.2-codex") {
    return "codex/gpt-5.2-codex";
  }

  if (models.some((m) => m.id === trimmed)) {
    return trimmed;
  }

  if (!trimmed.includes("/") && CODEX_MODEL_SUFFIXES.has(trimmed)) {
    return `codex/${trimmed}`;
  }

  return trimmed;
}

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
