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
    description: 'Lists files and directories in a tree structure. Returns a visual tree output with directories and files. By default, searches recursively up to depth 3 and excludes common directories like node_modules, .git, dist, etc. Use pattern to filter by file extension. Prefer Glob or Grep tools for specific file searches.',
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