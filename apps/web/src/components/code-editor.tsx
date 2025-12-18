import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, CodeIcon, GlobeIcon, RefreshCwIcon, XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, useContext, useState } from "react";

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
};

export function CodeEditor({
  className,
  children,
  defaultTab = "editor",
  onTabChange,
  defaultCollapsed = false,
  onCollapsedChange,
  editorUrl = "http://localhost:8081",
  webUrl = "http://localhost:3003",
  onReturnToChat,
  ...props
}: CodeEditorProps) {
  const [activeTab, setActiveTabState] = useState<"editor" | "web">(defaultTab);
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const currentUrl = activeTab === "editor" ? editorUrl : webUrl;

  const { state: sidebarState } = useSidebar();
  const isSidebarCollapsed = sidebarState === "collapsed";

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
        <div className={cn(
          "flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2.5",
          isSidebarCollapsed && "pl-16"
        )}>
          {onReturnToChat && !isSidebarCollapsed && (
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

          {onReturnToChat && !isSidebarCollapsed && (
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
          <iframe
            id="code-editor-iframe"
            className="size-full"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-modals"
            src={currentUrl}
            title={activeTab === "editor" ? "Code Editor" : "Web Preview"}
          />
        </div>

        {children}
      </div>
    </CodeEditorContext.Provider>
  );
}

export { useCodeEditor };