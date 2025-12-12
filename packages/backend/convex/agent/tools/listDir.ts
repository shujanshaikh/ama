import { z } from "zod";
import { createTool } from "@convex-dev/agent";
import { internal } from "../../_generated/api";
import { waitForToolResult } from "../lib/waitForToolResult";

const listSchema = z.object({
    path: z.string().optional(),
    recursive: z.boolean().optional().describe("Whether to list files recursively"),
    maxDepth: z.number().optional().describe("Maximum recursion depth (default: unlimited)"),
    pattern: z.string().optional().describe("File extension (e.g., '.ts') or glob-like pattern"),
    includeDirectories: z.boolean().optional().describe("Whether to include directories in results (default: true)"),
    includeFiles: z.boolean().optional().describe("Whether to include files in results (default: true)"),
  })


export const listDirTool = createTool({
    description: "List the contents of a directory. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is",
    args: listSchema,
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
                    toolName: "list",
                    args: args,
                }
            );
            // Wait for CLI to execute and return result
            const result = await waitForToolResult(ctx, toolCallId);
            // Return the result in the expected format
            if (result.success === false) {
                return {
                    success: false,
                    message: result.message || "Failed to list directory",
                    error: result.error || 'LIST_DIR_ERROR',
                };
            }
            return {
                success: true,
                message: result.message || `Successfully listed directory`,
                content: result.content,
            };
        } catch (error: any) {
            console.error(`Error listing directory: ${error}`);
            return {
                success: false,
                message: `Failed to list directory: ${error.message || error}`,
                error: 'LIST_DIR_ERROR',
            };
        }
    },
})