import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  GlobeIcon,
} from "lucide-react";

interface CodeEditorProps {
  editorUrl?: string;
  webUrl?: string;
  onReturnToChat: () => void;
  projectId?: string;
}

const STORAGE_KEY_PREFIX = "ama-desktop-preview-url";

function getStorageKey(projectId?: string): string {
  return projectId ? `${STORAGE_KEY_PREFIX}-${projectId}` : STORAGE_KEY_PREFIX;
}

export function CodeEditor({
  editorUrl = "http://localhost:8081",
  webUrl = "http://localhost:3000",
  onReturnToChat,
  projectId,
}: CodeEditorProps) {
  const storageKey = getStorageKey(projectId);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [previewUrl, setPreviewUrl] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });
  const editorIframeRef = useRef<HTMLIFrameElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (previewUrl) {
      try {
        localStorage.setItem(storageKey, previewUrl);
      } catch {}
    }
  }, [previewUrl, storageKey]);

  const handleRefresh = useCallback(() => {
    const iframe =
      activeTab === "editor"
        ? editorIframeRef.current
        : previewIframeRef.current;
    if (iframe) {
      const src = iframe.src;
      iframe.src = "";
      iframe.src = src;
    }
  }, [activeTab]);

  const handlePreviewUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const value = urlInputRef.current?.value?.trim();
      if (value) {
        setPreviewUrl(value);
      }
    },
    [],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="drag-region flex h-10 shrink-0 items-center gap-2 px-3">
        <button
          onClick={onReturnToChat}
          className="no-drag flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Chat</span>
        </button>

        <div className="no-drag flex items-center gap-0.5 rounded-md bg-secondary/40 p-0.5">
          <button
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === "editor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("editor")}
          >
            Editor
          </button>
          <button
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </button>
        </div>

        <div className="flex-1" />

        {activeTab === "preview" && (
          <form onSubmit={handlePreviewUrlSubmit} className="no-drag flex items-center gap-1.5">
            <GlobeIcon className="size-3 text-muted-foreground/50" />
            <Input
              ref={urlInputRef}
              type="url"
              placeholder="http://localhost:3000"
              defaultValue={previewUrl}
              className="h-6 w-48 border-border/30 bg-secondary/30 text-xs focus:border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) setPreviewUrl(value);
                }
              }}
            />
          </form>
        )}

        <button
          onClick={handleRefresh}
          className="no-drag rounded p-1 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <RefreshCwIcon className="size-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="relative flex-1 bg-[#1e1e1e]">
        {activeTab === "preview" && !previewUrl ? (
          <div className="flex h-full items-center justify-center bg-secondary/10 p-8">
            <div className="w-full max-w-sm space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-sm font-medium text-foreground">
                  Enter Preview URL
                </h3>
                <p className="text-xs text-muted-foreground">
                  Enter the URL you want to preview
                </p>
              </div>
              <form onSubmit={handlePreviewUrlSubmit} className="space-y-2">
                <Input
                  ref={urlInputRef}
                  name="url"
                  type="url"
                  placeholder="http://localhost:3000"
                  className="h-9 w-full bg-background text-sm"
                  autoFocus
                />
                <Button type="submit" size="sm" className="w-full">
                  Load Preview
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <>
            <iframe
              ref={editorIframeRef}
              className={cn(
                "absolute inset-0 size-full border-0",
                activeTab !== "editor" && "invisible",
              )}
              allow="clipboard-read; clipboard-write"
              src={editorUrl}
              title="Code Editor"
            />
            <iframe
              ref={previewIframeRef}
              className={cn(
                "absolute inset-0 size-full border-0",
                activeTab !== "preview" && "invisible",
              )}
              allow="clipboard-read; clipboard-write"
              src={previewUrl || webUrl}
              title="Web Preview"
            />
          </>
        )}
      </div>
    </div>
  );
}
