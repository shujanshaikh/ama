import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { waitForToolResult } from "../lib/waitForToolResult";

const deleteFileSchema = z.object({
    path: z.string().describe('Relative file path to delete'),
});

export const deleteFile = createTool({
    description: "Delete a file. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is",
    args: deleteFileSchema,
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
                    toolName: "deleteFile",
                    args: args,
                }
            );

            // Wait for CLI to execute and return result
            const result = await waitForToolResult(ctx, toolCallId);

            // Return the result in the expected format
            if (result.success === false) {
                return {
                    success: false,
                    message: result.message || "Failed to delete file",
                    error: result.error || 'DELETE_FILE_ERROR',
                };
            }

            return {
                success: true,
                message: result.message || `Successfully deleted file`,
                content: result.content,
            };
        } catch (error: any) {
            console.error(`Error deleting file: ${error}`);
            return {
                success: false,
                message: `Failed to delete file: ${error.message || error}`,
                error: 'DELETE_FILE_ERROR',
            };
        }
    },
})