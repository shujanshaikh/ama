import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { net, session } from "electron";

interface CLICredentials {
  user: Record<string, unknown>;
  access_token: string;
  refresh_token: string;
}

export function readCredentials(): CLICredentials | null {
  try {
    const credPath = join(homedir(), ".amai", "credentials.json");
    const data = readFileSync(credPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function authenticateFromCLI(appUrl: string): Promise<boolean> {
  const credentials = readCredentials();
  if (!credentials) {
    console.log("No CLI credentials found at ~/.amai/credentials.json");
    return false;
  }

  try {
    const response = await net.fetch(`${appUrl}/api/auth/desktop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
        user: credentials.user,
      }),
    });

    if (response.ok) {
      // net.fetch may not automatically store Set-Cookie headers in the
      // BrowserWindow cookie store. Explicitly extract and set the session
      // cookie so the web UI can read it when the page loads.
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        const eqIdx = setCookieHeader.indexOf("=");
        const semiIdx = setCookieHeader.indexOf(";");
        const name = setCookieHeader.substring(0, eqIdx).trim();
        const value = setCookieHeader.substring(
          eqIdx + 1,
          semiIdx > -1 ? semiIdx : undefined,
        ).trim();

        await session.defaultSession.cookies.set({
          url: appUrl,
          name,
          value,
          path: "/",
          httpOnly: true,
        });
      }

      console.log("Desktop auth successful via ~/.amai credentials");
      return true;
    }

    console.error("Desktop auth failed:", response.status);
    return false;
  } catch (error) {
    console.error("Desktop auth request failed:", error);
    return false;
  }
}
