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
        path: z.string().optional().describe('Subdirectory to search in'),
        sortByMtime: z.boolean().optional().describe('Sort results by file modification time (default: false)'),
    }).optional(),
})

export const grepTool = tool({
    description: `Fast content search tool that works with any codebase size.

- Searches file contents using regular expressions
- Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (e.g., "*.js", "*.{ts,tsx}")
- Returns file paths and line numbers with at least one match sorted by modification time
- Use this tool when you need to find files containing specific patterns
- If you need to identify/count the number of matches within files, use the Bash tool with \`rg\` (ripgrep) directly. Do NOT use \`grep\`.
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
`,
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