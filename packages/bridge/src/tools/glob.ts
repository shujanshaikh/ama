import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

const globSchema = z.object({
  pattern: z.string().describe("Glob pattern to match files"),
  path: z.string().optional().describe("Optional directory path to limit the search scope."),
});

export function createGlobTool(context: ToolExecutionContext) {
  return tool({
    description: "Fast file pattern matching tool.",
    inputSchema: globSchema,
    execute: async ({ pattern, path }) => {
      return executeTool(context, "glob", { pattern, path });
    },
  });
}
