
import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

export const readFile = tool({
    description: `Reads a file or directory from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The filePath parameter should be an absolute path, but relative paths will also be resolved
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than 2000 characters will be truncated
- Results are returned with line numbers (e.g., "1: content")
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
- This tool can also read directories, returning a sorted list of entries with trailing "/" for subdirectories.
- Binary files are detected and rejected with a clear error.
- If a file is not found, similar filenames from the same directory are suggested.`,
    inputSchema: z.object({
        relative_file_path: z
            .string()
            .describe("The path to the file or directory to read."),
        should_read_entire_file: z
            .boolean()
            .optional()
            .default(true)
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
