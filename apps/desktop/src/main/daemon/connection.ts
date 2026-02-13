import WebSocket from "ws";
import { getWsUrl } from "../constants";
import { getAccessToken, refreshAccessToken } from "../auth/index";
import { toolExecutors } from "./tool-executor";
import { rpcHandlers } from "./rpc-handlers";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 60000;
const BACKOFF_MULTIPLIER = 2;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let shouldReconnect = true;

interface ToolCall {
  type: "tool_call";
  id: string;
  tool: string;
  args: Record<string, any>;
  projectId?: string;
  projectCwd?: string;
}

interface RpcCall {
  type: "rpc_call";
  id: string;
  method: string;
  args: Record<string, any>;
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
    const message = JSON.parse(data.toString()) as ToolCall | RpcCall;

    if (message.type === "tool_call") {
      console.log(`[daemon] tool_call: ${message.tool}`);
      try {
        const executor = toolExecutors[message.tool];
        if (!executor) {
          throw new Error(`Unknown tool: ${message.tool}`);
        }
        const result = await executor(message.args, message.projectCwd);
        ws?.send(
          JSON.stringify({ type: "tool_result", id: message.id, result }),
        );
      } catch (error: any) {
        ws?.send(
          JSON.stringify({
            type: "tool_result",
            id: message.id,
            error: error.message,
          }),
        );
        console.error(`[daemon] tool failed: ${message.tool}:`, error.message);
      }
    } else if (message.type === "rpc_call") {
      console.log(`[daemon] rpc: ${message.method}`);
      try {
        const handler = rpcHandlers[message.method];
        if (!handler) {
          throw new Error(`Unknown RPC method: ${message.method}`);
        }
        const result = await handler(message.args);
        ws?.send(
          JSON.stringify({ type: "tool_result", id: message.id, result }),
        );
      } catch (error: any) {
        ws?.send(
          JSON.stringify({
            type: "tool_result",
            id: message.id,
            error: error.message,
          }),
        );
        console.error(`[daemon] rpc failed: ${message.method}:`, error.message);
      }
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
