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

  // Parse cookies to find wos-session
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((cookie) => {
      const [name, ...valueParts] = cookie.split("=");
      return [name, valueParts.join("=")];
    }),
  );

  const sessionCookie = cookies["wos-session"];
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
