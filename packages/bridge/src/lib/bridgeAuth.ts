import type { Context } from "hono";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { verifyGatewayAuthToken } from "@/lib/gatewayAuth";
import type { WorkerBindings } from "@/env";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(clientId: string) {
  let jwks = jwksCache.get(clientId);
  if (!jwks) {
    const jwksUrl = `https://api.workos.com/sso/jwks/${clientId}`;
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksCache.set(clientId, jwks);
  }
  return jwks;
}

export async function getUserIdFromToken(token: string, env: WorkerBindings): Promise<string | null> {
  if (!token?.trim()) return null;

  const repaired = token.replace(/ /g, "+");

  const gatewayUserId = await verifyGatewayAuthToken(repaired, env);
  if (gatewayUserId) return gatewayUserId;

  const clientId = env.WORKOS_CLIENT_ID;
  if (!clientId) return null;

  try {
    await jwtVerify(repaired, getJwks(clientId));
    const claims = decodeJwt<{ sub?: string }>(repaired);
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

export async function getUserIdFromRequest(c: Context, env: WorkerBindings): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return getUserIdFromToken(token, env);
}

export async function requireAuth(
  c: Context<{ Bindings: WorkerBindings; Variables: { userId: string } }>,
  next: () => Promise<void>,
): Promise<Response | void> {
  const userId = await getUserIdFromRequest(c, c.env);
  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  c.set("userId", userId);
  await next();
}
