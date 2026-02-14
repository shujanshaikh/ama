import type { Context } from "hono";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { WorkOS } from "@workos-inc/node";
import { verifyGatewayAuthToken } from "./gatewayAuth";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const clientId = process.env.WORKOS_CLIENT_ID;
    const apiKey = process.env.WORKOS_API_KEY;
    if (!clientId) throw new Error("WORKOS_CLIENT_ID is not set on server");
    if (!apiKey) throw new Error("WORKOS_API_KEY is not set on server (required for user-streams auth)");
    const workos = new WorkOS(apiKey);
    const jwksUrl = workos.userManagement.getJwksUrl(clientId);
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}


export async function getUserIdFromToken(token: string): Promise<string | null> {
  if (!token?.trim()) return null;

  // Repair token: URL query parsers may decode + as space, corrupting base64
  const repaired = token.replace(/ /g, "+");

  const gatewayUserId = verifyGatewayAuthToken(repaired);
  if (gatewayUserId) return gatewayUserId;

  try {
    await jwtVerify(repaired, getJwks());
    const claims = decodeJwt<{ sub?: string }>(repaired);
    return claims.sub ?? null;
  } catch (err) {
    console.warn("[bridgeAuth] JWT verification failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}


export async function getUserIdFromRequest(c: Context): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return getUserIdFromToken(token);
}


export async function requireAuth(
  c: Context<{ Variables: { userId: string } }>,
  next: () => Promise<void>
): Promise<Response | void> {
  const userId = await getUserIdFromRequest(c);
  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  c.set("userId", userId);
  await next();
}
