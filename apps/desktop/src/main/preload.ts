import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  auth: {
    signIn: () => ipcRenderer.invoke("auth:sign-in"),
    signOut: () => ipcRenderer.invoke("auth:sign-out"),
    getSession: () => ipcRenderer.invoke("auth:get-session"),
    onAuthStateChange: (cb: (_event: any, data: any) => void) => {
      ipcRenderer.on("auth:state-changed", cb);
      return () => ipcRenderer.removeListener("auth:state-changed", cb);
    },
  },
  projects: {
    discover: () => ipcRenderer.invoke("projects:discover"),
    selectFolder: () => ipcRenderer.invoke("projects:select-folder"),
    getContext: (cwd: string) => ipcRenderer.invoke("projects:get-context", cwd),
  },
  daemon: {
    getStatus: () => ipcRenderer.invoke("daemon:status"),
    onStatusChange: (cb: (_event: any, data: any) => void) => {
      ipcRenderer.on("daemon:status-changed", cb);
      return () => ipcRenderer.removeListener("daemon:status-changed", cb);
    },
  },
  platform: process.platform,
});
