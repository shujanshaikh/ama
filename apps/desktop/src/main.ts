import { app, BrowserWindow } from "electron";
import path from "node:path";
import { getAppUrl } from "./constants.js";
import { getWindowState, trackWindowState } from "./window-state.js";
import { setupNavigationGuard } from "./navigation.js";
import { setupMenu } from "./menu.js";
import { authenticateFromCLI } from "./auth.js";

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
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
      preload: path.join(import.meta.dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  trackWindowState(mainWindow);
  setupNavigationGuard(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Authenticate using ~/.amai credentials before loading the app.
  // net.fetch shares the Electron session cookie store, so the
  // wos-session cookie set by the server will be available to the
  // BrowserWindow when it loads the app URL.
  const appUrl = getAppUrl();
  await authenticateFromCLI(appUrl);

  mainWindow.loadURL(`${appUrl}/dashboard`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupMenu(() => mainWindow);
  createWindow();

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
