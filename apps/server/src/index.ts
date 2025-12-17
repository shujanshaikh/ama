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
      // Extract session cookie from request
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

app.get(
  '/agent-streams',
  upgradeWebSocket((_c) => {
    return {
      onOpen: (_evt, ws) => {
        agentStreams.set("", ws)
        console.log("CLI agent connected")
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
        agentStreams.delete("")
        console.log("CLI agent disconnected")
      },
    }
  })
)


export default {
  fetch: app.fetch,
  websocket,
}





