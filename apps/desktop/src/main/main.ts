import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getWindowState, trackWindowState } from "./window-state";
import { setupMenu } from "./menu";
import { registerIpcHandlers } from "./ipc-handlers";
import { setAuthChangeCallback, getSession } from "./auth";
import { connectDaemon, disconnectDaemon } from "./daemon/connection";
import { ensureCodeServerRunning, stopCodeServer } from "./daemon/code-server";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const state = getWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.resolve(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  trackWindowState(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Load renderer
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Notify renderer of auth changes and reconnect daemon
setAuthChangeCallback((user) => {
  if (mainWindow) {
    mainWindow.webContents.send("auth:state-changed", user ? getSession() : null);
  }
  if (user) {
    connectDaemon();
    ensureCodeServerRunning().catch(console.error);
  } else {
    disconnectDaemon();
    stopCodeServer();
  }
});

app.whenReady().then(() => {
  registerIpcHandlers();
  setupMenu(() => mainWindow);
  createWindow();

  // Connect daemon and start code-server if already authenticated
  const session = getSession();
  if (session) {
    connectDaemon();
    ensureCodeServerRunning().catch(console.error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  disconnectDaemon();
  stopCodeServer();
});
