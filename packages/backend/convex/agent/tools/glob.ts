import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { waitForToolResult } from "../lib/waitForToolResult";
import { internal } from "../../_generated/api";

const globSchema = z.object({
    pattern: z.string().describe('Glob pattern (e.g., "**/*.js")'),
    path: z.string().optional().describe('Relative directory path to search in'),
})

export const globTool = createTool({
    description: "Find files matching a glob pattern. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is",
    args: globSchema,
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
                    toolName: "glob",
                    args: args,
                }
            );

            // Wait for CLI to execute and return result
            const result = await waitForToolResult(ctx, toolCallId);

            // Return the result in the expected format
            if (result.success === false) {
                return {
                    success: false,
                    message: result.message || "Failed to find files matching pattern",
                    error: result.error || 'GLOB_ERROR',
                };
            }

            return {
                success: true,
                message: result.message || `Successfully found files matching pattern`,
                content: result.content,
            };
        } catch (error: any) {
            console.error(`Error finding files matching pattern: ${error}`);
            return {
                success: false,
                message: `Failed to find files matching pattern: ${error.message || error}`,
                error: 'GLOB_ERROR',
            };
        }
    },
})

