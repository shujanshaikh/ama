import WebSocket from "ws";
import { z } from "zod";
import { getWsUrl } from "../constants";
import { getAccessToken, refreshAccessToken } from "../auth/index";
import { toolExecutors } from "./tool-executor";
import { rpcHandlers } from "./rpc-handlers";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 60000;
const BACKOFF_MULTIPLIER = 2;
const DEFAULT_TOOL_TIMEOUT_MS = 45000;
const DEFAULT_RPC_TIMEOUT_MS = 30000;
const TOOL_TIMEOUT_OVERRIDES: Record<string, number> = {
  runTerminalCommand: 90000,
  batch: 120000,
};

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let shouldReconnect = true;
const ToolCallSchema = z.object({
  type: z.literal("tool_call"),
  id: z.string().min(1),
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()).default({}),
  projectId: z.string().optional(),
  projectCwd: z.string().optional(),
});

const RpcCallSchema = z.object({
  type: z.literal("rpc_call"),
  id: z.string().min(1),
  method: z.string().min(1),
  args: z.record(z.string(), z.unknown()).default({}),
});

const DaemonMessageSchema = z.discriminatedUnion("type", [
  ToolCallSchema,
  RpcCallSchema,
]);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Unknown error";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string,
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(`${context} timed out after ${Math.round(timeoutMs / 1000)}s`),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function sendToolResult(
  id: string,
  payload: { result?: unknown; error?: string; errorCode?: string },
): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn(`[daemon] Unable to send result for id=${id}; socket is closed`);
    return;
  }
  ws.send(
    JSON.stringify({
      type: "tool_result",
      id,
      ...payload,
    }),
  );
}

function getReconnectDelay(): number {
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, reconnectAttempts),
    MAX_RECONNECT_DELAY,
  );
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

export function connectDaemon(): void {
  shouldReconnect = true;
  connect();
}

export function disconnectDaemon(): void {
  shouldReconnect = false;
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function getDaemonStatus(): {
  connected: boolean;
  reconnectAttempts: number;
} {
  return {
    connected: ws?.readyState === WebSocket.OPEN,
    reconnectAttempts,
  };
}

function connect(): void {
  const token = getAccessToken();
  if (!token) {
    console.log("[daemon] No auth token, skipping connection");
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  const wsUrl = `${getWsUrl()}/agent-streams`;
  ws = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  ws.on("open", () => {
    reconnectAttempts = 0;
    console.log("[daemon] Connected to server");
  });

  ws.on("message", async (data) => {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(data.toString());
    } catch (error) {
      console.error("[daemon] Invalid JSON message:", getErrorMessage(error));
      return;
    }

    const parsedMessage = DaemonMessageSchema.safeParse(parsedJson);
    if (!parsedMessage.success) {
      console.error("[daemon] Invalid daemon message shape");
      if (
        parsedJson &&
        typeof parsedJson === "object" &&
        "id" in parsedJson &&
        typeof (parsedJson as { id?: unknown }).id === "string"
      ) {
        sendToolResult((parsedJson as { id: string }).id, {
          error: "Invalid message shape",
          errorCode: "INVALID_MESSAGE",
        });
      }
      return;
    }

    const message = parsedMessage.data;

    if (message.type === "tool_call") {
      const startedAt = Date.now();
      const timeoutMs =
        TOOL_TIMEOUT_OVERRIDES[message.tool] ?? DEFAULT_TOOL_TIMEOUT_MS;

      console.log(`[daemon] tool_call: ${message.tool}`);
      try {
        const executor = toolExecutors[message.tool];
        if (!executor) {
          throw new Error(`Unknown tool: ${message.tool}`);
        }
        const result = await withTimeout(
          executor(message.args, message.projectCwd),
          timeoutMs,
          `Tool '${message.tool}'`,
        );
        sendToolResult(message.id, { result });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        sendToolResult(message.id, { error: errorMessage });
        console.error(`[daemon] tool failed: ${message.tool}:`, errorMessage);
      } finally {
        console.log(
          `[daemon] tool_call completed: ${message.tool} (${Date.now() - startedAt}ms)`,
        );
      }
      return;
    }

    const startedAt = Date.now();
    console.log(`[daemon] rpc: ${message.method}`);
    try {
      const handler = rpcHandlers[message.method];
      if (!handler) {
        throw new Error(`Unknown RPC method: ${message.method}`);
      }
      const result = await withTimeout(
        handler(message.args),
        DEFAULT_RPC_TIMEOUT_MS,
        `RPC '${message.method}'`,
      );
      sendToolResult(message.id, { result });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      sendToolResult(message.id, { error: errorMessage });
      console.error(`[daemon] rpc failed: ${message.method}:`, errorMessage);
    } finally {
      console.log(
        `[daemon] rpc completed: ${message.method} (${Date.now() - startedAt}ms)`,
      );
    }
  });

  ws.on("close", (code, reason) => {
    ws = null;
    if (shouldReconnect) {
      const isAuthFailure = code === 1008;
      const tryRefresh = isAuthFailure && getAccessToken();

      if (tryRefresh) {
        refreshAccessToken()
          .then((ok) => {
            if (ok) {
              reconnectAttempts = 0;
              connect();
            } else {
              scheduleReconnect();
            }
          })
          .catch(() => scheduleReconnect());
      } else {
        scheduleReconnect();
      }
    }
  });

  function scheduleReconnect() {
    const delay = getReconnectDelay();
    reconnectAttempts++;
    console.log(
      `[daemon] Disconnected, reconnecting in ${Math.round(delay / 1000)}s...`,
    );
    setTimeout(connect, delay);
  }

  ws.on("error", (error) => {
    console.error("[daemon] Connection error:", error.message);
  });
}
