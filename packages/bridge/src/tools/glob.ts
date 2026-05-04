import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

export function createGlobTool(context: ToolExecutionContext) {
  return tool({
    description: "Search for files by glob pattern.",
    inputSchema: z.object({
      pattern: z.string().describe("Glob pattern to match files, e.g. '*.ts', '**/*.json'"),
      path: z.string().optional().describe("Directory to search in (default: current directory)"),
      limit: z.number().optional().describe("Maximum number of results (default: 1000)"),
    }),
    execute: async (input) => executeTool(context, "find", input),
  });
}
