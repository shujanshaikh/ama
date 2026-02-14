import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  auth: {
    signIn: () => ipcRenderer.invoke("auth:sign-in"),
    signOut: () => ipcRenderer.invoke("auth:sign-out"),
    getUser: () => ipcRenderer.invoke("auth:get-user"),
    getAccessToken: () => ipcRenderer.invoke("auth:get-access-token"),
    onAuthChange: (callback: (data: { user: any }) => void) => {
      const listener = (_event: any, data: { user: any }) => callback(data);
      ipcRenderer.on("auth:on-auth-change", listener);
      return () => ipcRenderer.removeListener("auth:on-auth-change", listener);
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
