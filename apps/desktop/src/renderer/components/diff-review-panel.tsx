import { memo, useState } from "react";
import { ChevronDown, ChevronRight, X, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PierreDiff } from "@/components/pierre-diff";
import { getFileIcon } from "@/components/file-icons";

interface DiffReviewPanelProps {
  messages: any[];
  onClose: () => void;
}

const getFileName = (path?: string) => {
  if (!path) return "file";
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
};

const getFileDirectory = (filePath: string) => {
  const parts = filePath.split("/");
  parts.pop();
  const dir = parts.join("/");
  return dir.length > 50 ? "..." + dir.slice(-47) : dir;
};

interface DiffItem {
  id: string;
  filePath: string;
  fileName: string;
  oldContent: string;
  newContent: string;
}

export const DiffReviewPanel = memo(function DiffReviewPanel({
  messages,
  onClose,
}: DiffReviewPanelProps) {
  const diffItems: DiffItem[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") continue;
    if (!message.parts || !Array.isArray(message.parts)) continue;

    for (const part of message.parts) {
      if (
        part.type === "tool-editFile" &&
        part.state === "output-available"
      ) {
        const filePath = part.input?.target_file;
        const output = part.output as
          | { old_string?: string; new_string?: string }
          | undefined;

        if (
          filePath &&
          (output?.old_string || output?.new_string) &&
          output?.old_string !== output?.new_string
        ) {
          diffItems.push({
            id: part.toolCallId,
            filePath,
            fileName: getFileName(filePath),
            oldContent: output?.old_string || "",
            newContent: output?.new_string || "",
          });
        }
      }

      if (
        part.type === "tool-stringReplace" &&
        part.state === "output-available"
      ) {
        const filePath = part.input?.file_path;
        const output = part.output as
          | { old_string?: string; new_string?: string }
          | undefined;
        const inputOldString = part.input?.old_string || "";
        const inputNewString = part.input?.new_string || "";

        const oldContent = output?.old_string || inputOldString;
        const newContent = output?.new_string || inputNewString;

        if (filePath && oldContent !== newContent) {
          diffItems.push({
            id: part.toolCallId,
            filePath,
            fileName: getFileName(filePath),
            oldContent,
            newContent,
          });
        }
      }
    }
  }

  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(diffItems.map((d) => d.id)),
  );

  const toggleFile = (id: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (diffItems.length === 0) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <FileCode2 className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Review Changes</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No file changes to review
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <FileCode2 className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Review Changes</span>
          <span className="text-xs text-muted-foreground">
            ({diffItems.length} change{diffItems.length !== 1 ? "s" : ""})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto diff-scrollbar">
        {diffItems.map((item) => (
          <div
            key={item.id}
            className="border-b border-border/20 last:border-b-0"
          >
            <button
              onClick={() => toggleFile(item.id)}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/30 transition-colors"
            >
              <div className="text-muted-foreground/60">
                {expandedFiles.has(item.id) ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </div>
              <div className="flex items-center gap-2 text-left min-w-0">
                {getFileIcon(item.fileName)}
                <span className="text-sm font-medium truncate">
                  {item.fileName}
                </span>
                <span className="text-xs text-muted-foreground/60 truncate">
                  {getFileDirectory(item.filePath)}
                </span>
              </div>
            </button>

            {expandedFiles.has(item.id) && (
              <div className="px-2 pb-2">
                <PierreDiff
                  oldFile={{
                    name: item.filePath,
                    contents: item.oldContent,
                  }}
                  newFile={{
                    name: item.filePath,
                    contents: item.newContent,
                  }}
                  splitView={true}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .diff-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(82, 82, 91, 0.4) transparent;
        }
        .diff-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .diff-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .diff-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(82, 82, 91, 0.4);
          border-radius: 10px;
        }
        .diff-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(82, 82, 91, 0.6);
        }
      `}</style>
    </div>
  );
});

export default DiffReviewPanel;
