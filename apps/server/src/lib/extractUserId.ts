import { unsealData } from "iron-session";

interface SessionData {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    [key: string]: unknown;
  };
}

export async function extractUserIdFromCookie(
  cookieHeader: string | null,
): Promise<string | null> {
  if (!cookieHeader) return null;

  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD;
  if (!cookiePassword) return null;
  const cookieName = process.env.WORKOS_COOKIE_NAME || "wos-session";

  // Parse cookies and look up the configured session cookie name.
  const cookies = Object.fromEntries(
    cookieHeader.split(/;\s*/).map((cookie) => {
      const [name, ...valueParts] = cookie.split("=");
      return [name, valueParts.join("=")];
    }),
  );

  const sessionCookie = cookies[cookieName];
  if (!sessionCookie) return null;

  try {
    const session = await unsealData<SessionData>(
      decodeURIComponent(sessionCookie),
      { password: cookiePassword },
    );
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
