import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon, XIcon, GlobeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const injectScript = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const script = iframe.contentDocument.createElement("script");
    script.src = "//unpkg.com/react-grab/dist/index.global.js";
    script.crossOrigin = "anonymous";

    script.onload = () => {
      console.log(
        "Injected into iframe",
        (iframe.contentWindow as any).ReactGrab
      );
    };

    iframe.contentDocument.head.appendChild(script);
  };

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
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm px-6">
            <form onSubmit={handleInitialUrlSubmit} className="space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                  <GlobeIcon className="size-4" />
                </div>
                <input
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="w-full h-10 pl-10 pr-4 text-sm bg-muted/30 border border-border/50 rounded-lg placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-full h-9 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Load Preview
              </button>
            </form>
            <p className="text-[11px] text-muted-foreground/50 text-center mt-3">
              Enter your local development server URL
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WebPreview
      defaultUrl={url}
      onLoad={injectScript}
      className="h-full border-0 rounded-none bg-transparent"
      defaultCollapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      onUrlChange={handleUrlChange}
      ref={iframeRef}
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
        <WebPreviewNavigationButton
          tooltip="Close preview"
          onClick={handleClose}
        >
          <XIcon className="size-4" />
        </WebPreviewNavigationButton>
      </WebPreviewNavigation>
      <WebPreviewBody />
    </WebPreview>
  );
}

