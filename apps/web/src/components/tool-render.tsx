import type { ChatMessage, SubagentToolPart } from "@ama/bridge/lib/tool-types";
import { motion } from "motion/react";
import { Badge } from "./ui/badge";
import {
  CheckCircle2,
  XCircle,
  Terminal,
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
    case "read":
      return {
        label: "Read",
        detail: getFileName(params.path as string) || ".",
      };
    case "ls":
      return { label: "List", detail: getFileName(params.path as string) || "." };
    case "find":
      return { label: "Find", detail: params.pattern as string };
    case "grep":
      return { label: "Grep", detail: params.pattern as string };
    case "edit":
      return { label: "Edit", detail: getFileName(params.path as string) };
    case "write":
      return { label: "Write", detail: getFileName(params.path as string) };
    case "bash":
      return { label: "Run", detail: (params.command as string)?.slice(0, 30) };
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
  if (part.type === "tool-write") {
    const { toolCallId, state } = part;
    const isMdFile = part.input?.path?.endsWith(".md");

    const fileName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return isMdFile ? (
        <MarkdownEditor
          fileName={part.input?.path}
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
            fileName={part.input?.path}
            content={part.input?.content}
          />
        );
      }

      return (
        <div className="mb-1">
          <DiffResult
            toolCallId={toolCallId}
            label="Wrote"
            fileName={fileName}
            oldString={""}
            newString={part.input?.content || ""}
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
  if (part.type === "tool-read") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.path);

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

  if (part.type === "tool-ls") {
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
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Listed <span className="text-foreground/50">{dirName}</span>
          </span>
        </div>
      );
    }
  }

  if (part.type === "tool-find") {
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
      const output = part.output as { content?: string } | undefined;
      const fileCount = output?.content?.split("\n").filter(Boolean).length ?? 0;

      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Found <span className="text-foreground/50">{fileCount} file{fileCount !== 1 ? "s" : ""}</span>
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
      return (
        <div key={toolCallId} className="mb-1 py-0.5">
          <span className="text-sm">
            Grepped {matchCount} result{matchCount !== 1 ? "s" : ""}
          </span>
        </div>
      );
    }
  }

  if (part.type === "tool-edit") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.path);

    if (state === "output-available") {
      const inputEdits = (part.input?.edits as Array<{ oldText?: string; newText?: string }> | undefined) || [];
      const oldString = inputEdits.map((e) => e.oldText ?? "").join("\n");
      const newString = inputEdits.map((e) => e.newText ?? "").join("\n");

      return (
        <div key={toolCallId} className="mb-1">
          <DiffResult
            toolCallId={toolCallId}
            label="Replaced"
            fileName={fileName}
            oldString={oldString}
            newString={newString}
          />
        </div>
      );
    }
  }

  // Bash (Run Terminal Command)
  if (part.type === "tool-bash") {
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
                  ></span>
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

// Helper to get sub-agent tool labels
function getSubagentToolLabel(part: SubagentToolPart): string {
  const input = part.input as Record<string, unknown> | undefined;
  switch (part.type) {
    case "tool-read": {
      const filePath = input?.path as string | undefined;
      return `Read ${getFileName(filePath)}`;
    }
    case "tool-ls": {
      const dir = (input?.path as string) || ".";
      return `Listed ${dir}`;
    }
    case "tool-find": {
      const pattern = input?.pattern as string | undefined;
      return pattern ? `Find ${pattern}` : "Find";
    }
    case "tool-grep": {
      const pattern = input?.pattern as string | undefined;
      return pattern ? `Grep "${pattern}"` : "Grep";
    }
    default:
      return part.type.replace("tool-", "");
  }
}

const MAX_VISIBLE_EXPLORE_STEPS = 100;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectSubagentToolParts(output: unknown): SubagentToolPart[] {
  if (!output) return [];

  const stack: unknown[] = [output];
  const parts: SubagentToolPart[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (Array.isArray(current)) {
      // Push in reverse to preserve display order when popping.
      for (let i = current.length - 1; i >= 0; i -= 1) {
        stack.push(current[i]);
      }
      continue;
    }

    if (!isObjectRecord(current)) {
      continue;
    }

    const type = current.type;
    if (typeof type === "string" && type.startsWith("tool-")) {
      parts.push({
        type,
        toolCallId:
          typeof current.toolCallId === "string"
            ? current.toolCallId
            : undefined,
        state: typeof current.state === "string" ? current.state : undefined,
        input: current.input,
        output: current.output,
      });
      continue;
    }

    const nestedParts = current.parts;
    if (Array.isArray(nestedParts)) {
      for (let i = nestedParts.length - 1; i >= 0; i -= 1) {
        stack.push(nestedParts[i]);
      }
    }
  }

  return parts;
}

// Explore Tool component for sub-agent
function ExploreTool({
  task,
  isLoading,
  output,
}: {
  task: string;
  isLoading: boolean;
  output: unknown;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const truncatedTask = task.length > 80 ? task.slice(0, 80) + "…" : task;

  // Lazy compute detailed tool steps only when expanded. This prevents heavy
  // parsing/rendering during long-running explore streams.
  const expandedToolParts = useMemo(
    () => (isOpen ? collectSubagentToolParts(output) : []),
    [isOpen, output],
  );

  const hiddenCount = Math.max(
    0,
    expandedToolParts.length - MAX_VISIBLE_EXPLORE_STEPS,
  );
  const visibleToolParts =
    hiddenCount > 0
      ? expandedToolParts.slice(-MAX_VISIBLE_EXPLORE_STEPS)
      : expandedToolParts;

  const label = (
    <>
      <span>{isLoading ? "Exploring" : "Explored"}</span>
      <span className="text-[10px] sm:text-xs truncate max-w-[200px] sm:max-w-[300px]">
        {truncatedTask}
      </span>
      {isOpen && expandedToolParts.length > 0 && (
        <span className="text-muted-foreground/60 text-[10px] sm:text-xs">
          ({expandedToolParts.length} tool
          {expandedToolParts.length !== 1 ? "s" : ""})
        </span>
      )}
    </>
  );

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
            {hiddenCount > 0 && (
              <div className="text-xs text-muted-foreground/50 py-0.5">
                Showing latest {MAX_VISIBLE_EXPLORE_STEPS} of{" "}
                {expandedToolParts.length} steps
              </div>
            )}
            {visibleToolParts.length > 0 ? (
              visibleToolParts.map((tp, i) => (
                <div
                  key={`${tp.toolCallId ?? "tool"}-${i}`}
                  className="text-xs text-muted-foreground/70 font-mono py-0.5 truncate"
                >
                  {getSubagentToolLabel(tp)}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground/50 py-0.5">
                {isLoading ? "Starting exploration..." : "No tool steps captured."}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
