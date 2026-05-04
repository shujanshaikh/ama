import { tool } from "ai";
import { z } from "zod";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

export function createStringReplaceTool(context: ToolExecutionContext) {
  return tool({
    description: "Edit a single file using exact text replacement.",
    inputSchema: z.object({
      path: z.string().describe("Path to the file to edit (relative or absolute)"),
      edits: z.array(z.object({
        oldText: z.string().describe("Exact text for one targeted replacement."),
        newText: z.string().describe("Replacement text for this targeted edit."),
      })).describe("One or more targeted replacements."),
    }),
    execute: async ({ path, edits }) => executeTool(context, "edit", { path, edits }),
  });
}
