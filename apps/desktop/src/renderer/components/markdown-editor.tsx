import { useState, memo } from "react";
import {
  FileText,
  Code,
  Eye,
  ChevronDown,
  ChevronUp,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Streamdown } from "streamdown";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  fileName?: string;
  content?: string;
  isStreaming?: boolean;
}

type ViewMode = "preview" | "source";

export const MarkdownEditor = memo(
  ({ fileName, content, isStreaming }: MarkdownEditorProps) => {
    const [viewMode, setViewMode] = useState<ViewMode>("preview");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const displayName = fileName?.split("/").pop() || "file.md";

    const ContentView = () =>
      content ? (
        viewMode === "preview" ? (
          <MarkdownPreview content={content} />
        ) : (
          <SourceView content={content} />
        )
      ) : (
        <div className="flex items-center justify-center py-6">
          <span className="text-sm text-muted-foreground animate-pulse">
            Generating...
          </span>
        </div>
      );

    return (
      <>
        <div className="mb-4 rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                {displayName}
              </span>
              {isStreaming && (
                <span className="text-[10px] text-muted-foreground animate-pulse">
                  Writing...
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <div className="flex items-center border border-border rounded-md overflow-hidden mr-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "h-6 px-2 rounded-none text-xs gap-1",
                    viewMode === "preview" && "bg-accent"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("source")}
                  className={cn(
                    "h-6 px-2 rounded-none text-xs gap-1",
                    viewMode === "source" && "bg-accent"
                  )}
                >
                  <Code className="w-3 h-3" />
                  Markdown
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(true)}
                className="h-6 w-6"
                title="Open in fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-6 w-6"
              >
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="max-h-72 overflow-y-auto">
                  <div className="p-4">
                    <ContentView />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{displayName}</span>
              </DialogTitle>
              <div className="flex items-center border border-border rounded-md overflow-hidden w-fit">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "h-7 px-3 rounded-none text-xs gap-1.5",
                    viewMode === "preview" && "bg-accent"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("source")}
                  className={cn(
                    "h-7 px-3 rounded-none text-xs gap-1.5",
                    viewMode === "source" && "bg-accent"
                  )}
                >
                  <Code className="w-3.5 h-3.5" />
                  Markdown
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto mt-4 pr-2">
              <ContentView />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

MarkdownEditor.displayName = "MarkdownEditor";

const MarkdownPreview = memo(({ content }: { content: string }) => {
  return (
    <Streamdown
      className={cn(
        "text-sm leading-relaxed",
        "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-border",
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_h2]:mt-4",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-2 [&_h3]:mt-3",
        "[&_p]:text-foreground/80 [&_p]:mb-2 [&_p]:leading-relaxed",
        "[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-1",
        "[&_li]:text-foreground/80",
        "[&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_pre]:text-xs",
        "[&_code]:font-mono [&_code]:text-xs",
        "[&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground",
        "[&_a]:text-primary [&_a]:underline",
        "[&_hr]:border-border [&_hr]:my-3",
        "[&_strong]:font-semibold [&_strong]:text-foreground"
      )}
    >
      {content}
    </Streamdown>
  );
});

MarkdownPreview.displayName = "MarkdownPreview";

const SourceView = memo(({ content }: { content: string }) => {
  const lines = content.split("\n");
  return (
    <div className="font-mono text-xs">
      {lines.map((line, idx) => (
        <div key={idx} className="flex hover:bg-muted/50 rounded-sm">
          <span className="select-none text-muted-foreground w-6 text-right pr-2 shrink-0">
            {idx + 1}
          </span>
          <span
            className={cn(
              "flex-1 whitespace-pre-wrap break-all",
              line.startsWith("#")
                ? "text-foreground font-medium"
                : "text-foreground/70"
            )}
          >
            {line || "\u00A0"}
          </span>
        </div>
      ))}
    </div>
  );
});

SourceView.displayName = "SourceView";
