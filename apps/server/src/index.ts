import { Hono } from "hono";
import { pendingToolCalls } from "./lib/executeTool"
import { cors } from "hono/cors";
import { agentRouter } from "./routes/api/v1/agent";
import { router as authRouter } from "./routes/api/v1/auth";
import { upgradeWebSocket, websocket } from 'hono/bun'
import type { WSContext } from "hono/ws";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./routers/index";
import { logger } from "hono/logger";
import { getCookie } from "hono/cookie";
export type { AppRouter } from "./routers/index";

const app = new Hono();

app.use(logger());

app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "*"),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);


app.route("/api/v1", agentRouter);
app.route("/api/v1/auth", authRouter);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => {
      const sessionCookie = getCookie(c, 'wos-session');
      return {
        sessionCookie,
      };
    },
  }),
);

export const agentStreams = new Map<string, WSContext>();

app.get("/", (c) => c.text("Hello ama"));
app.get("/login", (c) => c.redirect("/api/v1/auth/login"));

async function validateAccessToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      'https://api.workos.com/user_management/authorize/device',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`,
        },
        body: new URLSearchParams({
          client_id: process.env.WORKOS_CLIENT_ID!,
        }),
      },
    );

    if (!response.ok) {
      return false;
    }

    await response.json();
    return true;
  } catch (error) {
    console.error('Error validating access token:', error);
    return false;
  }
}

app.get(
  '/agent-streams',
  upgradeWebSocket(async (_c) => {
    const authHeader = _c.req.header('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      console.log("WebSocket connection rejected: No authentication token provided")
      return {
        onOpen: (_evt, ws) => {
          ws.close(1008, 'Authentication required')
        },
      }
    }

    const isValid = await validateAccessToken(token)
    if (!isValid) {
      console.log("WebSocket connection rejected: Invalid authentication token")
      return {
        onOpen: (_evt, ws) => {
          ws.close(1008, 'Invalid authentication token')
        },
      }
    }

    return {
      onOpen: (_evt, ws) => {
        agentStreams.set(token, ws)
        console.log(`CLI agent connected (token: ${token.slice(0, 8)}...)`)
      },
      onMessage(_evt) {
        const message = JSON.parse(_evt.data.toString())

        if (message.type === 'tool_result') {
          const callId = message.callId || message.id
          const pending = pendingToolCalls.get(callId)
          if (pending) {
            if (message.error) {
              pending.reject(new Error(message.error))
            } else {
              pending.resolve(message.result)
            }
            pendingToolCalls.delete(callId)
          }
        }
      },
      onClose: () => {
        agentStreams.delete(token)
        console.log(`CLI agent disconnected (token: ${token.slice(0, 8)}...)`)
      },
    }
  })
)


export default {
  fetch: app.fetch,
  websocket,
  idleTimeout: 120, // 120 seconds (2 minutes) to handle long-running streaming requests
}






