import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { waitForToolResult } from "../lib/waitForToolResult";

export const readFile = createTool({
    description: "Read the contents of a file. For text files, the output will be the 1-indexed file contents from start_line_one_indexed to end_line_one_indexed_inclusive.",
    args: z.object({
        relative_file_path: z
            .string()
            .describe("The relative path to the file to read."),
        should_read_entire_file: z
            .boolean()
            .describe("Whether to read the entire file."),
        start_line_one_indexed: z
            .number()
            .optional()
            .describe(
                "The one-indexed line number to start reading from (inclusive).",
            ),
        end_line_one_indexed: z
            .number()
            .optional()
            .describe("The one-indexed line number to end reading at (inclusive)."),

    }),
    handler: async (ctx, args) => {
        try {
            // Get active CLI session
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
                    toolName: "readFile",
                    args: args,
                }
            );

            // Wait for CLI to execute and return result
            const result = await waitForToolResult(ctx, toolCallId);

            // Return the result in the expected format
            if (result.success === false) {
                return {
                    success: false,
                    message: result.message || "Failed to read file",
                    error: result.error || 'READ_FILE_ERROR',
                };
            }

            return {
                success: true,
                message: result.message || `Successfully read file`,
                content: result.content,
            };
        } catch (error: any) {
            console.error(`Error reading file: ${error}`);
            return {
                success: false,
                message: `Failed to read file: ${error.message || error}`,
                error: 'READ_FILE_ERROR',
            };
        }
    },
})