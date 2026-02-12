import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { net } from "electron";
import { setCookiesFromResponse } from "./main/cookie-utils";

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
    const response = await net.fetch(`${appUrl}/api/auth/desktop-refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: credentials.refresh_token,
      }),
    });

    if (response.ok) {
      const setCookieHeader = response.headers.get("set-cookie");
      const allHeaders = response.headers.getSetCookie?.();
      await setCookiesFromResponse(appUrl, setCookieHeader ?? null, allHeaders);

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
