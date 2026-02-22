import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

const toolCallSchema = z.object({
  tool: z.string().describe("The name of the tool to execute"),
  parameters: z.record(z.string(), z.unknown()).describe("Parameters for the tool"),
});

export function createBatchTool(context: ToolExecutionContext) {
  return tool({
    description: "Executes multiple independent tool calls concurrently.",
    inputSchema: z.object({
      tool_calls: z.array(toolCallSchema).min(1).max(25),
    }),
    execute: async ({ tool_calls }) => {
      return executeTool(context, "batch", { tool_calls });
    },
  });
}
