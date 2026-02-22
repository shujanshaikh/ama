import type { WorkerBindings } from "@/env";

type GatewayAuthPayload = {
  uid: string;
  exp: number;
};

function getGatewayAuthSecret(env: WorkerBindings): string | null {
  return env.GATEWAY_AUTH_SECRET || env.WORKOS_COOKIE_PASSWORD || null;
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(payloadBase64Url: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadBase64Url));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyGatewayAuthToken(token: string, env: WorkerBindings): Promise<string | null> {
  const secret = getGatewayAuthSecret(env);
  if (!secret) return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadBase64Url = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const expectedSignature = await sign(payloadBase64Url, secret);
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadBase64Url))) as GatewayAuthPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.uid || null;
  } catch {
    return null;
  }
}
