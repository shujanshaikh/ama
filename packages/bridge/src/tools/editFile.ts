import { z } from "zod";
import { tool } from "ai";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

const editFilesSchema = z.object({
  target_file: z.string().describe("The relative path to the file to modify."),
  content: z.string().describe("The content to write to the file"),
  providedNewFile: z.boolean().optional().describe("Set to true if providing the full new file content."),
});

export function createEditFileTool(context: ToolExecutionContext) {
  return tool({
    description: "Edit or overwrite the contents of a file at the given relative path.",
    inputSchema: editFilesSchema,
    execute: async ({ target_file, content, providedNewFile }) => {
      return executeTool(context, "editFile", {
        target_file,
        content,
        providedNewFile,
      });
    },
  });
}
