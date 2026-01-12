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

  // Limit to 10 calls
  const callsToExecute = tool_calls.slice(0, 10);
  const discardedCalls = tool_calls.slice(10);

  const executeCall = async (call: {
    tool: string;
    parameters: Record<string, unknown>;
  }): Promise<BatchToolCallResult> => {
    try {
      // Check if tool is disallowed
      if (DISALLOWED_TOOLS.has(call.tool)) {
        return {
          tool: call.tool,
          success: false,
          error: `Tool '${call.tool}' is not allowed in batch. Disallowed tools: ${Array.from(DISALLOWED_TOOLS).join(", ")}`,
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
        };
      }

      // Execute the tool
      const result = await executor(call.parameters, projectCwd);

      return {
        tool: call.tool,
        success: result.success !== false, // Treat undefined success as true
        result,
      };
    } catch (error: any) {
      return {
        tool: call.tool,
        success: false,
        error: error.message || String(error),
      };
    }
  };

  // Execute all calls in parallel
  const results = await Promise.all(callsToExecute.map(executeCall));

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
  };
};
