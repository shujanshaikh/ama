import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

const grepSchema = z.object({
  query: z.string().describe("The regex pattern to search for"),
  options: z
    .object({
      includePattern: z.string().optional(),
      excludePattern: z.string().optional(),
      caseSensitive: z.boolean().optional(),
      path: z.string().optional(),
      sortByMtime: z.boolean().optional(),
    })
    .optional(),
});

export function createGrepTool(context: ToolExecutionContext) {
  return tool({
    description: "Fast content search tool.",
    inputSchema: grepSchema,
    execute: async ({ query, options }) => {
      return executeTool(context, "grep", { query, options });
    },
  });
}
