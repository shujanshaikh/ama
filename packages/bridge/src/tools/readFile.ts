import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

export function createReadFileTool(context: ToolExecutionContext) {
  return tool({
    description: "Read the contents of a file.",
    inputSchema: z.object({
      path: z.string().describe("Path to the file to read (relative or absolute)"),
      offset: z.number().optional().describe("Line number to start reading from (1-indexed)"),
      limit: z.number().optional().describe("Maximum number of lines to read"),
    }),
    execute: async ({ path, offset, limit }) => executeTool(context, "read", { path, offset, limit }),
  });
}
