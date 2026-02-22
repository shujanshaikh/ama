import { tool } from "ai";
import { z } from "zod";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

export function createStringReplaceTool(context: ToolExecutionContext) {
  return tool({
    description: "Replace a string in a file.",
    inputSchema: z.object({
      file_path: z.string(),
      new_string: z.string(),
      old_string: z.string(),
      replaceAll: z.boolean().optional(),
    }),
    execute: async ({ file_path, new_string, old_string, replaceAll }) => {
      return executeTool(context, "stringReplace", {
        file_path,
        new_string,
        old_string,
        replaceAll,
      });
    },
  });
}
