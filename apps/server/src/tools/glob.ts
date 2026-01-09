import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";
    
const globSchema = z.object({
    pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.js", "src/**/*.ts", "*.json"). Supports standard glob syntax with *, **, and ? wildcards'),
    path: z.string().optional().describe('Optional relative directory path within the project to limit the search scope. If not provided, searches from the project root'),
})


export const globTool = tool({
    description: 'Search for files in the project using glob patterns. Supports wildcards like *, **, and ? to match multiple files. Optionally specify a subdirectory to limit the search scope.',
    inputSchema: globSchema,
    execute: async ({ pattern, path }) => {
        try {
            const result = await executeTool("glob", {
                pattern,
                path,
            });
            return result;
        } catch (error: any) {
            console.error(`Error searching for files matching pattern: ${error}`);
            return {
                success: false,
                message: `Failed to search for files matching pattern: ${pattern}`,
                error: 'GLOB_ERROR',
            };
        }
    },
});