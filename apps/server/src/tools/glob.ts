import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";
    
const globSchema = z.object({
    pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.js", "src/**/*.ts", "*.json"). Supports standard glob syntax with *, **, and ? wildcards'),
    path: z.string().optional().describe('Optional relative directory path within the project to limit the search scope. If not provided, searches from the project root'),
    sortByMtime: z.boolean().optional().describe('Sort results by modification time (default: false — faster without I/O)'),
})


export const globTool = tool({
    description: `Fast file pattern matching tool that works with any codebase size.

- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.
`,
    inputSchema: globSchema,
    execute: async ({ pattern, path, sortByMtime }) => {
        try {
            const result = await executeTool("glob", {
                pattern,
                path,
                sortByMtime,
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