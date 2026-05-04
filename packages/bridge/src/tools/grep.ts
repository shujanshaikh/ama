import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

export function createGrepTool(context: ToolExecutionContext) {
  return tool({
    description: "Search file contents for a pattern.",
    inputSchema: z.object({
      pattern: z.string().describe("Search pattern (regex or literal string)"),
      path: z.string().optional().describe("Directory or file to search (default: current directory)"),
      glob: z.string().optional().describe("Filter files by glob pattern, e.g. '*.ts'"),
      ignoreCase: z.boolean().optional().describe("Case-insensitive search (default: false)"),
      literal: z.boolean().optional().describe("Treat pattern as literal string instead of regex (default: false)"),
      context: z.number().optional().describe("Number of lines around each match"),
      limit: z.number().optional().describe("Maximum number of matches to return (default: 100)"),
    }),
    execute: async (input) => executeTool(context, "grep", input),
  });
}
