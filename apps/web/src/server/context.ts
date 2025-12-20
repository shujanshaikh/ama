import { decodeJwt } from "jose";
import type { AccessToken } from "@workos-inc/node";
import type { UserInfo, NoUserInfo } from "@/authkit/ssr/interface";
import { getConfig } from "@/authkit/ssr/config";

async function getSessionFromRequest(req: Request): Promise<UserInfo | NoUserInfo> {
  // Extract cookie from request headers
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    return { user: null };
  }

  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((cookie) => {
      const [name, ...valueParts] = cookie.split("=");
      return [name, valueParts.join("=")];
    })
  );

  // Get the session cookie name from config
  const cookieName = getConfig("cookieName") || "wos-session";
  const sessionCookie = cookies[cookieName];

  if (!sessionCookie) {
    return { user: null };
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
  } catch (error) {
    // If decryption fails, return no user
    return { user: null };
  }
}

export async function createContext({ req }: { req: Request }) {
  const session = await getSessionFromRequest(req);
  
  return {
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
  