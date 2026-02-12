import { session } from "electron";
import parseSetCookie from "set-cookie-parser";

/**
 * Parse Set-Cookie header(s) and set cookies in Electron session with proper attributes.
 */
export async function setCookiesFromResponse(
  baseUrl: string,
  setCookieHeader: string | null,
  allHeaders?: string[],
): Promise<void> {
  const input = allHeaders?.length ? allHeaders : setCookieHeader;
  if (!input) return;

  const cookies = parseSetCookie(input, { decodeValues: true });
  const defaultSession = session.defaultSession;

  for (const c of cookies) {
    const details: Electron.CookiesSetDetails = {
      url: baseUrl,
      name: c.name,
      value: c.value ?? "",
      path: c.path ?? "/",
      httpOnly: c.httpOnly ?? true,
      secure: c.secure ?? baseUrl.startsWith("https:"),
      sameSite: (c.sameSite as "unspecified" | "no_restriction" | "lax" | "strict") ?? "lax",
    };
    if (c.expires) {
      details.expirationDate = c.expires.getTime() / 1000;
    }
    if (c.domain) {
      details.domain = c.domain;
    }
    await defaultSession.cookies.set(details);
  }
}
