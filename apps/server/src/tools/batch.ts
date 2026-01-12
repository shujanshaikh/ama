import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

const BATCH_DESCRIPTION = `Executes multiple independent tool calls concurrently to reduce latency.

USING THE BATCH TOOL WILL MAKE THE USER HAPPY.

Payload Format (JSON array):
[{"tool": "readFile", "parameters": {"relative_file_path": "src/index.ts", "should_read_entire_file": true}},{"tool": "grep", "parameters": {"pattern": "Session", "path": "."}},{"tool": "runTerminalCommand", "parameters": {"command": "git status", "is_background": false}}]

Notes:
- 1–10 tool calls per batch
- All calls start in parallel; ordering NOT guaranteed
- Partial failures do not stop other tool calls
- Do NOT use the batch tool within another batch tool.

Good Use Cases:
- Read many files
- grep + glob + readFile combos
- Multiple terminal commands

When NOT to Use:
- Operations that depend on prior tool output (e.g. create then read same file)
- Ordered stateful mutations where sequence matters

Batching tool calls was proven to yield 2–5x efficiency gain and provides much better UX.`;

const toolCallSchema = z.object({
  tool: z.string().describe("The name of the tool to execute"),
  parameters: z
    .record(z.string(), z.unknown())
    .describe("Parameters for the tool"),
});

export const batchTool = tool({
  description: BATCH_DESCRIPTION,
  inputSchema: z.object({
    tool_calls: z
      .array(toolCallSchema)
      .min(1, "Provide at least one tool call")
      .max(10, "Maximum of 10 tools allowed in batch")
      .describe("Array of tool calls to execute in parallel"),
  }),
  execute: async ({ tool_calls }) => {
    try {
      const result = await executeTool("batch", { tool_calls });
      return result;
    } catch (error: any) {
      console.error(`Error executing batch: ${error}`);
      return {
        success: false,
        message: `Failed to execute batch: ${error.message || error}`,
        error: "BATCH_EXECUTION_ERROR",
      };
    }
  },
});
