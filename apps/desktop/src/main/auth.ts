import { shell, net, session } from "electron";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { getWebUrl } from "./constants";
import { setCredentials, getCredentials, clearCredentials } from "./credential-store";
import { setCookiesFromResponse } from "./cookie-utils";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

let onAuthChange: ((user: AuthUser | null) => void) | null = null;

export function setAuthChangeCallback(cb: (user: AuthUser | null) => void) {
  onAuthChange = cb;
}

export async function signIn(): Promise<void> {
  const webUrl = getWebUrl();

  const port = await startCallbackServer();
  const state = btoa(
    JSON.stringify({
      desktop: true,
      callbackPort: port,
      nonce: randomBytes(16).toString("hex"),
      createdAt: Date.now(),
    }),
  );
  const signInUrl = `${webUrl}/api/auth/desktop-start?state=${encodeURIComponent(state)}`;
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

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (code && state) {
        const success = await handleAuthCallback(code, state);
        const html = success
          ? `<html><body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:18px">Signed in! You can close this tab.</p></div></body></html>`
          : `<html><body style="background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:18px;color:#ef4444">Sign in failed. Please try again.</p></div></body></html>`;
        res.writeHead(success ? 200 : 400, { "Content-Type": "text/html" });
        res.end(html);
      } else {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("Missing code or state");
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

async function handleAuthCallback(code: string, state: string): Promise<boolean> {
  try {
    const webUrl = getWebUrl();
    const response = await net.fetch(`${webUrl}/api/auth/desktop-exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    });

    const parsed = await response.json();
    if (!response.ok) {
      console.error("Auth exchange failed:", parsed?.error ?? parsed?.message ?? response.status);
      return false;
    }

    const { user, accessToken, refreshToken } = parsed;
    if (!accessToken || !refreshToken || !user) {
      console.error("Auth exchange response missing tokens or user");
      return false;
    }

    const stored: StoredAuth = { accessToken, refreshToken, user };
    setCredentials(stored);

    const setCookieHeader = response.headers.get("set-cookie");
    const allHeaders = response.headers.getSetCookie?.();
    await setCookiesFromResponse(webUrl, setCookieHeader ?? null, allHeaders);

    scheduleTokenRefresh();
    onAuthChange?.(user);
    return true;
  } catch (error) {
    console.error("Auth callback failed:", error);
    return false;
  }
}

export async function signOut(): Promise<void> {
  cancelTokenRefresh();
  clearCredentials();
  await session.defaultSession.clearStorageData();
  onAuthChange?.(null);
}

/** Returns session for renderer - user only, no tokens. */
export function getSession(): { user: AuthUser } | null {
  const creds = getCredentials();
  if (!creds) return null;
  return { user: creds.user };
}

export function getAccessToken(): string | null {
  return getCredentials()?.accessToken ?? null;
}

/** Get access token expiry in ms, or null if unparseable. */
function getAccessTokenExpiry(accessToken: string): number | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    const exp = payload?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MIN_REFRESH_INTERVAL_MS = 30 * 1000; // minimum 30s between refresh attempts
const INITIAL_BACKOFF_MS = 5 * 1000; // 5s initial backoff on failure
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 min max backoff

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inflightRefresh: Promise<boolean> | null = null;
let lastRefreshAttempt = 0;
let consecutiveFailures = 0;

function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;

  const creds = getCredentials();
  if (!creds) return;

  const expiry = getAccessTokenExpiry(creds.accessToken);
  if (!expiry) return;

  const now = Date.now();
  const refreshAt = expiry - REFRESH_BEFORE_EXPIRY_MS;

  // Ensure we never schedule sooner than MIN_REFRESH_INTERVAL_MS from last attempt
  const earliestNext = lastRefreshAttempt + MIN_REFRESH_INTERVAL_MS;
  const delay = Math.max(refreshAt - now, earliestNext - now, 1000);

  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refreshAccessToken().catch(() => {});
  }, delay);
}

export async function refreshAccessToken(): Promise<boolean> {
  // Deduplicate: if a refresh is already in-flight, piggyback on it
  if (inflightRefresh) return inflightRefresh;

  // Rate-limit: don't attempt more often than MIN_REFRESH_INTERVAL_MS
  const now = Date.now();
  if (now - lastRefreshAttempt < MIN_REFRESH_INTERVAL_MS) {
    scheduleRefresh();
    return false;
  }

  inflightRefresh = doRefresh();
  try {
    return await inflightRefresh;
  } finally {
    inflightRefresh = null;
  }
}

async function doRefresh(): Promise<boolean> {
  const creds = getCredentials();
  if (!creds?.refreshToken) return false;

  lastRefreshAttempt = Date.now();

  try {
    const webUrl = getWebUrl();
    const response = await net.fetch(`${webUrl}/api/auth/desktop-refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: creds.refreshToken }),
    });

    const parsed = await response.json();
    if (!response.ok) {
      console.error("Token refresh failed:", parsed?.error ?? response.status);
      consecutiveFailures++;
      scheduleRetryWithBackoff();
      return false;
    }

    const { accessToken, refreshToken, user } = parsed;
    if (!accessToken || !refreshToken || !user) {
      consecutiveFailures++;
      return false;
    }

    consecutiveFailures = 0;
    setCredentials({ accessToken, refreshToken, user });

    const setCookieHeader = response.headers.get("set-cookie");
    const allHeaders = response.headers.getSetCookie?.();
    await setCookiesFromResponse(webUrl, setCookieHeader ?? null, allHeaders);

    scheduleRefresh();
    return true;
  } catch (error) {
    console.error("Token refresh error:", error);
    consecutiveFailures++;
    scheduleRetryWithBackoff();
    return false;
  }
}

function scheduleRetryWithBackoff(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  const backoff = Math.min(
    INITIAL_BACKOFF_MS * Math.pow(2, consecutiveFailures - 1),
    MAX_BACKOFF_MS,
  );
  const jitter = backoff * 0.25 * Math.random();
  const delay = Math.floor(backoff + jitter);
  console.log(`[auth] Scheduling refresh retry in ${Math.round(delay / 1000)}s (failure #${consecutiveFailures})`);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refreshAccessToken().catch(() => {});
  }, delay);
}

export function scheduleTokenRefresh(): void {
  consecutiveFailures = 0;
  scheduleRefresh();
}

export function cancelTokenRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}
