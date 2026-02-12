import { shell } from "electron";
import type { BrowserWindow } from "electron";
import { ALLOWED_EXTERNAL_DOMAINS, getAppUrl } from "./constants.js";

function isAllowedNavigation(url: string): boolean {
  try {
    const parsed = new URL(url);
    const appUrl = new URL(getAppUrl());

    // Allow all same-origin navigation (auth redirects, dashboard, chat, etc.)
    if (parsed.origin === appUrl.origin) {
      return true;
    }

    // Allow external auth domains (WorkOS + Google OAuth)
    return ALLOWED_EXTERNAL_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export function setupNavigationGuard(win: BrowserWindow): void {
  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in system browser
    shell.openExternal(url);
    return { action: "deny" };
  });
}
