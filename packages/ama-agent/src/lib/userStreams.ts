import WebSocket from "ws";
import { getTokens, getUserId } from "./auth-login";
import { rpcHandlers, type RpcError } from "./rpc-handlers";
import pc from "picocolors";

let wsConnection: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

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

  ws.on("open", () => {
    console.log(pc.green("CLI connected to user-streams"));

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  ws.on("message", async (event) => {
    try {
      const message = JSON.parse(event.toString());

      if (message._tag === 'rpc_call') {
        const { requestId, method, input } = message;
        console.log(pc.gray(`RPC call: ${method}`));

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
          console.log(pc.yellow(`Unknown RPC method: ${method}`));
          return;
        }

        try {
          const result = await handler(input || {});
          ws.send(JSON.stringify({
            _tag: 'rpc_result',
            requestId,
            data: result,
          }));
          console.log(pc.green(`RPC completed: ${method}`));
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
          console.log(pc.red(`RPC failed: ${method} - ${rpcError.message}`));
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
      console.error(pc.red(`Failed to parse message: ${parseError}`));
    }
  });

  ws.on("close", (code, reason) => {
    console.log(pc.yellow(`CLI disconnected from user-streams (code: ${code})`));
    wsConnection = null;

    console.log(pc.gray("Reconnecting in 5 seconds..."));
    reconnectTimeout = setTimeout(() => {
      connectToUserStreams(serverUrl).catch(err => {
        console.error(pc.red(`Reconnection failed: ${err.message}`));
      });
    }, 5000);
  });

  ws.on("error", (error) => {
    console.error(pc.red(`User streams WebSocket error: ${error.message}`));
  });

  return ws;
};

export const getUserStreamConnection = (): WebSocket | null => {
  return wsConnection;
};

export const isUserStreamConnected = (): boolean => {
  return wsConnection?.readyState === WebSocket.OPEN;
};
