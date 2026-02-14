export const DEV_URL = "http://localhost:3001";

export const PRODUCTION_URL =
  process.env.AMA_APP_URL ?? "https://ama.shujan.xyz";

export const ALLOWED_PATH_PREFIXES = [
  "/dashboard",
  "/chat/",
  "/api/auth/callback",
  "/api/auth/desktop-start",
  "/api/trpc",
];

export const ALLOWED_EXTERNAL_DOMAINS = [
  "workos.com",
  "authkit.app",
  "accounts.google.com",
  "googleapis.com",
  "google.com",
];

import { app } from "electron";

export function getAppUrl(): string {
  return !app.isPackaged ? DEV_URL : PRODUCTION_URL;
}
