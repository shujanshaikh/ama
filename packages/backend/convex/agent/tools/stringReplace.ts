import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { WEB_APP_URL } from "./constant";

export const stringReplace = createTool({
    description: "Replace a string in a file. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is",
    args: z.object({
        file_path: z.string().describe("The path to the file you want to search and replace in. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is"),
        new_string: z.string().describe("The edited text to replace the old_string (must be different from the old_string)"),
        old_string: z.string().describe("The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)"),
    }),
    handler: async (ctx, args) => {
        try {
            const response = await fetch(`${WEB_APP_URL}/apply-patch`, {
              method: "POST",
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(args),
            });
            if(!response.ok){
              return {
                success: false,
                message: `Failed to apply patch: ${response.status} ${response.statusText}`,
                error: 'APPLY_PATCH_ERROR',
              };
            }
            const patchContent = await response.json();
            return {
              success: true,
              message: `Successfully applied patch`,
              content: patchContent,
            };
          } catch (error) {
            console.error(`Error : ${error}`)
            return {
              success: false,
              message: `Failed to apply patch: ${error}`,
              error: 'APPLY_PATCH_ERROR',
            };
          }
        },
    })