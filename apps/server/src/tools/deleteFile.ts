import { executeTool } from "@/lib/executeTool";
import { tool } from "ai";
import { z } from "zod";

const deleteFileSchema = z.object({
    path: z.string().describe('Relative file path to delete'),
});

export const deleteFile = tool({
    description: 'Use this tool to delete a file',
    inputSchema: deleteFileSchema,
    execute: async ({ path }) => {
        try {
            const result = await executeTool("deleteFile", {
                path,
            });
            return result;
        } catch (error: any) {
            console.error(`Error deleting file: ${error}`);
            return {
                success: false,
                message: `Failed to delete file: ${error.message || error}`,
                error: 'DELETE_FILE_ERROR',
            };
        }
    },
});