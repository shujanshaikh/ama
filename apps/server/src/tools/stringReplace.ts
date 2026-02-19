import { tool } from "ai";
import { z } from "zod";
import { executeTool } from "@/lib/executeTool";

export const stringReplace = tool({
    description: "Replace a string in a file. Uses fuzzy matching fallback strategies (line-trimmed, whitespace-normalized, indentation-flexible, etc.) when exact match fails. You can use either a relative path in the workspace or an absolute path.",
    inputSchema: z.object({
        file_path: z.string().describe("The path to the file you want to search and replace in. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is"),
        new_string: z.string().describe("The edited text to replace the old_string (must be different from the old_string)"),
        old_string: z.string().describe("The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)"),
        replaceAll: z.boolean().optional().describe("Replace all occurrences of old_string (default false)"),
    }),
    execute: async ({ file_path, new_string, old_string, replaceAll }) => {
        try {
            const result = await executeTool("stringReplace", {
                file_path,
                new_string,
                old_string,
                replaceAll,
            });
            return result;
        } catch (error: any) {
            console.error(`Error applying patch: ${error}`);
            return {
                success: false,
                message: `Failed to apply patch: ${error.message || error}`,
                error: 'APPLY_PATCH_ERROR',
            };
        }
    }
})
