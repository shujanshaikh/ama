import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { agentStreams } from "@/index";
import { pendingToolCalls } from "@/lib/executeTool";
import { SYSTEM_PROMPT } from "@/lib/prompt";

export const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses";
export const DEFAULT_CODEX_INSTRUCTIONS = SYSTEM_PROMPT;

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

export function buildCodexProviderOptions(instructions?: string) {
  return {
    openai: {
      store: false,
      instructions: instructions?.trim() || DEFAULT_CODEX_INSTRUCTIONS,
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
