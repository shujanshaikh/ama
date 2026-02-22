import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppEnv } from "@/env";
import { connectToSessionDO } from "@/lib/do-session";
import { getUserIdFromToken, getUserIdFromRequest } from "@/lib/bridgeAuth";
import { validateAuthToken } from "@/lib/validateAuthToken";
import { createAgentRouter } from "@/routes/api/v1/agent";
import { BridgeSessionDO } from "@/durable/BridgeSessionDO";

const devOrigins = ["http://localhost:3001", "http://localhost:5173", "http://localhost:5174", "null"];
const ALLOWED_STREAM_TYPES = new Set(["cli", "frontend"]);

function getTokenFromRequest(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): string | null {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  const tokenParam = c.req.query("token");
  return tokenParam?.trim() || null;
}

const app = new Hono<AppEnv>();

app.use(logger());
app.use("/*", (c, next) => {
  const corsOrigin = c.env.CORS_ORIGIN || (c.env.NODE_ENV !== "production" ? devOrigins : "*");
  const middleware = cors({
    origin: corsOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  return middleware(c, next);
});

app.get("/", (c) => c.text("Hello ama"));

app.get("/agent-streams", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const isValid = await validateAuthToken(token, c.env);
  if (!isValid) {
    return c.json({ error: "Invalid authentication token" }, 401);
  }

  const userId = await getUserIdFromToken(token, c.env);
  if (!userId) {
    return c.json({ error: "Invalid token: user identity required" }, 401);
  }

  return connectToSessionDO(c.env, userId, c.req.raw, "agent");
});

app.get("/api/v1/user-streams", async (c) => {
  const token = getTokenFromRequest(c);
  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const userId = await getUserIdFromToken(token, c.env);
  if (!userId) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const rawType = c.req.query("type") ?? "frontend";
  const type = ALLOWED_STREAM_TYPES.has(rawType) ? rawType : "frontend";
  return connectToSessionDO(c.env, userId, c.req.raw, type as "cli" | "frontend");
});

app.use("/api/v1/*", async (c, next) => {
  const userId = await getUserIdFromRequest(c, c.env);
  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  c.set("userId", userId);
  await next();
});

app.route("/api/v1", createAgentRouter());

export { BridgeSessionDO };
export default app;
