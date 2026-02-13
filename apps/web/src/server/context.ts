import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import type { AccessToken } from "@workos-inc/node";
import type { UserInfo, NoUserInfo } from "@/authkit/ssr/interface";
import { getConfig } from "@/authkit/ssr/config";
import { getWorkOS } from "@/authkit/ssr/workos";

const JWKS = createRemoteJWKSet(
  new URL(getWorkOS().userManagement.getJwksUrl(getConfig("clientId"))),
);

async function getSessionFromBearerToken(
  req: Request,
): Promise<UserInfo | NoUserInfo> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return { user: null };
  }

  const accessToken = authHeader.slice("Bearer ".length).trim();
  if (!accessToken) {
    return { user: null };
  }

  try {
    await jwtVerify(accessToken, JWKS);
    const claims = decodeJwt<
      AccessToken & {
        sub?: string;
        sid?: string;
      }
    >(accessToken);

    if (!claims.sub) {
      return { user: null };
    }

    return {
      sessionId: claims.sid ?? "desktop-session",
      user: { id: claims.sub } as UserInfo["user"],
      organizationId: claims.org_id,
      role: claims.role,
      permissions: claims.permissions,
      entitlements: claims.entitlements,
      accessToken,
    };
  } catch {
    return { user: null };
  }
}

async function getSessionFromRequest(req: Request): Promise<UserInfo | NoUserInfo> {
  // Extract cookie from request headers
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    return getSessionFromBearerToken(req);
  }

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split(/;\s*/).map((cookie) => {
      const [name, ...valueParts] = cookie.split("=");
      return [name, valueParts.join("=")];
    })
  );

  // Get the session cookie name from config
  const cookieName = getConfig("cookieName") || "wos-session";
  const sessionCookie = cookies[cookieName];

  if (!sessionCookie) {
    return getSessionFromBearerToken(req);
  }

  try {
    // Import decryptSession dynamically to avoid issues
    const { decryptSession } = await import("@/authkit/ssr/session");
    const session = await decryptSession(decodeURIComponent(sessionCookie));

    if (!session?.user) {
      return { user: null };
    }

    const {
      sid: sessionId,
      org_id: organizationId,
      role,
      permissions,
      entitlements,
    } = decodeJwt<AccessToken>(session.accessToken);

    return {
      sessionId,
      user: session.user,
      organizationId,
      role,
      permissions,
      entitlements,
      impersonator: session.impersonator,
      accessToken: session.accessToken,
    };
  } catch {
    // If decryption fails, try bearer auth fallback for desktop clients.
    return getSessionFromBearerToken(req);
  }
}

export async function createContext({ req }: { req: Request }) {
  const session = await getSessionFromRequest(req);

  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
