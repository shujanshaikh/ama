import { safeStorage } from "electron";
import { createWorkOS } from "@workos-inc/node";
import Store from "electron-store";
import type { User } from "@workos-inc/node";

// @ts-expect-error -- Vite injects MAIN_VITE_* env vars at build time
const CLIENT_ID: string = import.meta.env.MAIN_VITE_WORKOS_CLIENT_ID;
const REDIRECT_URI = "ama://auth/callback";
const PKCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StoreSchema {
  session: { accessToken: string; refreshToken: string; user: User } | null;
  pkce: { codeVerifier: string; expiresAt: number } | null;
}

const workos = createWorkOS({ clientId: CLIENT_ID });
const store = new Store<StoreSchema>({
  name: "authkit-session",
  encryptionKey: safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString("authkit-session-key").toString("base64")
    : undefined,
  defaults: { session: null, pkce: null },
});

/** Generate sign-in URL with PKCE challenge */
export async function getSignInUrl(): Promise<string> {
  const { codeVerifier, codeChallenge } = await workos.pkce.generate();
  store.set("pkce", { codeVerifier, expiresAt: Date.now() + PKCE_TTL_MS });

  return workos.userManagement.getAuthorizationUrl({
    redirectUri: REDIRECT_URI,
    codeChallenge,
    codeChallengeMethod: "S256",
    provider: "authkit",
  });
}

/** Exchange authorization code for tokens */
export async function handleCallback(code: string): Promise<User> {
  const pkce = store.get("pkce");
  if (!pkce) throw new Error("No PKCE state found");
  if (pkce.expiresAt < Date.now()) {
    store.delete("pkce");
    throw new Error("PKCE expired");
  }

  const auth = await workos.userManagement.authenticateWithCode({
    code,
    codeVerifier: pkce.codeVerifier,
  });

  store.delete("pkce");
  store.set("session", {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    user: auth.user,
  });

  return auth.user;
}

/** Get tokens for CLI credential sync */
export function getTokensForCLI(): { access_token: string; refresh_token: string } | null {
  const session = store.get("session");
  if (!session?.accessToken) return null;
  return {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  };
}

function parseJwtPayload(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
}

/** Get current user, refreshing token if expired */
export async function getUser(): Promise<User | null> {
  const session = store.get("session");
  if (!session?.accessToken) return null;

  const { exp } = parseJwtPayload(session.accessToken) as { exp: number };
  const tokenExpired = Date.now() > exp * 1000 - 10000;
  if (tokenExpired) {
    try {
      const refreshed =
        await workos.userManagement.authenticateWithRefreshToken({
          clientId: CLIENT_ID,
          refreshToken: session.refreshToken,
        });
      store.set("session", {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        user: refreshed.user,
      });
      return refreshed.user;
    } catch {
      store.delete("session");
      return null;
    }
  }

  return session.user;
}

/** Get raw access token for daemon connections */
export function getAccessToken(): string | null {
  return store.get("session")?.accessToken ?? null;
}

/** Refresh the access token, returns true on success */
export async function refreshAccessToken(): Promise<boolean> {
  const session = store.get("session");
  if (!session?.refreshToken) return false;

  try {
    const refreshed =
      await workos.userManagement.authenticateWithRefreshToken({
        clientId: CLIENT_ID,
        refreshToken: session.refreshToken,
      });
    store.set("session", {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: refreshed.user,
    });
    return true;
  } catch {
    store.delete("session");
    return false;
  }
}

/** Clear local session */
export function clearSession(): void {
  store.delete("session");
  store.delete("pkce");
}

/** Get session ID from stored access token */
export function getSessionId(): string | null {
  const session = store.get("session");
  if (!session?.accessToken) return null;
  try {
    const { sid } = parseJwtPayload(session.accessToken) as { sid?: string };
    return sid ?? null;
  } catch {
    return null;
  }
}

/** Get logout URL */
export function getLogoutUrl(sessionId: string): string {
  return `https://api.workos.com/user_management/sessions/logout?session_id=${sessionId}`;
}
