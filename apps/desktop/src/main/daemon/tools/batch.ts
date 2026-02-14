import { z } from "zod";
import { read_file } from "./read-file";
import { deleteFile } from "./delete-file";
import { grepTool } from "./grep";
import { globTool } from "./glob";
import { list } from "./ls-dir";
import { runTerminalCommand } from "./runTerminalCommand";

const toolCallSchema = z.object({
  tool: z.string().describe("The name of the tool to execute"),
  parameters: z
    .record(z.string(), z.unknown())
    .describe("Parameters for the tool"),
});

const batchSchema = z.object({
  tool_calls: z
    .array(toolCallSchema)
    .min(1, "Provide at least one tool call")
    .max(10, "Maximum of 10 tools allowed in batch")
    .describe("Array of tool calls to execute in parallel"),
});

const MAX_BATCH_CALLS = 10;
const DEFAULT_CALL_TIMEOUT_MS = 45000;
const TOOL_TIMEOUT_OVERRIDES: Record<string, number> = {
  runTerminalCommand: 90000,
};

// Tools that cannot be batched (to prevent infinite recursion)
const DISALLOWED_TOOLS = new Set(["batch"]);

// Map of available tools for batch execution
const batchableToolExecutors: Record<
  string,
  (args: any, projectCwd?: string) => Promise<any>
> = {
  deleteFile: deleteFile,
  grep: grepTool,
  glob: globTool,
  listDirectory: list,
  readFile: read_file,
  runTerminalCommand: runTerminalCommand,
};

interface BatchToolCallResult {
  tool: string;
  success: boolean;
  result?: any;
  error?: string;
  elapsedMs?: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Unknown error";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string,
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(`${context} timed out after ${Math.round(timeoutMs / 1000)}s`),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export const batchTool = async function (
  input: z.infer<typeof batchSchema>,
  projectCwd?: string,
): Promise<{
  success: boolean;
  message: string;
  totalCalls: number;
  successful: number;
  failed: number;
  results: BatchToolCallResult[];
  error?: string;
  elapsedMs?: number;
}> {
  const startedAt = Date.now();
  const parsedInput = batchSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      success: false,
      message: `Invalid batch input: ${parsedInput.error.issues[0]?.message ?? "Invalid input"}`,
      totalCalls: 0,
      successful: 0,
      failed: 0,
      results: [],
      error: "INVALID_INPUT",
      elapsedMs: Date.now() - startedAt,
    };
  }

  const { tool_calls } = parsedInput.data;

  // Limit to 10 calls
  const callsToExecute = tool_calls.slice(0, MAX_BATCH_CALLS);
  const discardedCalls = tool_calls.slice(MAX_BATCH_CALLS);

  const executeCall = async (call: {
    tool: string;
    parameters: Record<string, unknown>;
  }): Promise<BatchToolCallResult> => {
    const callStartedAt = Date.now();
    try {
      // Check if tool is disallowed
      if (DISALLOWED_TOOLS.has(call.tool)) {
        return {
          tool: call.tool,
          success: false,
          error: `Tool '${call.tool}' is not allowed in batch. Disallowed tools: ${Array.from(DISALLOWED_TOOLS).join(", ")}`,
          elapsedMs: Date.now() - callStartedAt,
        };
      }

      // Get the executor for this tool
      const executor = batchableToolExecutors[call.tool];
      if (!executor) {
        const availableTools = Object.keys(batchableToolExecutors).join(", ");
        return {
          tool: call.tool,
          success: false,
          error: `Tool '${call.tool}' not found. Available tools for batching: ${availableTools}`,
          elapsedMs: Date.now() - callStartedAt,
        };
      }

      // Execute the tool
      const timeoutMs = TOOL_TIMEOUT_OVERRIDES[call.tool] ?? DEFAULT_CALL_TIMEOUT_MS;
      const result = await withTimeout(
        executor(call.parameters, projectCwd),
        timeoutMs,
        `Batch tool call '${call.tool}'`,
      );

      return {
        tool: call.tool,
        success: result.success !== false, // Treat undefined success as true
        result,
        elapsedMs: Date.now() - callStartedAt,
      };
    } catch (error) {
      return {
        tool: call.tool,
        success: false,
        error: getErrorMessage(error),
        elapsedMs: Date.now() - callStartedAt,
      };
    }
  };

  // Execute all calls in parallel
  const settledResults = await Promise.allSettled(callsToExecute.map(executeCall));
  const results = settledResults.map((settled, idx) => {
    if (settled.status === "fulfilled") {
      return settled.value;
    }
    return {
      tool: callsToExecute[idx]?.tool ?? "unknown",
      success: false,
      error: getErrorMessage(settled.reason),
    } satisfies BatchToolCallResult;
  });

  // Add discarded calls as errors
  for (const call of discardedCalls) {
    results.push({
      tool: call.tool,
      success: false,
      error: "Maximum of 10 tools allowed in batch",
    });
  }

  const successfulCalls = results.filter((r) => r.success).length;
  const failedCalls = results.length - successfulCalls;

  const outputMessage =
    failedCalls > 0
      ? `Executed ${successfulCalls}/${results.length} tools successfully. ${failedCalls} failed.`
      : `All ${successfulCalls} tools executed successfully.\n\nKeep using the batch tool for optimal performance in your next response!`;

  return {
    success: failedCalls === 0,
    message: outputMessage,
    totalCalls: results.length,
    successful: successfulCalls,
    failed: failedCalls,
    results,
    elapsedMs: Date.now() - startedAt,
  };
};
