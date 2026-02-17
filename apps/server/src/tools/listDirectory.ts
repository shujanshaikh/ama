import { z } from "zod";
import { tool } from "ai";
import { executeTool } from "@/lib/executeTool";

const listSchema = z.object({
    path: z.string().optional().describe("Relative path to the directory to list"),
    recursive: z.boolean().optional().describe("Whether to list files recursively (default: true)"),
    maxDepth: z.number().optional().describe("Maximum recursion depth (default: 3)"),
    pattern: z.string().optional().describe("File extension (e.g., '.ts') or glob-like pattern to filter files"),
    showHidden: z.boolean().optional().describe("Whether to show hidden files starting with '.' (default: false)"),
    includeMetadata: z.boolean().optional().describe("Whether to fetch file metadata like mtime (default: false — faster without I/O)"),
});

export const listDirectory = tool({
    description: "Lists files and directories in a given path. The path parameter must be absolute; omit it to use the current workspace directory. You can optionally provide an array of glob patterns to ignore with the ignore parameter. You should generally prefer the Glob and Grep tools, if you know which directories to search.",
    inputSchema: listSchema,
    execute: async ({ path, recursive, maxDepth, pattern, showHidden, includeMetadata }) => {
        try {
            const result = await executeTool("listDirectory", {
                path,
                recursive,
                maxDepth,
                pattern,
                showHidden,
                includeMetadata,
            });
            return result;
        } catch (error: any) {
            console.error(`Error listing directory: ${error}`);
            return {
                success: false,
                message: `Failed to list directory: ${error.message || error}`,
                error: 'LIST_DIRECTORY_ERROR',
            };
        }
    }
});