import type { ChatMessage } from "@ama/server/lib/tool-types";
import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import {
  CheckCircle2,
  XCircle,
  Terminal,
  Search,
  Layers,
  ChevronRight,
} from "lucide-react";
import { PierreDiff } from "./pierre-diff";
import type { FileContents } from "@pierre/diffs/react";
import { getFileIcon } from "./file-icons";
import { MarkdownEditor } from "./markdown-editor";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { memo, useMemo, useState } from "react";

// Minimal streaming indicator
export const StreamingDots = () => (
  <span className="inline-flex items-center gap-0.5 ml-1.5">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-0.5 h-0.5 rounded-full bg-current opacity-40"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          delay: i * 0.25,
          ease: "easeInOut",
        }}
      />
    ))}
  </span>
);

const getFileName = (path?: string) => {
  if (!path) return "file";
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
};

// Helper to get friendly tool display info
const getToolDisplayInfo = (
  tool: string,
  params: Record<string, unknown>,
): { label: string; detail?: string } => {
  switch (tool) {
    case "readFile":
      return {
        label: "Read",
        detail: getFileName(params.relative_file_path as string),
      };
    case "deleteFile":
      return { label: "Delete", detail: getFileName(params.path as string) };
    case "listDirectory":
      return {
        label: "List",
        detail: getFileName(params.path as string) || ".",
      };
    case "glob":
      return { label: "Glob", detail: params.pattern as string };
    case "grep":
      return { label: "Grep", detail: params.query as string };
    case "runTerminalCommand":
      return { label: "Run", detail: (params.command as string)?.slice(0, 30) };
    case "webSearch":
      return { label: "Search", detail: params.query as string };
    default:
      return { label: tool };
  }
};

