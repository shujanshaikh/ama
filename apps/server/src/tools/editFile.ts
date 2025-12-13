import { z } from "zod";
import { tool } from "ai";
import { executeTool } from "@/lib/executeTool";

const editFilesSchema = z.object({
    target_file: z
      .string()
      .describe("The relative path to the file to modify. The tool will create any directories in the path that don't exist"),
    content : z.string().describe("The content to write to the file"),
    providedNewFile : z.boolean().describe("The new file content to write to the file").optional(),
  })


export const editFile = tool({
    description: 'Use this tool to edit a file',
    inputSchema: editFilesSchema,
    execute: async ({ target_file, content, providedNewFile }) => {
        try {
            const result = await executeTool("editFile", {
                target_file,
                content,
                providedNewFile,
            });
            return result;
        } catch (error: any) {
            console.error(`Error editing file: ${error}`);
            return {
                success: false,
                message: `Failed to edit file: ${error.message || error}`,
                error: 'EDIT_FILE_ERROR',
            };
        }
    },
});