/** Models must match @ama/server/lib/model - used for agent-proxy compatibility */
export const models = [
  { id: "minimax-m2.1-free", name: "Minimax M2.1 Free", type: "free" as const },
  { id: "gpt-5-nano", name: "GPT 5 Nano", type: "free" as const },
  { id: "big-pickle", name: "Big Pickle", type: "free" as const },
  { id: "kimi-k2.5-free", name: "Kimi K2.5 Free", type: "free" as const },
  { id: "glm-4.7-free", name: "GLM 4.7 Free", type: "free" as const },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", type: "gateway" as const },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", type: "gateway" as const },
  { id: "openai/gpt-5.2-codex", name: "GPT 5.2 Codex", type: "gateway" as const },
  { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5", type: "gateway" as const },
];
