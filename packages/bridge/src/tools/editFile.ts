import { z } from "zod";
import { tool } from "ai";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

export function createEditFileTool(context: ToolExecutionContext) {
  return tool({
    description: "Write content to a file. Creates or overwrites the target file.",
    inputSchema: z.object({
      path: z.string().describe("Path to the file to write (relative or absolute)"),
      content: z.string().describe("Content to write to the file"),
    }),
    execute: async ({ path, content }) => executeTool(context, "write", { path, content }),
  });
}
