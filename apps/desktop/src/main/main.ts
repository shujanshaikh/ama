import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getWindowState, trackWindowState } from "./window-state";
import { setupMenu } from "./menu";
import { registerIpcHandlers } from "./ipc-handlers";
import {
  registerProtocol,
  extractCallbackCode,
  setupAuthIpcHandlers,
  notifyAuthChange,
  handleCallback,
  getUser,
} from "./auth";
import { syncAuthTokens } from "./cli-manager";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let pendingDeepLinkUrl: string | null = null;

const APP_PROTOCOL_PREFIX = "ama://";

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

// Register protocol before app is ready
registerProtocol();

// Must register open-url at module level — macOS fires it before app.whenReady()
app.on("open-url", (event, url) => {
  event.preventDefault();
  if (url.startsWith(APP_PROTOCOL_PREFIX)) {
    if (mainWindow) {
      void processDeepLink(url);
    } else {
      pendingDeepLinkUrl = url;
    }
  }
});

// Linux: second instance passes URL via argv
app.on("second-instance", (_event, argv) => {
  const deepLinkUrl = argv.find((arg) => arg.startsWith(APP_PROTOCOL_PREFIX));
  if (deepLinkUrl) {
    if (mainWindow) {
      void processDeepLink(deepLinkUrl);
    } else {
      pendingDeepLinkUrl = deepLinkUrl;
    }
  }

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

async function processDeepLink(url: string): Promise<void> {
  const code = extractCallbackCode(url);
  if (!code) {
    console.warn("[auth] Ignored deep link:", url);
    return;
  }

  try {
    const user = await handleCallback(code);
    if (mainWindow) {
      notifyAuthChange(mainWindow, user);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    syncAuthTokens();
  } catch (error) {
    console.error("[auth] Callback failed:", error);
  }
}

function createWindow(): BrowserWindow {
  const state = getWindowState();
  const isMac = process.platform === "darwin";

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    ...(isMac ? { trafficLightPosition: { x: 16, y: 16 } } : {}),
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.resolve(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (state.isMaximized) {
    win.maximize();
  }

  trackWindowState(win);

  win.once("ready-to-show", () => {
    win.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  win.on("closed", () => {
    mainWindow = null;
  });

  return win;
}

app.whenReady().then(async () => {
  mainWindow = createWindow();

  setupAuthIpcHandlers(mainWindow);
  registerIpcHandlers();
  setupMenu(() => mainWindow);

  // Process any deep link that arrived before the window was created
  if (pendingDeepLinkUrl) {
    const url = pendingDeepLinkUrl;
    pendingDeepLinkUrl = null;
    void processDeepLink(url);
  }

  // Restore session if already authenticated
  try {
    const user = await getUser();
    if (user) {
      mainWindow.webContents.once("did-finish-load", () => {
        if (mainWindow) {
          notifyAuthChange(mainWindow, user);
        }
      });
      syncAuthTokens();
    }
  } catch (error) {
    console.error("Failed to get initial auth state:", error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

