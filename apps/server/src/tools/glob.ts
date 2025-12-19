import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";
    
const globSchema = z.object({
    pattern: z.string().describe('Glob pattern (e.g., "**/*.js")'),
    path: z.string().optional().describe('Relative directory path to search in'),
})


export const globTool = tool({
    description: 'Use this tool to find files matching a glob pattern in a given path',
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