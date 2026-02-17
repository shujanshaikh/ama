import { z } from "zod";
import { requireProjectCwd } from "./sandbox";

export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    tool: string;
    durationMs: number;
    timedOut?: boolean;
  };
}

export const toolCallSchema = z.object({
  type: z.literal("tool_call"),
  id: z.string(),
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
  projectId: z.string().optional(),
  projectCwd: z.string().optional(),
});

export type ValidatedToolCall = z.infer<typeof toolCallSchema>;

const DEFAULT_TIMEOUT_MS = 30_000; // 30s

const TOOL_TIMEOUTS: Record<string, number> = {
  readFile: 10_000,
  glob: 15_000,
  grep: 20_000,
  listDirectory: 15_000,
  editFile: 15_000,
  deleteFile: 10_000,
  stringReplace: 15_000,
  bash: 60_000,
  batch: 120_000,
};

function getTimeoutForTool(tool: string): number {
  return TOOL_TIMEOUTS[tool] ?? DEFAULT_TIMEOUT_MS;
}

function withTimeout<T>(promise: Promise<T>, ms: number, tool: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ToolTimeoutError(tool, ms));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ── Error taxonomy ─────────────────────────────────────────────────────────
export class ToolTimeoutError extends Error {
  code = "TOOL_TIMEOUT" as const;
  constructor(
    public tool: string,
    public timeoutMs: number,
  ) {
    super(`Tool "${tool}" timed out after ${timeoutMs}ms`);
    this.name = "ToolTimeoutError";
  }
}

export class UnknownToolError extends Error {
  code = "UNKNOWN_TOOL" as const;
  constructor(public tool: string) {
    super(`Unknown tool: ${tool}`);
    this.name = "UnknownToolError";
  }
}

export class ValidationError extends Error {
  code = "VALIDATION_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type ToolExecutorFn = (args: any, projectCwd?: string) => Promise<any>;

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  projectCwd: string | undefined,
  executors: Record<string, ToolExecutorFn>,
): Promise<ToolResponse> {
  const start = performance.now();

  const executor = executors[toolName];
  if (!executor) {
    return {
      success: false,
      error: { code: "UNKNOWN_TOOL", message: `Unknown tool: ${toolName}` },
      metadata: { tool: toolName, durationMs: 0 },
    };
  }

  const cwdCheck = requireProjectCwd(toolName, projectCwd);
  if (!cwdCheck.allowed) {
    return {
      success: false,
      error: { code: "ACCESS_DENIED", message: cwdCheck.error },
      metadata: { tool: toolName, durationMs: 0 },
    };
  }

  try {
    const timeoutMs = getTimeoutForTool(toolName);
    const result = await withTimeout(executor(args, projectCwd), timeoutMs, toolName);
    const durationMs = Math.round(performance.now() - start);

    return {
      success: result?.success !== false,
      data: result,
      metadata: { tool: toolName, durationMs },
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);

    if (err instanceof ToolTimeoutError) {
      return {
        success: false,
        error: { code: "TOOL_TIMEOUT", message: err.message },
        metadata: { tool: toolName, durationMs, timedOut: true },
      };
    }

    return {
      success: false,
      error: {
        code: err.code ?? "TOOL_EXECUTION_ERROR",
        message: err.message ?? String(err),
      },
      metadata: { tool: toolName, durationMs },
    };
  }
}

export function parseToolCall(raw: unknown): ValidatedToolCall | ValidationError {
  const result = toolCallSchema.safeParse(raw);
  if (!result.success) {
    return new ValidationError(
      `Invalid tool_call payload: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return result.data;
}
