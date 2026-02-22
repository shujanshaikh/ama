import type { WorkerBindings } from "@/env";

export type BridgeSocketRole = "agent" | "cli" | "frontend";

function getSessionStub(env: WorkerBindings, userId: string): DurableObjectStub {
  const id = env.BRIDGE_SESSION_DO.idFromName(`user:${userId}`);
  return env.BRIDGE_SESSION_DO.get(id);
}

export async function connectToSessionDO(
  env: WorkerBindings,
  userId: string,
  request: Request,
  role: BridgeSocketRole,
): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("x-bridge-role", role);
  headers.set("x-bridge-user-id", userId);

  const url = new URL(request.url);
  url.pathname = "/connect";

  const stub = getSessionStub(env, userId);
  return stub.fetch(
    new Request(url.toString(), {
      method: request.method,
      headers,
    }),
  );
}

export async function isAgentConnected(env: WorkerBindings, userId: string): Promise<boolean> {
  const stub = getSessionStub(env, userId);
  const response = await stub.fetch("https://bridge/internal/agent-status");
  if (!response.ok) return false;
  const data = (await response.json()) as { connected?: boolean };
  return data.connected === true;
}

export async function dispatchToAgent(
  env: WorkerBindings,
  userId: string,
  message: Record<string, unknown>,
  timeoutMs: number,
): Promise<unknown> {
  const stub = getSessionStub(env, userId);
  const response = await stub.fetch("https://bridge/internal/dispatch-agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ message, timeoutMs }),
  });

  const payload = (await response.json()) as {
    ok?: boolean;
    result?: unknown;
    error?: string;
  };

  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.error || "Failed to dispatch message to local agent");
  }

  return payload.result;
}
