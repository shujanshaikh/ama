import { motion } from "motion/react";
import {
  Terminal,
  Search,
  Layers,
  ChevronRight,
} from "lucide-react";
import { getFileIcon } from "./file-icons";
import { MarkdownEditor } from "./markdown-editor";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

type ToolPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: unknown;
};

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

const getToolDisplayInfo = (
  tool: string,
  params: Record<string, unknown>
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

export const ToolRenderer = ({ part }: { part: ToolPart }) => {
  if (part.type === "tool-editFile") {
    const { toolCallId, state } = part;
    const isMdFile = (part.input?.target_file as string)?.endsWith(".md");
    const fileName = getFileName(part.input?.target_file as string);

    if (state === "input-streaming") {
      return isMdFile ? (
        <MarkdownEditor
          fileName={part.input?.target_file as string}
          content={part.input?.content as string}
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
          }
        | undefined;

      if (isMdFile) {
        return (
          <MarkdownEditor
            fileName={part.input?.target_file as string}
            content={output?.new_string}
          />
        );
      }

      const stats =
        output?.linesAdded !== undefined || output?.linesRemoved !== undefined
          ? `(+${output?.linesAdded ?? 0} -${output?.linesRemoved ?? 0})`
          : undefined;

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm flex items-center gap-2">
            {output?.isNewFile ? "Created" : "Edited"}{" "}
            <span className="text-foreground/50">{fileName}</span>{" "}
            {getFileIcon(fileName)}
            {stats && (
              <span className="text-muted-foreground/60 text-xs">{stats}</span>
            )}
          </span>
        </div>
      );
    }
  }

  if (part.type === "tool-deleteFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.path as string);

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

  if (part.type === "tool-readFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.relative_file_path as string);

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
    const dirName = getFileName(part.input?.path as string);

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

  if (part.type === "tool-glob") {
    const { toolCallId, state } = part;

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Searching files
            <StreamingDots />
          </span>
        </div>
      );
    }

    if (state === "output-available") {
      const output = part.output as
        | { files?: string[]; content?: string }
        | undefined;
      const fileCount = output?.files?.length ?? 0;

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Found{" "}
            <span className="text-foreground/50">
              {fileCount} file{fileCount !== 1 ? "s" : ""}
            </span>
          </span>
        </div>
      );
    }
  }

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

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Grepped {matchCount} result{matchCount !== 1 ? "s" : ""}
          </span>
        </div>
      );
    }
  }

  if (part.type === "tool-stringReplace") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.file_path as string);
    const inputOldString = part.input?.old_string || "";
    const inputNewString = part.input?.new_string || "";

    if (state === "output-available") {
      const output = part.output as
        | {
            linesAdded?: number;
            linesRemoved?: number;
          }
        | undefined;
      const stats =
        output?.linesAdded !== undefined || output?.linesRemoved !== undefined
          ? `(+${output?.linesAdded ?? 0} -${output?.linesRemoved ?? 0})`
          : undefined;

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm flex items-center gap-2">
            Replaced <span className="text-foreground/50">{fileName}</span>{" "}
            {getFileIcon(fileName)}
            {stats && (
              <span className="text-muted-foreground/60 text-xs">{stats}</span>
            )}
          </span>
        </div>
      );
    }
  }

  if (part.type === "tool-runTerminalCommand") {
    const { toolCallId, state } = part;
    const command = part.input?.command as string | undefined;

    if (state === "input-streaming") {
      return (
        <div key={toolCallId} className="mb-1.5">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
            <Terminal className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="font-mono text-xs text-foreground/70 truncate">
              {command ?? ""}
            </span>
            <StreamingDots />
          </div>
        </div>
      );
    }

    if (state === "output-available") {
      return (
        <div key={toolCallId} className="mb-1.5">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
            <Terminal className="size-3.5 text-muted-foreground/60 shrink-0" />
            <span className="font-mono text-xs text-foreground/70 truncate">
              {command ?? ""}
            </span>
          </div>
        </div>
      );
    }
  }

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
            }>;
            markdown?: string;
            links?: string[];
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

  if (part.type === "tool-explore") {
    const { toolCallId, state } = part;
    const task = part.input?.task as string | undefined;
    const output = part.output;

    const toolParts: ToolPart[] = [];
    if (output) {
      if (Array.isArray(output)) {
        for (const item of output) {
          if (item?.parts && Array.isArray(item.parts)) {
            for (const p of item.parts) {
              if (p?.type?.startsWith("tool-")) {
                toolParts.push(p as ToolPart);
              }
            }
          }
          if (item?.type?.startsWith("tool-")) {
            toolParts.push(item as ToolPart);
          }
        }
      } else if (
        typeof output === "object" &&
        "parts" in output &&
        Array.isArray((output as { parts: unknown[] }).parts)
      ) {
        for (const p of (output as { parts: ToolPart[] }).parts) {
          if (p?.type?.startsWith("tool-")) {
            toolParts.push(p);
          }
        }
      }
    }

    const isLoading =
      state === "input-streaming" || state === "input-available";

    return (
      <ExploreTool
        key={toolCallId}
        task={task || "codebase"}
        isLoading={isLoading}
        toolParts={toolParts}
      />
    );
  }

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
          toolCallId={toolCallId!}
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
                  />
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

function getSubagentToolLabel(part: ToolPart): string {
  const input = part.input as Record<string, unknown> | undefined;
  switch (part.type) {
    case "tool-readFile":
      return `Read ${getFileName(input?.relative_file_path as string)}`;
    case "tool-listDirectory":
      return `Listed ${(input?.path as string) || "."}`;
    case "tool-glob":
      return input?.pattern ? `Glob ${input.pattern}` : "Glob";
    case "tool-grep":
      return input?.query ? `Grep "${input.query}"` : "Grep";
    case "tool-batch":
      const calls = input?.tool_calls as Array<{ tool: string }> | undefined;
      return `Batch ${calls?.length ?? 0} tools`;
    default:
      return part.type.replace("tool-", "");
  }
}

function ToolLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 py-0.5 sm:py-1 text-xs sm:text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ExploreTool({
  task,
  isLoading,
  toolParts,
}: {
  task: string;
  isLoading: boolean;
  toolParts: ToolPart[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const truncatedTask = task.length > 80 ? task.slice(0, 80) + "…" : task;
  const hasTools = toolParts.length > 0;

  const label = (
    <>
      <span>{isLoading ? "Exploring" : "Explored"}</span>
      <span className="text-[10px] sm:text-xs truncate max-w-[200px] sm:max-w-[300px]">
        {truncatedTask}
      </span>
      {hasTools && (
        <span className="text-muted-foreground/60 text-[10px] sm:text-xs">
          ({toolParts.length} tool{toolParts.length !== 1 ? "s" : ""})
        </span>
      )}
    </>
  );

  if (!hasTools && !isLoading) {
    return <ToolLine>{label}</ToolLine>;
  }

  return (
    <div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 sm:gap-1.5 py-0.5 sm:py-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground cursor-pointer text-left flex-wrap">
            <ChevronRight
              className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
            {label}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-0.5 pl-5 border-l border-border/50">
            {hasTools ? (
              toolParts.map((tp, i) => (
                <div
                  key={tp.toolCallId || i}
                  className="text-xs text-muted-foreground/70 font-mono py-0.5 truncate"
                >
                  {getSubagentToolLabel(tp)}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground/50 py-0.5">
                Starting exploration...
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
