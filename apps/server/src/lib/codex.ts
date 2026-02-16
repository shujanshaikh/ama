import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { agentStreams } from "@/index";
import { pendingToolCalls } from "@/lib/executeTool";

export const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses";
export const DEFAULT_CODEX_INSTRUCTIONS = `You are a coding agent running in the Codex CLI, a terminal-based coding assistant. Codex CLI is an open source project led by OpenAI. You are expected to be precise, safe, and helpful.

Your capabilities:

- Receive user prompts and other context provided by the harness, such as files in the workspace.
- Communicate with the user by streaming thinking & responses, and by making & updating plans.
- Emit function calls to run terminal commands and apply patches. Depending on how this specific run is configured, you can request that these function calls be escalated to the user for approval before running. More on this in the "Sandbox and approvals" section.

Within this context, Codex refers to the open-source agentic coding interface (not the old Codex language model built by OpenAI).

# How you work

## Personality

Your default personality and tone is concise, direct, and friendly. You communicate efficiently, always keeping the user clearly informed about ongoing actions without unnecessary detail. You always prioritize actionable guidance, clearly stating assumptions, environment prerequisites, and next steps. Unless explicitly asked, you avoid excessively verbose explanations about your work.

# AGENTS.md spec
- Repos often contain AGENTS.md files. These files can appear anywhere within the repository.
- These files are a way for humans to give you (the agent) instructions or tips for working within the container.
- Some examples might be: coding conventions, info about how code is organized, or instructions for how to run or test code.
- Instructions in AGENTS.md files:
    - The scope of an AGENTS.md file is the entire directory tree rooted at the folder that contains it.
    - For every file you touch in the final patch, you must obey instructions in any AGENTS.md file whose scope includes that file.
    - Instructions about code style, structure, naming, etc. apply only to code within the AGENTS.md file's scope, unless the file states otherwise.
    - More-deeply-nested AGENTS.md files take precedence in the case of conflicting instructions.
    - Direct system/developer/user instructions (as part of a prompt) take precedence over AGENTS.md instructions.`;

type DaemonRpcMethod =
  | "daemon:codex_get_tokens"
  | "daemon:codex_start_auth"
  | "daemon:codex_status"
  | "daemon:codex_logout";

async function callDaemonRpc<T>(
  token: string,
  method: DaemonRpcMethod,
  args: Record<string, unknown> = {},
  timeoutMs = 15000,
): Promise<T> {
  const wsConnection = agentStreams.get(token);
  if (!wsConnection) {
    throw new Error("No WebSocket connection found");
  }

  const callId = crypto.randomUUID();
  wsConnection.send(
    JSON.stringify({
      type: "rpc_call",
      id: callId,
      method,
      args,
    }),
  );

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingToolCalls.delete(callId);
      reject(new Error(`RPC call timed out: ${method}`));
    }, timeoutMs);

    pendingToolCalls.set(callId, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result as T);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });
  });
}

export async function getCodexTokensFromDaemon(
  token: string,
): Promise<{ accessToken: string; accountId: string }> {
  const result = await callDaemonRpc<{ accessToken: string; accountId: string }>(
    token,
    "daemon:codex_get_tokens",
  );

  if (!result?.accessToken || !result?.accountId) {
    throw new Error("Daemon returned invalid Codex tokens");
  }

  return result;
}

export function buildCodexProviderOptions(instructions: string) {
  return {
    openai: {
      store: false,
      systemMessageMode: "remove" as const,
      instructions: instructions.trim() || DEFAULT_CODEX_INSTRUCTIONS,
    },
  };
}

function rewriteToCodexEndpoint(requestInput: unknown): URL {
  let parsed: URL;
  if (requestInput instanceof URL) {
    parsed = requestInput;
  } else if (typeof requestInput === "string") {
    parsed = new URL(requestInput);
  } else if (
    typeof requestInput === "object" &&
    requestInput !== null &&
    "url" in requestInput &&
    typeof (requestInput as { url?: unknown }).url === "string"
  ) {
    parsed = new URL((requestInput as { url: string }).url);
  } else {
    throw new Error("Unsupported request input type for Codex fetch");
  }

  if (
    parsed.pathname.includes("/v1/responses") ||
    parsed.pathname.includes("/responses") ||
    parsed.pathname.includes("/chat/completions")
  ) {
    return new URL(CODEX_API_ENDPOINT);
  }

  return parsed;
}

export async function createCodexModel(modelId: string, token: string): Promise<LanguageModel> {
  // Validate auth early so model selection errors fast.
  await getCodexTokensFromDaemon(token);

  const provider = createOpenAI({
    apiKey: "codex-oauth",
    fetch: async (requestInput, init) => {
      const { accessToken, accountId } = await getCodexTokensFromDaemon(token);
      const headers = new Headers(init?.headers);

      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("ChatGPT-Account-Id", accountId);
      headers.set("originator", "ama");

      const url = rewriteToCodexEndpoint(requestInput);
      return fetch(url, {
        ...init,
        headers,
      });
    },
  });

  return provider.responses(modelId);
}

export const codexRpc = {
  startAuth: (token: string) => callDaemonRpc<{ authUrl: string }>(token, "daemon:codex_start_auth"),
  status: (token: string) => callDaemonRpc<{ authenticated: boolean }>(token, "daemon:codex_status"),
  logout: (token: string) => callDaemonRpc<{ success: boolean }>(token, "daemon:codex_logout"),
};
