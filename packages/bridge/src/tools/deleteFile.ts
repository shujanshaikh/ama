import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

export function createDeleteFileTool(context: ToolExecutionContext) {
  return tool({
    description: "Use this tool to delete a file",
    inputSchema: z.object({
      path: z.string().describe("Relative file path to delete"),
    }),
    execute: async ({ path }) => {
      return executeTool(context, "deleteFile", { path });
    },
  });
}
