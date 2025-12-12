import { z } from "zod";
import { createTool } from "@convex-dev/agent";
import { internal } from "../../_generated/api";
import { waitForToolResult } from "../lib/waitForToolResult";

const grepSchema = z.object({
    query: z.string().describe('The regex pattern to search for'),
    options: z.object({
      includePattern: z.string().optional().describe('Glob pattern for files to include (e.g., "*.ts")'),
      excludePattern: z.string().optional().describe('Glob pattern for files to exclude'),
      caseSensitive: z.boolean().optional().describe('Whether the search should be case sensitive'),
    })
  })


export const grepTool = createTool({
    description: "Search for a regex pattern in the workspace. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is",
    args: grepSchema,
    handler: async (ctx, args) => {
        try {
            const activeSession = await ctx.runQuery(
                internal.agent.toolQueue.getActiveSession,
                {}
            );
            if (!activeSession) {
                return {
                    success: false,
                    message: "No CLI session connected. Please start the CLI agent.",
                    error: 'NO_CLI_CONNECTED',
                };
            }
            // Queue the tool call
            const toolCallId = await ctx.runMutation(
                internal.agent.toolQueue.queueToolCall,
                {
                    threadId: ctx.threadId!,
                    sessionId: activeSession,
                    toolName: "grep",
                    args: args,
                }
            );
            const result = await waitForToolResult(ctx, toolCallId);
            if (result.success === false) {
                return {
                    success: false,
                    message: result.message || "Failed to search for regex pattern",
                    error: result.error || 'GREP_ERROR',
                };
            }
            return {
                success: true,
                message: result.message || `Successfully searched for regex pattern`,
                content: result.content,
            };
        } catch (error: any) {
            console.error(`Error searching for regex pattern: ${error}`);
            return {
                success: false,
                message: `Failed to search for regex pattern: ${error.message || error}`,
                error: 'GREP_ERROR',
            };
        }
    },
})