import { useEffect } from "react";
import { AppRouter } from "./router";

// ElectronAPI type is declared in electron.d.ts

export function App() {
  // Listen for navigation events from main process (menu shortcuts)
  useEffect(() => {
    const handleNavigate = (_event: any, path: string) => {
      window.history.pushState(null, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    // @ts-ignore - ipcRenderer events via preload
    window.electronAPI?.daemon?.onStatusChange?.(() => {});

    return () => {};
  }, []);

  return <AppRouter />;
}
