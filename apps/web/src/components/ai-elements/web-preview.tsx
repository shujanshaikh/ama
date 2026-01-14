"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, GlobeIcon, LockIcon, XIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type WebPreviewContextValue = {
  url: string;
  setUrl: (url: string) => void;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null);

const useWebPreview = () => {
  const context = useContext(WebPreviewContext);
  if (!context) {
    throw new Error("WebPreview components must be used within a WebPreview");
  }
  return context;
};

export type WebPreviewProps = ComponentProps<"div"> & {
  defaultUrl?: string;
  onUrlChange?: (url: string) => void;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export const WebPreview = ({
  className,
  children,
  defaultUrl = "",
  onUrlChange,
  defaultCollapsed = false,
  onCollapsedChange,
  ...props
}: WebPreviewProps) => {
  const [url, setUrl] = useState(defaultUrl);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    onUrlChange?.(newUrl);
  };

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    onCollapsedChange?.(value);
  };

  const contextValue: WebPreviewContextValue = {
    url,
    setUrl: handleUrlChange,
    consoleOpen,
    setConsoleOpen,
    collapsed,
    setCollapsed,
  };

  return (
    <WebPreviewContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  );
};

export type WebPreviewNavigationProps = ComponentProps<"div">;

export const WebPreviewNavigation = ({
  className,
  children,
  ...props
}: WebPreviewNavigationProps) => {
  const { setCollapsed } = useWebPreview();

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2.5",
        className
      )}
      {...props}
    >
      {children}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto size-7 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setCollapsed(true)}
            >
              <XIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Close preview
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export type WebPreviewNavigationButtonProps = ComponentProps<typeof Button> & {
  tooltip?: string;
};

export const WebPreviewNavigationButton = ({
  onClick,
  disabled,
  tooltip,
  children,
  className,
  ...props
}: WebPreviewNavigationButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "size-7 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
            className
          )}
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="ghost"
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export type WebPreviewUrlProps = ComponentProps<typeof Input>;

export const WebPreviewUrl = ({
  value,
  onChange,
  onKeyDown,
  className,
  ...props
}: WebPreviewUrlProps) => {
  const { url, setUrl } = useWebPreview();
  const [inputValue, setInputValue] = useState(url);

  useEffect(() => {
    setInputValue(url);
  }, [url]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    onChange?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const target = event.target as HTMLInputElement;
      setUrl(target.value);
    }
    onKeyDown?.(event);
  };

  const isSecure = (value ?? inputValue)?.toString().startsWith("https://");

  return (
    <div className="relative flex flex-1 items-center">
      <div className="pointer-events-none absolute left-2.5 flex items-center text-muted-foreground">
        {isSecure ? (
          <LockIcon className="size-3.5" />
        ) : (
          <GlobeIcon className="size-3.5" />
        )}
      </div>
      <Input
        className={cn(
          "h-8 flex-1 rounded-lg border-transparent bg-background pl-8 text-xs shadow-sm transition-all placeholder:text-muted-foreground/60 focus:border-border focus:ring-1 focus:ring-ring/20",
          className
        )}
        onChange={onChange ?? handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter URL..."
        value={value ?? inputValue}
        {...props}
      />
    </div>
  );
};

export type WebPreviewBodyProps = ComponentProps<"iframe"> & {
  loading?: ReactNode;
};

export const WebPreviewBody = ({
  className,
  loading,
  src,
  ...props
}: WebPreviewBodyProps) => {
  const { url } = useWebPreview();

  return (
    <div className="relative flex-1 bg-white">
      <iframe
        className={cn("size-full", className)}
        allow="clipboard-read; clipboard-write; cookies; storage"
        src={(src ?? url) || undefined}
        title="Preview"
        {...props}
      />
      {loading}
    </div>
  );
};

export type WebPreviewConsoleProps = ComponentProps<"div"> & {
  logs?: Array<{
    level: "log" | "warn" | "error";
    message: string;
    timestamp: Date;
  }>;
};

export const WebPreviewConsole = ({
  className,
  logs = [],
  children,
  ...props
}: WebPreviewConsoleProps) => {
  const { consoleOpen, setConsoleOpen } = useWebPreview();

  return (
    <Collapsible
      className={cn("border-t border-border/50 bg-muted/20 font-mono text-sm", className)}
      onOpenChange={setConsoleOpen}
      open={consoleOpen}
      {...props}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="flex h-9 w-full items-center justify-between rounded-none px-3 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          variant="ghost"
        >
          <span className="flex items-center gap-2">
            Console
            {logs.length > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                {logs.length}
              </span>
            )}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform duration-200",
              consoleOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "px-3 pb-3",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in"
        )}
      >
        <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md bg-background/50 p-2">
          {logs.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground/60">No console output</p>
          ) : (
            logs.map((log, index) => (
              <div
                className={cn(
                  "rounded px-2 py-1 text-[11px] leading-relaxed",
                  log.level === "error" && "bg-destructive/10 text-destructive",
                  log.level === "warn" && "bg-yellow-500/10 text-yellow-600",
                  log.level === "log" && "text-foreground/80"
                )}
                key={`${log.timestamp.getTime()}-${index}`}
              >
                <span className="mr-2 text-muted-foreground/60">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                {log.message}
              </div>
            ))
          )}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
