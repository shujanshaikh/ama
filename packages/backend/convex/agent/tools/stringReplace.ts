import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { waitForToolResult } from "../lib/waitForToolResult";

export const stringReplace = createTool({
    description: "Replace a string in a file. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is",
    args: z.object({
        file_path: z.string().describe("The path to the file you want to search and replace in. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is"),
        new_string: z.string().describe("The edited text to replace the old_string (must be different from the old_string)"),
        old_string: z.string().describe("The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)"),
    }),
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

            const toolCallId = await ctx.runMutation(
                internal.agent.toolQueue.queueToolCall,
                {
                    threadId: ctx.threadId!,
                    sessionId: activeSession,
                    toolName: "stringReplace",
                    args: args,
                }
            );

            const result = await waitForToolResult(ctx, toolCallId);

            if (result.success === false) {
                return {
                    success: false,
                    message: result.message || "Failed to apply patch",
                    error: result.error || 'APPLY_PATCH_ERROR',
                };
            }

            return {
                success: true,
                message: result.message || `Successfully applied patch`,
                content: result,
            };
        } catch (error: any) {
            console.error(`Error applying patch: ${error}`);
            return {
                success: false,
                message: `Failed to apply patch: ${error.message || error}`,
                error: 'APPLY_PATCH_ERROR',
            };
        }
    },
})