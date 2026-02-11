import { createHmac } from "node:crypto";

type GatewayAuthPayload = {
  uid: string;
  exp: number;
};

function getGatewayAuthSecret(): string | null {
  return process.env.GATEWAY_AUTH_SECRET || process.env.WORKOS_COOKIE_PASSWORD || null;
}

function sign(payloadBase64Url: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url");
}

export function createGatewayAuthToken(
  userId: string,
  ttlSeconds = 60 * 60,
): string | null {
  const secret = getGatewayAuthSecret();
  if (!secret) return null;

  const payload: GatewayAuthPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const payloadBase64Url = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(payloadBase64Url, secret);
  return `${payloadBase64Url}.${signature}`;
}

export function verifyGatewayAuthToken(token: string): string | null {
  const secret = getGatewayAuthSecret();
  if (!secret) return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadBase64Url = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const expectedSignature = sign(payloadBase64Url, secret);
  if (signature !== expectedSignature) return null;

  try {
    const payload: GatewayAuthPayload = JSON.parse(
      Buffer.from(payloadBase64Url, "base64url").toString("utf8"),
    );

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload.uid || null;
  } catch {
    return null;
  }
}

