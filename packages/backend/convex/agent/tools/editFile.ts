import { z } from "zod";
import { createTool } from "@convex-dev/agent";
import { waitForToolResult } from "../lib/waitForToolResult";
import { internal } from "../../_generated/api";

export const editFiles = createTool({
    description: "Edit a file. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is",
    args: z.object({
        target_file: z
            .string()
            .describe("The relative path to the file to modify. The tool will create any directories in the path that don't exist"),
        content: z.string().describe("The content to write to the file"),
        providedNewFile: z.boolean().describe("The new file content to write to the file").optional(),
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

            // Queue the tool call
            const toolCallId = await ctx.runMutation(
                internal.agent.toolQueue.queueToolCall,
                {
                    threadId: ctx.threadId!,
                    sessionId: activeSession,
                    toolName: "editFiles",
                    args: args,
                }
            );

            // Wait for CLI to execute and return result
            const result = await waitForToolResult(ctx, toolCallId);

            // Return the result in the expected format
            if (result.success === false) {
                return {
                    success: false,
                    message: result.message || "Failed to edit file",
                    error: result.error || 'EDIT_FILE_ERROR',
                };
            }

            return {
                success: true,
                message: result.message || `Successfully edited file`,
                content: result.content,
            };
        } catch (error: any) {
            console.error(`Error editing file: ${error}`);
            return {
                success: false,
                message: `Failed to edit file: ${error.message || error}`,
                error: 'EDIT_FILE_ERROR',
            };
        }
    },
})