import { shell, net, session } from "electron";
import http from "node:http";
import Store from "electron-store";
import { getWebUrl } from "./constants";

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

const store = new Store<{ auth: StoredAuth | null }>({
  defaults: { auth: null },
});

let onAuthChange: ((user: StoredAuth["user"] | null) => void) | null = null;

export function setAuthChangeCallback(cb: (user: StoredAuth["user"] | null) => void) {
  onAuthChange = cb;
}

export async function signIn(): Promise<void> {
  const webUrl = getWebUrl();

  // Start a temporary local HTTP server to receive the auth callback.
  // This avoids relying on deep links which don't work in dev.
  const port = await startCallbackServer();
  const state = btoa(
    JSON.stringify({ desktop: true, callbackPort: port }),
  );
  const signInUrl = `${webUrl}/api/auth/sign-in?state=${encodeURIComponent(state)}`;
  await shell.openExternal(signInUrl);
}

function startCallbackServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const data = url.searchParams.get("data");
      if (data) {
        const success = await handleAuthCallback(data);
        const html = success
          ? `<html><body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:18px">Signed in! You can close this tab.</p></div></body></html>`
          : `<html><body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:18px;color:#ef4444">Sign in failed. Please try again.</p></div></body></html>`;
        res.writeHead(success ? 200 : 400, { "Content-Type": "text/html" });
        res.end(html);
      } else {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("Missing auth data");
      }

      // Close server after handling the callback
      server.close();
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve(addr.port);
      } else {
        reject(new Error("Failed to start callback server"));
      }
    });

    // Auto-close after 5 minutes if no callback received
    setTimeout(() => server.close(), 5 * 60 * 1000);
  });
}

async function handleAuthCallback(data: string): Promise<boolean> {
  try {
    const decoded = JSON.parse(atob(data)) as StoredAuth;
    store.set("auth", decoded);

    // Set session cookie via the /api/auth/desktop endpoint
    const webUrl = getWebUrl();
    const response = await net.fetch(`${webUrl}/api/auth/desktop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: decoded.accessToken,
        refreshToken: decoded.refreshToken,
        user: decoded.user,
      }),
    });

    if (response.ok) {
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
          url: webUrl,
          name,
          value,
          path: "/",
          httpOnly: true,
        });
      }
    }

    onAuthChange?.(decoded.user);
    return true;
  } catch (error) {
    console.error("Auth callback failed:", error);
    return false;
  }
}

export async function signOut(): Promise<void> {
  store.delete("auth");
  await session.defaultSession.clearStorageData();
  onAuthChange?.(null);
}

export function getSession(): StoredAuth | null {
  return store.get("auth");
}

export function getAccessToken(): string | null {
  return store.get("auth")?.accessToken ?? null;
}
