import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";


const userConnections = new Map<string, Set<WSContext>>();
const cliConnections = new Map<string, WSContext>();
const pendingRpcCalls = new Map<string, { ws: WSContext; timeout: ReturnType<typeof setTimeout> }>();

function broadcastToUser(userId: string, message: object) {
  const connections = userConnections.get(userId);
  if (connections) {
    const payload = JSON.stringify(message);
    connections.forEach(ws => {
      try { ws.send(payload); } catch { }
    });
  }
}

export const userStreams = new Hono().get("/user-streams", upgradeWebSocket(async (c) => {
  const userId = c.req.query("userId");
  const type = c.req.query("type") || "frontend";

  if (!userId) {
    return {
      onOpen: (_evt, ws) => {
        ws.close(1008, 'Login from cli app to use this feature');
      },
    };
  }

  return {
    onOpen: (_evt, ws) => {
      console.log(`[user-streams] ${type} connected with userId: ${userId}`);
      if (type === 'cli') {
        cliConnections.set(userId, ws);
        console.log(`[user-streams] CLI registered for userId: ${userId}, total CLI connections: ${cliConnections.size}`);

        broadcastToUser(userId, {
          _tag: 'cli_status',
          status: 'connected',
          timestamp: Date.now(),
        });
      } else {
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId)!.add(ws);

        const cliConnected = cliConnections.has(userId);
        console.log(`[user-streams] Frontend checking CLI for userId: ${userId}, found: ${cliConnected}, registered CLI userIds: [${Array.from(cliConnections.keys()).join(', ')}]`);
        ws.send(JSON.stringify({
          _tag: 'cli_status',
          status: cliConnected ? 'connected' : 'disconnected',
          timestamp: Date.now(),
        }));
      }
    },

    onMessage(evt, ws) {
      const message = JSON.parse(evt.data.toString());


      if (message._tag === 'cli_status_request') {
        ws.send(JSON.stringify({
          _tag: 'cli_status_response',
          connected: cliConnections.has(userId),
        }));
        return;
      }

      if (message._tag === 'rpc_call') {
        const cliWs = cliConnections.get(userId);

        if (!cliWs) {
          ws.send(JSON.stringify({
            _tag: 'rpc_error',
            requestId: message.requestId,
            type: 'no_cli_connected',
            message: 'No CLI connected to handle this request',
          }));
          return;
        }

        const timeout = setTimeout(() => {
          pendingRpcCalls.delete(message.requestId);
          ws.send(JSON.stringify({
            _tag: 'rpc_error',
            requestId: message.requestId,
            type: 'timeout',
            message: 'RPC call timed out after 30 seconds',
          }));
        }, 30000);

        pendingRpcCalls.set(message.requestId, { ws, timeout });

        cliWs.send(JSON.stringify(message));
        return;
      }

      if (message._tag === 'rpc_result' && type === 'cli') {
        const pending = pendingRpcCalls.get(message.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRpcCalls.delete(message.requestId);
          pending.ws.send(JSON.stringify(message));
        }
        return;
      }

      if (message.type === "presence_request") {
        if (message.status === "connected") {
          console.log("Legacy presence: User connected");
        } else if (message.status === "disconnected") {
          console.log("Legacy presence: User disconnected");
        }
      }
    },

    onClose(_evt , ws) {
      if (type === 'cli') {
        cliConnections.delete(userId);

        broadcastToUser(userId, {
          _tag: 'cli_status',
          status: 'disconnected',
          timestamp: Date.now(),
        });

        pendingRpcCalls.forEach((pending, requestId) => {
          clearTimeout(pending.timeout);
          try {
            pending.ws.send(JSON.stringify({
              _tag: 'rpc_error',
              requestId,
              type: 'no_cli_connected',
              message: 'CLI disconnected',
            }));
          } catch {
            console.error("Error sending RPC error to user", userId, requestId);
           }
          pendingRpcCalls.delete(requestId);
        });
      } else {
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            userConnections.delete(userId);
          }
        }
        console.log(`Frontend disconnected for user: ${userId}`);
      }
    },
  };
}));

export type UserStreams = typeof userStreams;