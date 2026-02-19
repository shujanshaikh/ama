import { z } from "zod";
import { read_file } from "./read-file";
import { deleteFile } from "./delete-file";
import { grepTool } from "./grep";
import { globTool } from "./glob";
import { list } from "./ls-dir";
import { bashTool } from "./bash";
import { apply_patch } from "./stringReplace";
import { editFiles } from "./edit-file";

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
    .max(25, "Maximum of 25 tools allowed in batch")
    .describe("Array of tool calls to execute in parallel"),
});

// Tools that cannot be batched (to prevent infinite recursion)
const DISALLOWED_TOOLS = new Set(["batch"]);

// Max concurrency pool size
const MAX_CONCURRENCY = 5;

// Per-call timeout (ms)
const PER_CALL_TIMEOUT = 30_000;

// Maximum batch size
const MAX_BATCH_SIZE = 25;

// All batchable tools (includes stringReplace and editFile now)
const batchableToolExecutors: Record<
  string,
  (args: any, projectCwd?: string) => Promise<any>
> = {
  deleteFile: deleteFile,
  grep: grepTool,
  glob: globTool,
  listDirectory: list,
  readFile: read_file,
  bash: bashTool,
  stringReplace: apply_patch,
  editFile: editFiles,
};

interface BatchToolCallResult {
  tool: string;
  success: boolean;
  result?: any;
  error?: string;
  durationMs?: number;
  timedOut?: boolean;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`BATCH_CALL_TIMEOUT: exceeded ${ms}ms`));
    }, ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
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
}> {
  const { tool_calls } = input;

  const callsToExecute = tool_calls.slice(0, MAX_BATCH_SIZE);
  const discardedCalls = tool_calls.slice(MAX_BATCH_SIZE);

  const executeCall = async (call: {
    tool: string;
    parameters: Record<string, unknown>;
  }): Promise<BatchToolCallResult> => {
    const start = performance.now();
    try {
      if (DISALLOWED_TOOLS.has(call.tool)) {
        return {
          tool: call.tool,
          success: false,
          error: `Tool '${call.tool}' is not allowed in batch. Disallowed tools: ${Array.from(DISALLOWED_TOOLS).join(", ")}`,
          durationMs: 0,
        };
      }

      const executor = batchableToolExecutors[call.tool];
      if (!executor) {
        const availableTools = Object.keys(batchableToolExecutors).join(", ");
        return {
          tool: call.tool,
          success: false,
          error: `Tool '${call.tool}' not found. Available tools for batching: ${availableTools}`,
          durationMs: 0,
        };
      }

      const result = await withTimeout(executor(call.parameters, projectCwd), PER_CALL_TIMEOUT);
      const durationMs = Math.round(performance.now() - start);

      return {
        tool: call.tool,
        success: result.success !== false,
        result,
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - start);
      const timedOut = error.message?.includes("BATCH_CALL_TIMEOUT");
      return {
        tool: call.tool,
        success: false,
        error: error.message || String(error),
        durationMs,
        timedOut,
      };
    }
  };

  // Execute with bounded concurrency
  const tasks = callsToExecute.map(
    (call) => () => executeCall(call),
  );
  const results = await runWithConcurrencyLimit(tasks, MAX_CONCURRENCY);

  // Add discarded calls as errors
  for (const call of discardedCalls) {
    results.push({
      tool: call.tool,
      success: false,
      error: `Maximum of ${MAX_BATCH_SIZE} tools allowed in batch`,
      durationMs: 0,
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
  };
};
