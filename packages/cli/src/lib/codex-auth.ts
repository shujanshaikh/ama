import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { AMA_DIR } from "../constant";

export const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const ISSUER = "https://auth.openai.com";
export const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses";
export const OAUTH_PORT = 1455;

const CREDENTIALS_PATH = path.join(AMA_DIR, "codex-credentials.json");
const CALLBACK_PATH = "/auth/callback";
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const REFRESH_BUFFER_MS = 60 * 1000;

export interface PkceCodes {
  verifier: string;
  challenge: string;
}

export interface TokenResponse {
  id_token?: string;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export interface CodexCredentials {
  accessToken: string;
  refreshToken: string;
  accountId: string;
  expiresAt: number;
}

export interface IdTokenClaims {
  chatgpt_account_id?: string;
  organizations?: Array<{ id: string }>;
  email?: string;
  "https://api.openai.com/auth"?: {
    chatgpt_account_id?: string;
  };
}

interface PendingOAuth {
  pkce: PkceCodes;
  state: string;
  resolve: (tokens: TokenResponse) => void;
  reject: (error: Error) => void;
}

let oauthServer: Server | undefined;
let pendingOAuth: PendingOAuth | undefined;

const HTML_SUCCESS = `<!doctype html>
<html>
  <head>
    <title>amai - Codex Authorization Successful</title>
    <style>
      body {
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background: #131010;
        color: #f1ecec;
      }
      .container {
        text-align: center;
        padding: 2rem;
      }
      h1 {
        color: #f1ecec;
        margin-bottom: 1rem;
      }
      p {
        color: #b7b1b1;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Authorization Successful</h1>
      <p>You can close this window and return to ama.</p>
    </div>
    <script>
      setTimeout(() => window.close(), 2000)
    </script>
  </body>
</html>`;

const HTML_ERROR = (error: string) => `<!doctype html>
<html>
  <head>
    <title>amai - Codex Authorization Failed</title>
    <style>
      body {
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background: #131010;
        color: #f1ecec;
      }
      .container {
        text-align: center;
        padding: 2rem;
      }
      h1 {
        color: #fc533a;
        margin-bottom: 1rem;
      }
      p {
        color: #b7b1b1;
      }
      .error {
        color: #ff917b;
        font-family: monospace;
        margin-top: 1rem;
        padding: 1rem;
        background: #3c140d;
        border-radius: 0.5rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Authorization Failed</h1>
      <p>An error occurred during authorization.</p>
      <div class="error">${error}</div>
    </div>
  </body>
</html>`;

function ensureCredentialsDir() {
  if (!fs.existsSync(AMA_DIR)) {
    fs.mkdirSync(AMA_DIR, { recursive: true });
  }
}

function saveCredentials(credentials: CodexCredentials) {
  ensureCredentialsDir();
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), "utf8");
}

function readCredentials(): CodexCredentials | null {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(CREDENTIALS_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<CodexCredentials>;
  if (
    typeof parsed.accessToken !== "string" ||
    typeof parsed.refreshToken !== "string" ||
    typeof parsed.accountId !== "string" ||
    typeof parsed.expiresAt !== "number"
  ) {
    return null;
  }
  return parsed as CodexCredentials;
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function generatePKCE(): Promise<PkceCodes> {
  const verifier = generateRandomString(43);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64UrlEncode(hash);
  return { verifier, challenge };
}

export function generateState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export function parseJwtClaims(token: string): IdTokenClaims | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
}

function extractAccountIdFromClaims(claims: IdTokenClaims): string | undefined {
  return (
    claims.chatgpt_account_id ||
    claims["https://api.openai.com/auth"]?.chatgpt_account_id ||
    claims.organizations?.[0]?.id
  );
}

export function extractAccountId(tokens: TokenResponse): string | undefined {
  if (tokens.id_token) {
    const claims = parseJwtClaims(tokens.id_token);
    const accountId = claims && extractAccountIdFromClaims(claims);
    if (accountId) {
      return accountId;
    }
  }

  const accessClaims = parseJwtClaims(tokens.access_token);
  return accessClaims ? extractAccountIdFromClaims(accessClaims) : undefined;
}

export function buildAuthorizeUrl(redirectUri: string, pkce: PkceCodes, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "openid profile email offline_access",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    state,
    originator: "ama",
  });

  return `${ISSUER}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  pkce: PkceCodes,
): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: pkce.verifier,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

async function startOAuthServer(): Promise<{ redirectUri: string }> {
  if (oauthServer) {
    return { redirectUri: `http://localhost:${OAUTH_PORT}${CALLBACK_PATH}` };
  }

  oauthServer = createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", `http://localhost:${OAUTH_PORT}`);

    if (requestUrl.pathname !== CALLBACK_PATH) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    const error = requestUrl.searchParams.get("error");
    const errorDescription = requestUrl.searchParams.get("error_description");

    const sendHtml = (html: string, statusCode = 200) => {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    };

    if (error) {
      const message = errorDescription || error;
      pendingOAuth?.reject(new Error(message));
      pendingOAuth = undefined;
      sendHtml(HTML_ERROR(message));
      return;
    }

    if (!code) {
      const message = "Missing authorization code";
      pendingOAuth?.reject(new Error(message));
      pendingOAuth = undefined;
      sendHtml(HTML_ERROR(message), 400);
      return;
    }

    if (!pendingOAuth || state !== pendingOAuth.state) {
      const message = "Invalid state - potential CSRF attack";
      pendingOAuth?.reject(new Error(message));
      pendingOAuth = undefined;
      sendHtml(HTML_ERROR(message), 400);
      return;
    }

    const current = pendingOAuth;
    pendingOAuth = undefined;
    exchangeCodeForTokens(code, `http://localhost:${OAUTH_PORT}${CALLBACK_PATH}`, current.pkce)
      .then((tokens) => current.resolve(tokens))
      .catch((err) => current.reject(err as Error));

    sendHtml(HTML_SUCCESS);
  });

  try {
    await new Promise<void>((resolve, reject) => {
      oauthServer?.once("error", reject);
      oauthServer?.listen(OAUTH_PORT, "127.0.0.1", () => {
        oauthServer?.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    oauthServer?.close();
    oauthServer = undefined;
    throw error;
  }

  return { redirectUri: `http://localhost:${OAUTH_PORT}${CALLBACK_PATH}` };
}

function stopOAuthServer() {
  if (oauthServer) {
    oauthServer.close();
    oauthServer = undefined;
  }
}

function waitForOAuthCallback(pkce: PkceCodes, state: string): Promise<TokenResponse> {
  if (pendingOAuth) {
    throw new Error("Codex authorization is already in progress");
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingOAuth) {
        pendingOAuth = undefined;
        reject(new Error("OAuth callback timeout - authorization took too long"));
      }
    }, OAUTH_TIMEOUT_MS);

    pendingOAuth = {
      pkce,
      state,
      resolve: (tokens) => {
        clearTimeout(timeout);
        resolve(tokens);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    };
  });
}

