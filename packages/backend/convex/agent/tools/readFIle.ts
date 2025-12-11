import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { WEB_APP_URL } from "./constant";

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
            const response = await fetch(`${WEB_APP_URL}/read-file`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(args),
            });
            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to read file: ${response.status} ${response.statusText}`,
                    error: 'READ_FILE_ERROR',
                };
            }
            const fileContent = await response.json();
            return {
                success: true,
                message: `Successfully read file ${fileContent}`,
                content: fileContent,
            };
        } catch (error) {
            console.error(`Error : ${error}`)
            return {
                success: false,
                message: `Failed to read file: ${error}`,
                error: 'READ_FILE_ERROR',
            };
        }
    },
})