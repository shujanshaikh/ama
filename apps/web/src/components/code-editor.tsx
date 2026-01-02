import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, CodeIcon, GlobeIcon, RefreshCwIcon, XIcon } from "lucide-react";
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

  const currentUrl = activeTab === "editor" ? editorUrl : (previewUrl || webUrl);

  const handlePreviewUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inputUrl = (formData.get("url") as string)?.trim() || "";
    if (inputUrl) {
      setPreviewUrl(inputUrl);
    }
  };

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
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 pl-12 pr-3 py-2.5">
          {onReturnToChat && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={onReturnToChat}
                  >
                    <ArrowLeftIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Return to chat
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {onReturnToChat && (
            <div className="h-4 w-px bg-border/50" />
          )}


          <div className="flex items-center rounded-lg bg-muted/50 p-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 rounded-md px-3 text-xs font-medium transition-all",
                      activeTab === "editor"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveTab("editor")}
                  >
                    <CodeIcon className="mr-1.5 size-3.5" />
                    Editor
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Code Editor
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 rounded-md px-3 text-xs font-medium transition-all",
                      activeTab === "web"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveTab("web")}
                  >
                    <GlobeIcon className="mr-1.5 size-3.5" />
                    Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Web Preview
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex-1" />

          {activeTab === "web" && (
            <div className="flex items-center gap-2 px-2">
              <Input
                type="url"
                placeholder="Enter URL (e.g., http://localhost:3000)"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                className="h-7 w-64 bg-background text-xs"
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
            </div>
          )}

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      const iframe = document.querySelector<HTMLIFrameElement>("#code-editor-iframe");
                      iframe?.contentWindow?.location.reload();
                    }}
                  >
                    <RefreshCwIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Refresh
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setCollapsed(true)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Close
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
            <iframe
              id="code-editor-iframe"
              className="size-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-modals"
              src={currentUrl}
              title={activeTab === "editor" ? "Code Editor" : "Web Preview"}
            />
          )}
        </div>

        {children}
      </div>
    </CodeEditorContext.Provider>
  );
}

export { useCodeEditor };