import { z } from "zod";
import { tool } from "ai";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

const listSchema = z.object({
  path: z.string().optional(),
  recursive: z.boolean().optional(),
  maxDepth: z.number().optional(),
  pattern: z.string().optional(),
  showHidden: z.boolean().optional(),
  includeMetadata: z.boolean().optional(),
  ignore: z.array(z.string()).optional(),
});

export function createListDirectoryTool(context: ToolExecutionContext) {
  return tool({
    description: "Lists files and directories in a given path.",
    inputSchema: listSchema,
    execute: async ({ path, recursive, maxDepth, pattern, showHidden, includeMetadata, ignore }) => {
      return executeTool(context, "listDirectory", {
        path,
        recursive,
        maxDepth,
        pattern,
        showHidden,
        includeMetadata,
        ignore,
      });
    },
  });
}
