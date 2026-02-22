import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

export function createReadFileTool(context: ToolExecutionContext) {
  return tool({
    description: "Reads a file or directory from the local filesystem.",
    inputSchema: z.object({
      relative_file_path: z.string().describe("The path to the file or directory to read."),
      should_read_entire_file: z.boolean().optional().default(true),
      start_line_one_indexed: z.number().optional(),
      end_line_one_indexed: z.number().optional(),
    }),
    execute: async ({ relative_file_path, should_read_entire_file, start_line_one_indexed, end_line_one_indexed }) => {
      return executeTool(context, "readFile", {
        relative_file_path,
        should_read_entire_file,
        start_line_one_indexed,
        end_line_one_indexed,
      });
    },
  });
}
