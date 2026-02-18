import { z } from "zod";
import { tool } from "ai";
import { executeTool } from "@/lib/executeTool";

const editFilesSchema = z.object({
    target_file: z
      .string()
      .describe("The relative path to the file to modify. The tool will create any directories in the path that don't exist"),
    content: z.string().describe("The content to write to the file"),
    providedNewFile: z.boolean().describe("Set to true if providing the full new file content (as opposed to making a patch or partial edit)").optional(),
});

export const editFile = tool({
    description: `Edit or overwrite the contents of a file at the given relative path.
- Use this tool to make code or text changes to any file.
- Specify the complete desired file content in the 'content' parameter.
- Will create the file and any required directories if they do not already exist.
- Set 'providedNewFile' to true if you are supplying the complete new file content.
Use for code rewrites, config changes, and any updates where you know the full intended state for the file.`,
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