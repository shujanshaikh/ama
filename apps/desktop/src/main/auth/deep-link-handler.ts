import { app } from "electron";
import path from "node:path";

const PROTOCOL = "ama";

export function registerProtocol(): void {
  if (process.defaultApp) {
    const appPath = app.getAppPath();
    const registered = app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(appPath),
    ]);
    if (!registered) {
      console.warn("[auth] Failed to register default protocol client");
    }
    return;
  }

  const registered = app.setAsDefaultProtocolClient(PROTOCOL);
  if (!registered) {
    console.warn("[auth] Failed to register default protocol client");
  }
}

export function extractCallbackCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === `${PROTOCOL}:`) {
      const error = parsed.searchParams.get("error");
      if (error) {
        console.error(
          "OAuth error:",
          error,
          parsed.searchParams.get("error_description"),
        );
        return null;
      }
      return parsed.searchParams.get("code");
    }
  } catch {
    // Invalid URL
  }
  return null;
}
