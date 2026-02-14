import { ipcMain } from "electron";
import { discoverProjects, selectFolder } from "./project-discovery";
import { getContext } from "./get-files";
import { isCLIDaemonRunning } from "./cli-manager";

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
    return {
      connected: isCLIDaemonRunning(),
      reconnectAttempts: 0,
    };
  });
}
