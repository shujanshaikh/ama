import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon } from "lucide-react";
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
  
  // Initialize from localStorage synchronously
  const getInitialUrl = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) || "";
    }
    return "";
  };

  const [url, setUrl] = useState<string>(getInitialUrl);
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
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: storageKey }));
    }
  };

  const handleInitialUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inputUrl = (formData.get("url") as string)?.trim() || "";
    if (inputUrl) {
      handleUrlChange(inputUrl);
    }
  };

  // Show initial input prompt when no URL is set (only after initialization to avoid hydration issues)
  if (isInitialized && !url) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Enter Preview URL</h3>
            <p className="text-sm text-muted-foreground">
              Enter the URL you want to preview (e.g., http://localhost:3000)
            </p>
          </div>
          <form onSubmit={handleInitialUrlSubmit} className="space-y-2">
            <Input
              name="url"
              type="url"
              placeholder="http://localhost:3000"
              className="w-full"
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
      </WebPreviewNavigation>
      <WebPreviewBody />
    </WebPreview>
  );
}

