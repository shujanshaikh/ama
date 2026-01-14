import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon, XIcon, GlobeIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export type PreviewIframeProps = {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  projectId?: string;
};

const STORAGE_KEY_PREFIX = "ama-web-preview-url";
const STORAGE_EVENT_NAME = "ama-web-preview-url-changed";

function getStorageKey(projectId?: string): string {
  return projectId ? `${STORAGE_KEY_PREFIX}-${projectId}` : STORAGE_KEY_PREFIX;
}

export function PreviewIframe({ collapsed, onCollapsedChange, projectId }: PreviewIframeProps) {
  const storageKey = getStorageKey(projectId);

  const getInitialUrl = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) || "";
    }
    return "";
  };

  const [url, setUrl] = useState<string>(getInitialUrl);
  const [inputValue, setInputValue] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: CustomEvent<string>) => {
      if (e.detail === storageKey) {
        const newUrl = localStorage.getItem(storageKey) || "";
        setUrl(newUrl);
      }
    };

    window.addEventListener(STORAGE_EVENT_NAME as any, handleStorageChange as EventListener);
    return () => {
      window.removeEventListener(STORAGE_EVENT_NAME as any, handleStorageChange as EventListener);
    };
  }, [storageKey]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (newUrl) {
      localStorage.setItem(storageKey, newUrl);
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: storageKey }));
    }
  };

  const handleInitialUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUrl = inputValue.trim();
    if (trimmedUrl) {
      handleUrlChange(trimmedUrl);
    }
  };

  const handleClose = () => {
    onCollapsedChange?.(true);
  };

  if (isInitialized && !url) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-end px-3 py-2 border-b border-border/30">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <form onSubmit={handleInitialUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Enter Preview URL</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your local development server URL
                </p>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors">
                  <GlobeIcon className="size-5" />
                </div>
                <Input
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full h-12 pl-12 pr-4 text-sm bg-muted/40 border border-border/40 rounded-xl placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 focus:border-primary/60 focus:bg-muted/50 transition-all"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-full h-11 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Load Preview
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WebPreview
      defaultUrl={url}
      className="h-full border-0 rounded-none bg-transparent"
      defaultCollapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      onUrlChange={handleUrlChange}
    >
      <WebPreviewNavigation>
        <WebPreviewNavigationButton
          tooltip="Go back"
          onClick={() => {
            const iframe = document.querySelector("iframe");
            iframe?.contentWindow?.history.back();
          }}
        >
          <ArrowLeftIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton
          tooltip="Go forward"
          onClick={() => {
            const iframe = document.querySelector("iframe");
            iframe?.contentWindow?.history.forward();
          }}
        >
          <ArrowRightIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton
          tooltip="Refresh"
          onClick={() => {
            const iframe = document.querySelector("iframe");
            iframe?.contentWindow?.location.reload();
          }}
        >
          <RefreshCwIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewUrl placeholder="Enter localhost URL (e.g., http://localhost:3000)" />
      </WebPreviewNavigation>
      <WebPreviewBody />
    </WebPreview>
  );
}

