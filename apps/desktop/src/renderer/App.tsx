import { useEffect } from "react";
import { AppRouter } from "./router";

// Declare the electronAPI type
declare global {
  interface Window {
    electronAPI: {
      auth: {
        signIn: () => Promise<{ success: boolean }>;
        signOut: () => Promise<{ success: boolean }>;
        getSession: () => Promise<any>;
        onAuthStateChange: (cb: (event: any, data: any) => void) => () => void;
      };
      projects: {
        discover: () => Promise<
          Array<{ name: string; path: string; ide: string }>
        >;
        selectFolder: () => Promise<string | null>;
        getContext: (cwd: string) => Promise<string[]>;
      };
      daemon: {
        getStatus: () => Promise<{ connected: boolean; reconnectAttempts: number }>;
        onStatusChange: (cb: (event: any, data: any) => void) => () => void;
      };
      platform: string;
    };
  }
}

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
