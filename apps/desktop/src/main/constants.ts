export const DEV_WEB_URL = "http://localhost:3001";
export const PRODUCTION_WEB_URL = "https://ama.shujan.xyz";

export const DEV_SERVER_URL = "http://localhost:3000";
export const PRODUCTION_SERVER_URL = "https://bridge.ama.shujan.xyz";

export const DEV_WS_URL = "ws://localhost:3000";
export const PRODUCTION_WS_URL = "wss://bridge.ama.shujan.xyz";

const isDev = process.env.NODE_ENV !== "production";

export function getWebUrl(): string {
  return isDev ? DEV_WEB_URL : PRODUCTION_WEB_URL;
}

export function getServerUrl(): string {
  return isDev ? DEV_SERVER_URL : PRODUCTION_SERVER_URL;
}

export function getWsUrl(): string {
  return isDev ? DEV_WS_URL : PRODUCTION_WS_URL;
}
