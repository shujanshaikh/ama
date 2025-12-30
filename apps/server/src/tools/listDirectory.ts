import { z } from "zod";
import { tool } from "ai";
import { executeTool } from "@/lib/executeTool";

const listSchema = z.object({
    path: z.string().optional(),
    recursive: z.boolean().optional().describe("Whether to list files recursively"),
    maxDepth: z.number().optional().describe("Maximum recursion depth (default: unlimited)"),
    pattern: z.string().optional().describe("File extension (e.g., '.ts') or glob-like pattern"),
    includeDirectories: z.boolean().optional().describe("Whether to include directories in results (default: true)"),
    includeFiles: z.boolean().optional().describe("Whether to include files in results (default: true)"),
  })

export const listDirectory = tool({
    description: 'Lists files and directories in a given path. The path parameter must be absolute; omit it to use the current workspace directory. You can optionally provide an array of glob patterns to ignore with the ignore parameter. You should generally prefer the Glob and Grep tools, if you know which directories to search.',
    inputSchema: listSchema,
    execute: async ({ path, recursive, maxDepth, pattern, includeDirectories, includeFiles }) => {
        try {
            const result = await executeTool("listDirectory", {
                path,
                recursive,
                maxDepth,
                pattern,
                includeDirectories,
                includeFiles,
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