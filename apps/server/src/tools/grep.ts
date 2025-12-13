import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";


export const GREP_LIMITS = {
    DEFAULT_MAX_MATCHES: 200,
    MAX_TOTAL_OUTPUT_SIZE: 1 * 1024 * 1024,
    TRUNCATION_MESSAGE:
        '\n[Results truncated due to size limits. Use more specific patterns or file filters to narrow your search.]',
};

const grepSchema = z.object({
    query: z.string().describe('The regex pattern to search for'),
    options: z.object({
        includePattern: z.string().optional().describe('Glob pattern for files to include (e.g., "*.ts")'),
        excludePattern: z.string().optional().describe('Glob pattern for files to exclude'),
        caseSensitive: z.boolean().optional().describe('Whether the search should be case sensitive'),
    })
})

export const grepTool = tool({
    description: 'Use this tool to search for a pattern in a file',
    inputSchema: grepSchema,
    execute: async ({ query, options }) => {
        try {
            const result = await executeTool("grep", {
                query,
                options,
            });
            return result;
        } catch (error: any) {
            console.error(`Error searching for pattern: ${error}`);
            return {
                success: false,
                message: `Failed to search for pattern: ${error.message || error}`,
                error: 'GREP_ERROR',
            };
        }
    },
});