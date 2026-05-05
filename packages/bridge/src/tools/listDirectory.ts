import { z } from "zod";
import { tool } from "ai";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

export function createListDirectoryTool(context: ToolExecutionContext) {
  return tool({
    description: "List directory contents.",
    inputSchema: z.object({
      path: z.string().optional().describe("Directory to list (default: current directory)"),
      limit: z.number().optional().describe("Maximum number of entries to return (default: 500)"),
    }),
    execute: async ({ path, limit }) => executeTool(context, "ls", { path, limit }),
  });
}
