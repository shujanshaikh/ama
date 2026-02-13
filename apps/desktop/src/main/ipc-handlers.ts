import { ipcMain } from "electron";
import { discoverProjects, selectFolder } from "./project-discovery";
import { getContext } from "./daemon/get-files";
import { getDaemonStatus } from "./daemon/connection";
import { isCodeServerRunning } from "./daemon/code-server";

export function registerIpcHandlers(): void {
  // Projects
  ipcMain.handle("projects:discover", async () => {
    return discoverProjects();
  });

  ipcMain.handle("projects:select-folder", async () => {
    return selectFolder();
  });

  ipcMain.handle("projects:get-context", (_event, cwd: string) => {
    return getContext(cwd);
  });

  // Daemon
  ipcMain.handle("daemon:status", () => {
    return getDaemonStatus();
  });

  // Code server
  ipcMain.handle("code-server:status", () => {
    return { running: isCodeServerRunning() };
  });
}
