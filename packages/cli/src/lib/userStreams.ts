import WebSocket from "ws";
import { getTokens, getUserId } from "./auth-login";
import { rpcHandlers, type RpcError } from "./rpc-handlers";
import pc from "picocolors";

// Reconnection config
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 60000;
const BACKOFF_MULTIPLIER = 2;
const CLI_HEARTBEAT_INTERVAL_MS = 5000;

let wsConnection: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
let heartbeatInterval: NodeJS.Timeout | null = null;

function getReconnectDelay(): number {
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, reconnectAttempts),
    MAX_RECONNECT_DELAY
  );
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

export const connectToUserStreams = async (serverUrl: string): Promise<WebSocket> => {
  const userId = getUserId();
  if (!userId?.userId) {
    throw new Error("User ID not found");
  }

  const params = new URLSearchParams({
    userId: userId.userId,
    type: 'cli',
  });

  const tokens = getTokens();
  if (!tokens) {
    throw new Error("No tokens found");
  }

  const wsUrl = `${serverUrl}/api/v1/user-streams?${params.toString()}`;
  const ws = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  wsConnection = ws;

  const clearHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const sendHeartbeat = () => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      _tag: "cli_heartbeat",
      timestamp: Date.now(),
    }));
  };

  ws.on("open", () => {
    reconnectAttempts = 0; // Reset on successful connection
    console.log(pc.cyan("connected to user streams"));

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    clearHeartbeat();
    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, CLI_HEARTBEAT_INTERVAL_MS);
  });

  ws.on("message", async (event) => {
    try {
      const message = JSON.parse(event.toString());

      if (message._tag === 'rpc_call') {
        const { requestId, method, input } = message;
        console.log(pc.gray(`> ${method}`));

        const handler = rpcHandlers[method];

        if (!handler) {
          ws.send(JSON.stringify({
            _tag: 'rpc_result',
            requestId,
            data: {
              _tag: 'UnknownMethodError',
              message: `Unknown RPC method: ${method}`,
            },
          }));
          return;
        }

        try {
          const result = await handler(input || {});
          ws.send(JSON.stringify({
            _tag: 'rpc_result',
            requestId,
            data: result,
          }));
        } catch (error: any) {
          const rpcError: RpcError = error._tag
            ? error
            : {
              _tag: 'RpcError',
              message: error.message || String(error),
            };

          ws.send(JSON.stringify({
            _tag: 'rpc_result',
            requestId,
            data: rpcError,
          }));
          console.log(pc.red(`  ${method} failed`));
        }
        return;
      }

      if (message.type === "presence_request") {
        if (message.status === "connected") {
          ws.send(JSON.stringify({
            type: "presence_request",
            status: "connected",
          }));
        }
        if (message.status === "disconnected") {
          ws.send(JSON.stringify({
            type: "presence_request",
            status: "disconnected",
          }));
        }
      }
    } catch (parseError) {
      console.error(pc.red(`parse error`));
    }
  });

  ws.on("close", (code, reason) => {
    void code;
    void reason;
    wsConnection = null;
    clearHeartbeat();
    const delay = getReconnectDelay();
    reconnectAttempts++;
    console.log(pc.gray(`user streams disconnected, reconnecting in ${Math.round(delay / 1000)}s...`));
    reconnectTimeout = setTimeout(() => {
      connectToUserStreams(serverUrl).catch(err => {
        console.error(pc.red(`reconnection failed`));
      });
    }, delay);
  });

  ws.on("error", (error) => {
    clearHeartbeat();
    console.error(pc.red(`stream error: ${error.message}`));
  });

  return ws;
};

export const getUserStreamConnection = (): WebSocket | null => {
  return wsConnection;
};

export const isUserStreamConnected = (): boolean => {
  return wsConnection?.readyState === WebSocket.OPEN;
};
