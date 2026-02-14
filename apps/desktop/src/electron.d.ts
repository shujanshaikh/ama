declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        preload?: string;
        partition?: string;
        allowpopups?: boolean;
        nodeintegration?: boolean;
        disablewebsecurity?: boolean;
      },
      HTMLElement
    >;
  }
}

interface ElectronAPI {
  auth: {
    signIn: () => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<{ success: boolean; error?: string }>;
    getUser: () => Promise<any | null>;
    getAccessToken: () => Promise<string | null>;
    onAuthChange: (callback: (data: { user: any }) => void) => () => void;
  };
  projects: {
    discover: () => Promise<any[]>;
    selectFolder: () => Promise<string | null>;
    getContext: (cwd: string) => Promise<any>;
  };
  daemon: {
    getStatus: () => Promise<{ connected: boolean; reconnectAttempts: number }>;
    onStatusChange: (cb: (_event: any, data: any) => void) => () => void;
  };
  platform: string;
}

declare interface Window {
  electronAPI: ElectronAPI;
}
