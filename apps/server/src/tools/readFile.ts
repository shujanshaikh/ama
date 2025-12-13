
import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

export const readFile = tool({
    description: "Read the contents of a file. For text files, the output will be the 1-indexed file contents from start_line_one_indexed to end_line_one_indexed_inclusive.",
    inputSchema: z.object({
        relative_file_path: z
            .string()
            .describe("The relative path to the file to read."),
        should_read_entire_file: z
            .boolean()
            .describe("Whether to read the entire file."),
        start_line_one_indexed: z
            .number()
            .optional()
            .describe(
                "The one-indexed line number to start reading from (inclusive).",
            ),
        end_line_one_indexed: z
            .number()
            .optional()
            .describe("The one-indexed line number to end reading at (inclusive)."),

    }),
    execute: async ({ relative_file_path, should_read_entire_file, start_line_one_indexed, end_line_one_indexed }) => {
        try {
            const result = await executeTool("readFile", {
                relative_file_path,
                should_read_entire_file,
                start_line_one_indexed,
                end_line_one_indexed,
            });
            return result;
        } catch (error: any) {
            console.error(`Error reading file: ${error}`);
            return {
                success: false,
                message: `Failed to read file: ${error.message || error}`,
                error: 'READ_FILE_ERROR',
            };
        }
    },
})