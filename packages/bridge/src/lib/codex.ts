import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { dispatchToAgent } from "@/lib/do-session";
import type { WorkerBindings } from "@/env";

export const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses";
export const DEFAULT_CODEX_INSTRUCTIONS = SYSTEM_PROMPT;

type DaemonRpcMethod =
  | "daemon:codex_get_tokens"
  | "daemon:codex_fetch"
  | "daemon:codex_start_auth"
  | "daemon:codex_status"
  | "daemon:codex_logout";

async function callDaemonRpc<T>(
  env: WorkerBindings,
  userId: string,
  method: DaemonRpcMethod,
  args: Record<string, unknown> = {},
  timeoutMs = 15000,
): Promise<T> {
  const callId = crypto.randomUUID();

  return (await dispatchToAgent(
    env,
    userId,
    {
      type: "rpc_call",
      id: callId,
      method,
      args,
    },
    timeoutMs,
  )) as T;
}

export async function getCodexTokensFromDaemon(
  env: WorkerBindings,
  userId: string,
): Promise<{ accessToken: string; accountId: string }> {
  const result = await callDaemonRpc<{ accessToken: string; accountId: string }>(
    env,
    userId,
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

async function fetchCodexViaDaemon(
  env: WorkerBindings,
  userId: string,
  body: string,
): Promise<Response> {
  const result = await callDaemonRpc<{
    status: number;
    headers?: Record<string, string>;
    body: string;
  }>(
    env,
    userId,
    "daemon:codex_fetch",
    { body },
    5 * 60 * 1000,
  );

  return new Response(result.body, {
    status: result.status,
    headers: result.headers,
  });
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

function toRequest(requestInput: unknown, init?: RequestInit): Request {
  if (requestInput instanceof Request) {
    return new Request(requestInput, init);
  }

  if (requestInput instanceof URL || typeof requestInput === "string") {
    return new Request(requestInput, init);
  }

  if (
    typeof requestInput === "object" &&
    requestInput !== null &&
    "url" in requestInput &&
    typeof (requestInput as { url?: unknown }).url === "string"
  ) {
    return new Request((requestInput as { url: string }).url, init);
  }

  throw new Error("Unsupported request input type for Codex fetch");
}

export async function createCodexModel(
  modelId: string,
  env: WorkerBindings,
  userId: string,
): Promise<LanguageModel> {
  await getCodexTokensFromDaemon(env, userId);

  const provider = createOpenAI({
    apiKey: "codex-oauth",
    fetch: async (requestInput, init) => {
      const { accessToken, accountId } = await getCodexTokensFromDaemon(env, userId);
      const originalRequest = toRequest(requestInput, init);
      const rewrittenUrl = rewriteToCodexEndpoint(originalRequest);
      const rewrittenRequest = new Request(rewrittenUrl.toString(), originalRequest);
      const headers = new Headers(rewrittenRequest.headers);
      const bodyText = await rewrittenRequest.clone().text();

      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("ChatGPT-Account-Id", accountId);
      headers.set("originator", "ama");
      headers.set("accept", "text/event-stream");

      const outboundRequest = new Request(rewrittenRequest, { headers });
      try {
        const directResponse = await fetch(outboundRequest);
        if (directResponse.status !== 403) {
          return directResponse;
        }

        const contentType = directResponse.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
          return directResponse;
        }

        return fetchCodexViaDaemon(env, userId, bodyText);
      } catch {
        return fetchCodexViaDaemon(env, userId, bodyText);
      }
    },
  });

  return provider.responses(modelId);
}

export const codexRpc = {
  startAuth: (env: WorkerBindings, userId: string) =>
    callDaemonRpc<{ authUrl: string }>(env, userId, "daemon:codex_start_auth"),
  status: (env: WorkerBindings, userId: string) =>
    callDaemonRpc<{ authenticated: boolean }>(env, userId, "daemon:codex_status"),
  logout: (env: WorkerBindings, userId: string) =>
    callDaemonRpc<{ success: boolean }>(env, userId, "daemon:codex_logout"),
};