function maybeOpenBrowser(url: string) {
  try {
    if (process.platform === "darwin") {
      const child = spawn("open", [url], { detached: true, stdio: "ignore" });
      child.unref();
      return;
    }

    if (process.platform === "win32") {
      const child = spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return;
    }

    const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    child.unref();
  } catch {
    // Ignore open errors; caller still gets authUrl to open manually.
  }
}

export async function startCodexOAuth(): Promise<{
  authUrl: string;
  waitForCallback: () => Promise<CodexCredentials>;
}> {
  if (pendingOAuth) {
    throw new Error("Codex authorization is already in progress");
  }

  const { redirectUri } = await startOAuthServer();
  const pkce = await generatePKCE();
  const state = generateState();
  const authUrl = buildAuthorizeUrl(redirectUri, pkce, state);
  maybeOpenBrowser(authUrl);

  return {
    authUrl,
    waitForCallback: async () => {
      try {
        const tokens = await waitForOAuthCallback(pkce, state);
        const accountId = extractAccountId(tokens);
        if (!accountId) {
          throw new Error("Could not determine ChatGPT account ID from OAuth token");
        }

        const credentials: CodexCredentials = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accountId,
          expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
        };
        saveCredentials(credentials);
        return credentials;
      } finally {
        stopOAuthServer();
      }
    },
  };
}

export async function getCodexTokens(): Promise<{ accessToken: string; accountId: string }> {
  const credentials = readCredentials();
  if (!credentials) {
    throw new Error("Codex is not authenticated");
  }

  const needsRefresh = credentials.expiresAt <= Date.now() + REFRESH_BUFFER_MS;
  if (!needsRefresh) {
    return { accessToken: credentials.accessToken, accountId: credentials.accountId };
  }

  const refreshed = await refreshAccessToken(credentials.refreshToken);
  const nextAccountId = extractAccountId(refreshed) || credentials.accountId;
  const nextCredentials: CodexCredentials = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || credentials.refreshToken,
    accountId: nextAccountId,
    expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
  };
  saveCredentials(nextCredentials);

  return { accessToken: nextCredentials.accessToken, accountId: nextCredentials.accountId };
}

export async function getCodexStatus(): Promise<{ authenticated: boolean }> {
  const credentials = readCredentials();
  if (!credentials) {
    return { authenticated: false };
  }

  if (credentials.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return { authenticated: true };
  }

  try {
    await getCodexTokens();
    return { authenticated: true };
  } catch {
    return { authenticated: false };
  }
}

export async function codexFetch(body: string): Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}> {
  const { accessToken, accountId } = await getCodexTokens();

  const response = await fetch(CODEX_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "ChatGPT-Account-Id": accountId,
      originator: "ama",
      Accept: "text/event-stream",
    },
    body,
  });

  const text = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    headers,
    body: text,
  };
}

export async function codexLogout(): Promise<void> {
  pendingOAuth = undefined;
  stopOAuthServer();
  if (fs.existsSync(CREDENTIALS_PATH)) {
    fs.unlinkSync(CREDENTIALS_PATH);
  }
}