export const ToolRenderer = ({
  part,
}: {
  part: ChatMessage["parts"][number];
}) => {
  // Edit File
  if (part.type === "tool-editFile") {
    const { toolCallId, state } = part;
    const isMdFile = part.input?.target_file?.endsWith(".md");

    const fileName = getFileName(part.input?.target_file);

    if (state === "input-streaming") {
      return isMdFile ? (
        <MarkdownEditor
          fileName={part.input?.target_file}
          content={part.input?.content}
        />
      ) : (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm flex items-center gap-2">
            Editing <span className="text-foreground/50">{fileName}</span>{" "}
            {getFileIcon(fileName)}
          </span>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | {
            success?: boolean;
            linesAdded?: number;
            linesRemoved?: number;
            isNewFile?: boolean;
            old_string?: string;
            new_string?: string;
            checkpointId?: string;
            afterHash?: string;
          }
        | undefined;

      // Show custom UI for completed markdown/plan files
      if (isMdFile) {
        return (
          <MarkdownEditor
            fileName={part.input?.target_file}
            content={output?.new_string}
          />
        );
      }

      const oldString: FileContents = {
        contents: output?.old_string || "",
        name: fileName,
      };
      const newString: FileContents = {
        contents: output?.new_string || "",
        name: fileName,
      };

      return (
        <div className="mb-1">
          <DiffResult
            toolCallId={toolCallId}
            label={output?.isNewFile ? "Created" : "Edited"}
            fileName={fileName}
            oldString={oldString.contents}
            newString={newString.contents}
            linesAdded={output?.linesAdded}
            linesRemoved={output?.linesRemoved}
          />
        </div>
      );
    }
  }

  // Delete File
  if (part.type === "tool-deleteFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Deleting <span className="text-foreground/50">{fileName}</span>
            <StreamingDots />
          </span>
        </div>
      );
    }

    if (state === "output-available") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Deleted <span className="text-foreground/50">{fileName}</span>
          </span>
        </div>
      );
    }
  }

  // Read File
  if (part.type === "tool-readFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.relative_file_path);

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm flex items-center gap-2">
            Reading <span className="text-foreground/50">{fileName}</span>{" "}
            {getFileIcon(fileName)}{" "}
            <span className="text-muted-foreground/50 ml-1.5">{fileName}</span>
            <StreamingDots />
          </span>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as { totalLines?: number } | undefined;
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm flex items-center gap-2">
            Read <span className="text-foreground/50">{fileName}</span>{" "}
            {getFileIcon(fileName)}
            {output?.totalLines && (
              <span className="text-muted-foreground/50 ml-1.5">
                ({output.totalLines} lines)
              </span>
            )}
          </span>
        </div>
      );
    }
  }

  if (part.type === "tool-listDirectory") {
    const { toolCallId, state } = part;
    const dirName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Listing <span className="text-foreground/50">{dirName}</span>
            <StreamingDots />
          </span>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | { files?: Array<{ name: string; type: string }> }
        | undefined;
      const fileCount =
        output?.files?.filter((f) => f.type === "file").length || 0;
      const dirCount =
        output?.files?.filter((f) => f.type === "directory").length || 0;

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Listed <span className="text-foreground/50">{dirName}</span>
            {(fileCount > 0 || dirCount > 0) && (
              <span className="text-muted-foreground/50 ml-1.5">
                ({fileCount} file{fileCount !== 1 ? "s" : ""}
                {dirCount > 0
                  ? `, ${dirCount} dir${dirCount !== 1 ? "s" : ""}`
                  : ""}
                )
              </span>
            )}
          </span>
        </div>
      );
    }
  }

  // Glob Tool
  if (part.type === "tool-glob") {
    const { toolCallId, state } = part;
    const pattern = part.input.pattern;

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Glob {pattern}
            <StreamingDots />
          </span>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | { files?: string[] | Array<{ path?: string; name?: string }> }
        | undefined;
      const fileCount = Array.isArray(output?.files) ? output.files.length : 0;
      const content = part.output?.content;

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Glob <span className="text-foreground/50">{content}</span>
          </span>
        </div>
      );
    }
  }

  // Grep Tool
  if (part.type === "tool-grep") {
    const { toolCallId, state } = part;

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Searching
            <StreamingDots />
          </span>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | { matchCount?: number; result?: { totalMatches?: number } }
        | undefined;
      const matchCount =
        output?.matchCount || output?.result?.totalMatches || 0;
      const content = part.output?.content;
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Grep <span className="text-foreground/50">{content}</span>
            {matchCount !== 1 ? "es" : ""}
          </span>
        </div>
      );
    }
  }

  // String Replace
  if (part.type === "tool-stringReplace") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.file_path);
    const inputOldString = part.input?.old_string || "";
    const inputNewString = part.input?.new_string || "";

    if (state === "output-available") {
      const output = part.output as
        | {
            linesAdded?: number;
            linesRemoved?: number;
            old_string?: string;
            new_string?: string;
            checkpointId?: string;
            afterHash?: string;
          }
        | undefined;
      const oldString = output?.old_string || inputOldString;
      const newString = output?.new_string || inputNewString;

      return (
        <div key={toolCallId} className="mb-1">
          <DiffResult
            toolCallId={toolCallId}
            label="Replaced"
            fileName={fileName}
            oldString={oldString}
            newString={newString}
            linesAdded={output?.linesAdded}
            linesRemoved={output?.linesRemoved}
          />
        </div>
      );
    }
  }

  // Run Terminal Command
  if (part.type === "tool-runTerminalCommand") {
    const { toolCallId, state } = part;
    const command = part.input?.command;

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground/60" />
            <span className="text-sm">
              Running{" "}
              <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                {command}
              </span>
            </span>
            <StreamingDots />
          </div>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | {
            success?: boolean;
            message?: string;
            error?: string;
            stdout?: string;
            stderr?: string;
            exitCode?: number;
          }
        | undefined;
      const isSuccess =
        output?.success !== false &&
        (!output?.exitCode || output.exitCode === 0);

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Terminal className="size-4 text-muted-foreground/70" />
              <span className="text-sm">
                Ran{" "}
                <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                  {command}
                </span>
              </span>
              <Badge
                variant={isSuccess ? "default" : "destructive"}
                className="gap-1 text-xs"
              >
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    Success
                  </>
                ) : (
                  <>
                    <XCircle className="size-3" />
                    Failed
                  </>
                )}
              </Badge>
              {output?.exitCode !== undefined && output.exitCode !== 0 && (
                <span className="text-xs text-muted-foreground/60">
                  Exit code: {output.exitCode}
                </span>
              )}
            </div>
            {(output?.stdout || output?.stderr || output?.message) && (
              <div className="ml-6 space-y-1">
                {output?.message && (
                  <div className="text-xs text-muted-foreground/70">
                    {output.message}
                  </div>
                )}
                {output?.stdout && (
                  <div className="text-xs font-mono bg-muted/30 px-2 py-1 rounded border border-border/50">
                    <div className="text-muted-foreground/60 text-[10px] mb-0.5">
                      STDOUT:
                    </div>
                    <div className="text-foreground/80 whitespace-pre-wrap wrap-break-word">
                      {output.stdout}
                    </div>
                  </div>
                )}
                {output?.stderr && (
                  <div className="text-xs font-mono bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                    <div className="text-destructive/70 text-[10px] mb-0.5">
                      STDERR:
                    </div>
                    <div className="text-destructive/90 whitespace-pre-wrap wrap-break-word">
                      {output.stderr}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
  }
  // Web Search Tool
  if (part.type === "tool-webSearch") {
    const { toolCallId, state } = part;
    const query = part.input?.query as string | undefined;

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground/60" />
            <span className="text-sm">
              Searching{" "}
              <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                {query || "..."}
              </span>
            </span>
            <StreamingDots />
          </div>
        </div>
      );
    }

    if (state === "input-available") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground/60" />
          </div>
          <div className="text-sm">
            Searching{" "}
            <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
              {query || "..."}
            </span>
          </div>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | {
            success?: boolean;
            message?: string;
            error?: string;
            results?: Array<{
              url?: string;
              title?: string;
              text?: string;
              summary?: string;
              links?: string[];
            }>;
            // Legacy format support
            markdown?: string;
            links?: string[];
            html?: string;
          }
        | undefined;

      const results = output?.results || [];
      const hasResults = results.length > 0;

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Search className="size-4 text-muted-foreground/70" />
              <span className="text-sm">
                Searched{" "}
                <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                  {query}
                </span>
              </span>
              {hasResults && (
                <span className="text-xs text-muted-foreground/60">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {output?.error && (
              <div className="ml-6">
                <div className="text-xs font-mono bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                  <div className="text-destructive/70 text-[10px] mb-0.5">
                    ERROR:
                  </div>
                  <div className="text-destructive/90 whitespace-pre-wrap wrap-break-word">
                    {output.error}
                  </div>
                </div>
              </div>
            )}

            {output?.message && !hasResults && (
              <div className="ml-6">
                <div className="text-xs text-muted-foreground/70">
                  {output.message}
                </div>
              </div>
            )}

            {hasResults && (
              <div className="ml-6 space-y-2">
                {results.slice(0, 5).map((result, idx) => (
                  <div key={idx} className="space-y-1">
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-foreground/80 hover:text-foreground hover:underline block truncate"
                      >
                        {result.title || result.url}
                      </a>
                    )}
                    {result.summary && (
                      <div className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2">
                        {result.summary}
                      </div>
                    )}
                    {result.text && !result.summary && (
                      <div className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2">
                        {result.text.slice(0, 200)}
                        {result.text.length > 200 ? "..." : ""}
                      </div>
                    )}
                  </div>
                ))}
                {results.length > 5 && (
                  <div className="text-xs text-muted-foreground/50">
                    +{results.length - 5} more result
                    {results.length - 5 !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}

            {/* Legacy format support */}
            {!hasResults && output?.markdown && (
              <div className="ml-6 space-y-2">
                <div className="text-xs font-mono bg-muted/30 px-3 py-2 rounded border border-border/50 max-h-48 overflow-y-auto">
                  <div className="text-muted-foreground/60 text-[10px] mb-1 font-semibold">
                    CONTENT:
                  </div>
                  <div className="text-foreground/80 whitespace-pre-wrap wrap-break-word text-xs leading-relaxed">
                    {output.markdown.slice(0, 500)}
                    {output.markdown.length > 500 ? "..." : ""}
                  </div>
                </div>
              </div>
            )}

            {!hasResults && output?.links && output.links.length > 0 && (
              <div className="ml-6 mt-2">
                <div className="text-xs text-muted-foreground/70 mb-1">
                  Links found: {output.links.length}
                </div>
                <div className="space-y-1">
                  {output.links.slice(0, 3).map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-foreground/80 hover:text-foreground hover:underline block truncate"
                    >
                      {link}
                    </a>
                  ))}
                  {output.links.length > 3 && (
                    <div className="text-xs text-muted-foreground/50">
                      +{output.links.length - 3} more links
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // Batch Tool
  if (part.type === "tool-batch") {
    const { toolCallId, state } = part;
    const toolCalls = part.input?.tool_calls as
      | Array<{ tool: string; parameters: Record<string, unknown> }>
      | undefined;
    const toolCount = toolCalls?.length || 0;

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground/60" />
            <span className="text-sm">
              Batching {toolCount} tool{toolCount !== 1 ? "s" : ""}...
            </span>
          </div>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | {
            success?: boolean;
            message?: string;
            totalCalls?: number;
            successful?: number;
            failed?: number;
            results?: Array<{
              tool: string;
              success: boolean;
              error?: string;
              result?: unknown;
            }>;
          }
        | undefined;

      const successful = output?.successful || 0;
      const failed = output?.failed || 0;
      const total = output?.totalCalls || toolCount;
      const allSuccess = failed === 0;
      const results = output?.results || [];

      return (
        <BatchToolResult
          toolCallId={toolCallId}
          toolCalls={toolCalls || []}
          results={results}
          successful={successful}
          failed={failed}
          total={total}
          allSuccess={allSuccess}
        />
      );
    }
  }

  return null;
};

const DiffResult = memo(function DiffResult({
  toolCallId,
  label,
  fileName,
  oldString,
  newString,
  linesAdded,
  linesRemoved,
}: {
  toolCallId: string;
  label: string;
  fileName: string;
  oldString: string;
  newString: string;
  linesAdded?: number;
  linesRemoved?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const oldFile = useMemo<FileContents>(
    () => ({ contents: oldString || "", name: fileName }),
    [oldString, fileName],
  );
  const newFile = useMemo<FileContents>(
    () => ({ contents: newString || "", name: fileName }),
    [newString, fileName],
  );

  const hasChanges = (oldString || "") !== (newString || "");
  const stats =
    linesAdded !== undefined || linesRemoved !== undefined
      ? `(+${linesAdded ?? 0} -${linesRemoved ?? 0})`
      : undefined;

  if (!hasChanges) {
    return (
      <div key={toolCallId} className="py-0.5">
        <span className="text-sm flex items-center gap-2">
          {label} <span className="text-foreground/50">{fileName}</span>{" "}
          {getFileIcon(fileName)}
          <span className="text-muted-foreground/60 text-xs">No changes</span>
        </span>
      </div>
    );
  }

  return (
    <div key={toolCallId} className="py-0.5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer group">
          <ChevronRight
            className={`size-3 text-muted-foreground/50 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
          <span className="text-sm flex items-center gap-2">
            {label} <span className="text-foreground/50">{fileName}</span>{" "}
            {getFileIcon(fileName)}
            {stats && (
              <span className="text-muted-foreground/60 text-xs">{stats}</span>
            )}
            <span className="text-muted-foreground/50 text-xs">
              {isOpen ? "Hide diff" : "Show diff"}
            </span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 mt-1">
            <PierreDiff oldFile={oldFile} newFile={newFile} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

// Separate component for batch results to use hooks
const BatchToolResult = ({
  toolCallId,
  toolCalls,
  results,
  successful,
  failed,
  total,
  allSuccess,
}: {
  toolCallId: string;
  toolCalls: Array<{ tool: string; parameters: Record<string, unknown> }>;
  results: Array<{
    tool: string;
    success: boolean;
    error?: string;
    result?: unknown;
  }>;
  successful: number;
  failed: number;
  total: number;
  allSuccess: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div key={toolCallId} className="mb-1 py-0.5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer group">
          <ChevronRight
            className={`size-3 text-muted-foreground/50 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
          <Layers className="size-4 text-muted-foreground/70" />
          <span className="text-sm">Parallel</span>
          <span
            className={`text-xs ${allSuccess ? "text-muted-foreground/60" : "text-destructive/70"}`}
          >
            {successful}/{total}
          </span>
          {failed > 0 && (
            <span className="text-xs text-destructive/60">
              ({failed} failed)
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-5 mt-1 pl-2 border-l border-muted/40 space-y-0.5">
            {toolCalls.map((call, idx) => {
              const info = getToolDisplayInfo(call.tool, call.parameters);
              const result = results[idx];
              const isSuccess = result?.success !== false;

              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-muted-foreground/70"
                >
                  <span
                    className={
                      isSuccess
                        ? "text-muted-foreground/50"
                        : "text-destructive/60"
                    }
                  >
                  </span>
                  <span>{info.label}</span>
                  {info.detail && (
                    <span className="truncate max-w-[200px] opacity-60">
                      {info.detail}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
