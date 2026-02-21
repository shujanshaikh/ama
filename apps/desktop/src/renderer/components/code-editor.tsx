import { useCallback, useRef } from "react";
import {
  ArrowLeftIcon,
  RefreshCwIcon,
} from "lucide-react";

interface CodeEditorProps {
  editorUrl?: string;
  onReturnToChat: () => void;
}

export function CodeEditor({
  editorUrl = "http://localhost:8081",
  onReturnToChat,
}: CodeEditorProps) {
  const editorIframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = useCallback(() => {
    const iframe = editorIframeRef.current;
    if (iframe) {
      const src = iframe.src;
      iframe.src = "";
      iframe.src = src;
    }
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="drag-region flex h-10 shrink-0 items-center gap-2 px-3">
        <button
          onClick={onReturnToChat}
          className="no-drag flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Chat</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={handleRefresh}
          className="no-drag rounded p-1 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <RefreshCwIcon className="size-3.5" />
        </button>
      </div>

      <div className="relative flex-1 bg-[#1e1e1e]">
        <iframe
          ref={editorIframeRef}
          className="absolute inset-0 size-full border-0"
          allow="clipboard-read; clipboard-write"
          src={editorUrl}
          title="Code Editor"
        />
      </div>
    </div>
  );
}
