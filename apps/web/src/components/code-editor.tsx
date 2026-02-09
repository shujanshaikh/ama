import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, PanelLeftIcon, RefreshCwIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, useContext, useEffect, useState } from "react";

// Context for editor state
export type CodeEditorContextValue = {
  activeTab: "editor" | "web";
  setActiveTab: (tab: "editor" | "web") => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
};

const CodeEditorContext = createContext<CodeEditorContextValue | null>(null);

const useCodeEditor = () => {
  const context = useContext(CodeEditorContext);
  if (!context) {
    throw new Error("CodeEditor components must be used within a CodeEditor");
  }
  return context;
};

export type CodeEditorProps = ComponentProps<"div"> & {
  defaultTab?: "editor" | "web";
  onTabChange?: (tab: "editor" | "web") => void;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  editorUrl?: string;
  webUrl?: string;
  onReturnToChat?: () => void;
  projectId?: string;
};

const STORAGE_KEY_PREFIX = "ama-web-preview-url";
const STORAGE_EVENT_NAME = "ama-web-preview-url-changed";

function getStorageKey(projectId?: string): string {
  return projectId ? `${STORAGE_KEY_PREFIX}-${projectId}` : STORAGE_KEY_PREFIX;
}

export function CodeEditor({
  className,
  children,
  defaultTab = "editor",
  onTabChange,
  defaultCollapsed = false,
  onCollapsedChange,
  editorUrl = "http://localhost:8081",
  webUrl = "http://localhost:3000",
  onReturnToChat,
  projectId,
  ...props
}: CodeEditorProps) {
  const storageKey = getStorageKey(projectId);

  // Initialize preview URL from localStorage
  const getInitialPreviewUrl = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      return saved || "";
    }
    return "";
  };

  const [activeTab, setActiveTabState] = useState<"editor" | "web">(defaultTab);
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(getInitialPreviewUrl);
  const [isInitialized, setIsInitialized] = useState(false);

  // Mark as initialized after mount to avoid hydration issues
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Listen for URL changes from other components
  useEffect(() => {
    const handleStorageChange = (e: CustomEvent<string>) => {
      if (e.detail === storageKey) {
        const newUrl = localStorage.getItem(storageKey) || "";
        setPreviewUrl(newUrl);
      }
    };

    window.addEventListener(STORAGE_EVENT_NAME as any, handleStorageChange as EventListener);
    return () => {
      window.removeEventListener(STORAGE_EVENT_NAME as any, handleStorageChange as EventListener);
    };
  }, [storageKey]);

  // Save preview URL to localStorage when it changes
  useEffect(() => {
    if (previewUrl) {
      localStorage.setItem(storageKey, previewUrl);
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: storageKey }));
    }
  }, [previewUrl, storageKey]);

  const setActiveTab = (tab: "editor" | "web") => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    onCollapsedChange?.(value);
  };

  const contextValue: CodeEditorContextValue = {
    activeTab,
    setActiveTab,
    collapsed,
    setCollapsed,
    isFullscreen,
    setIsFullscreen,
  };

  const handlePreviewUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inputUrl = (formData.get("url") as string)?.trim() || "";
    if (inputUrl) {
      setPreviewUrl(inputUrl);
    }
  };

  const { state: sidebarState, toggleSidebar } = useSidebar();

  return (
    <CodeEditorContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex size-full flex-col overflow-hidden border border-border/50 bg-background shadow-sm",
          isFullscreen && "fixed inset-0 z-50 rounded-none",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 border-b border-border/40 px-3 py-1.5">
          {sidebarState === "collapsed" && (
            <button
              onClick={toggleSidebar}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <PanelLeftIcon className="size-4" />
            </button>
          )}
          
          {onReturnToChat && (
            <button
              onClick={onReturnToChat}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                activeTab === "editor"
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("editor")}
            >
              Editor
            </button>
            <button
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                activeTab === "web"
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("web")}
            >
              Preview
            </button>
          </div>

          <div className="flex-1" />

          {activeTab === "web" && (
            <Input
              type="url"
              placeholder="URL"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="h-6 w-48 bg-transparent border-border/50 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const target = e.target as HTMLInputElement;
                  const value = target.value.trim();
                  if (value) {
                    setPreviewUrl(value);
                  }
                }
              }}
            />
          )}

                    <button
              className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              onClick={() => {
                const iframeId = activeTab === "editor" ? "#code-editor-iframe" : "#code-preview-iframe";
                const iframe = document.querySelector<HTMLIFrameElement>(iframeId);
                iframe?.contentWindow?.location.reload();
              }}
            >
              <RefreshCwIcon className="size-3.5" />
            </button>
        </div>

        <div className="relative flex-1 bg-[#1e1e1e]">
          {activeTab === "web" && isInitialized && !previewUrl ? (
            <div className="flex h-full items-center justify-center bg-muted/30 p-8">
              <div className="w-full max-w-md space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Enter Preview URL</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the URL you want to preview (e.g., http://localhost:3000)
                  </p>
                </div>
                <form onSubmit={handlePreviewUrlSubmit} className="space-y-2">
                  <Input
                    name="url"
                    type="url"
                    placeholder="http://localhost:3000"
                    className="w-full bg-background"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Load Preview
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <iframe
                id="code-editor-iframe"
                className={cn("absolute inset-0 size-full", activeTab !== "editor" && "invisible")}
                allow="clipboard-read; clipboard-write; cookies; storage"
                src={editorUrl}
                title="Code Editor"
              />
              <iframe
                id="code-preview-iframe"
                className={cn("absolute inset-0 size-full", activeTab !== "web" && "invisible")}
                allow="clipboard-read; clipboard-write; cookies; storage"
                src={previewUrl || webUrl}
                title="Web Preview"
              />
            </>
          )}
        </div>

        {children}
      </div>
    </CodeEditorContext.Provider>
  );
}

export { useCodeEditor };