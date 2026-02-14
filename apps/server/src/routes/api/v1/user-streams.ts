import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";
import { getUserIdFromToken } from "@/lib/bridgeAuth";

const userConnections = new Map<string, Set<WSContext>>();
const cliConnections = new Map<string, WSContext>();
const pendingRpcCalls = new Map<string, { ws: WSContext; timeout: ReturnType<typeof setTimeout> }>();

const ALLOWED_TYPES = ["cli", "frontend"] as const;

function broadcastToUser(userId: string, message: object) {
  const connections = userConnections.get(userId);
  if (connections) {
    const payload = JSON.stringify(message);
    connections.forEach(ws => {
      try { ws.send(payload); } catch { }
    });
  }
}

function getTokenFromRequest(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): string | null {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  const tokenParam = c.req.query("token");
  return tokenParam?.trim() || null;
}

export const userStreams = new Hono().get("/user-streams", upgradeWebSocket(async (c) => {
  try {
    const token = getTokenFromRequest(c);
    const typeParam = c.req.query("type") || "frontend";
    const type = ALLOWED_TYPES.includes(typeParam as typeof ALLOWED_TYPES[number]) ? typeParam : "frontend";

    if (!token) {
      return {
        onOpen: (_evt, ws) => {
          ws.close(1008, "Authentication required. Provide Authorization: Bearer <token> or token query param.");
        },
      };
    }

    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return {
        onOpen: (_evt, ws) => {
          ws.close(1008, "Invalid or expired token");
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
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(evt.data.toString()) as Record<string, unknown>;
      } catch {
        console.error("[user-streams] Invalid JSON in message");
        return;
      }

      if (message._tag === 'cli_status_request') {
        ws.send(JSON.stringify({
          _tag: 'cli_status_response',
          connected: cliConnections.has(userId),
        }));
        return;
      }

      if (message._tag === 'rpc_call') {
        const requestId = String(message.requestId ?? "");
        const cliWs = cliConnections.get(userId);

        if (!cliWs) {
          ws.send(JSON.stringify({
            _tag: 'rpc_error',
            requestId,
            type: 'no_cli_connected',
            message: 'No CLI connected to handle this request',
          }));
          return;
        }

        const namespacedId = `${userId}:${requestId}`;
        const timeout = setTimeout(() => {
          pendingRpcCalls.delete(namespacedId);
          ws.send(JSON.stringify({
            _tag: 'rpc_error',
            requestId,
            type: 'timeout',
            message: 'RPC call timed out after 30 seconds',
          }));
        }, 30000);

        pendingRpcCalls.set(namespacedId, { ws, timeout });

        cliWs.send(JSON.stringify({ ...message, requestId }));
        return;
      }

      if (message._tag === 'rpc_result' && type === 'cli') {
        const requestId = String(message.requestId ?? "");
        const namespacedId = `${userId}:${requestId}`;
        const pending = pendingRpcCalls.get(namespacedId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRpcCalls.delete(namespacedId);
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

        const prefix = `${userId}:`;
        for (const [key, pending] of pendingRpcCalls) {
          if (key.startsWith(prefix)) {
            clearTimeout(pending.timeout);
            try {
              const requestId = key.slice(prefix.length);
              pending.ws.send(JSON.stringify({
                _tag: 'rpc_error',
                requestId,
                type: 'no_cli_connected',
                message: 'CLI disconnected',
              }));
            } catch {
              console.error("Error sending RPC error to user", userId, key);
            }
            pendingRpcCalls.delete(key);
          }
        }
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
  } catch (err) {
    console.error("[user-streams] Upgrade error:", err);
    return {
      onOpen: (_evt, ws) => {
        ws.close(1011, "Internal server error during upgrade");
      },
    };
  }
}));

export type UserStreams = typeof userStreams;