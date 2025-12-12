import { z } from "zod";
import { glob } from "node:fs/promises";

const globSchema = z.object({
    pattern: z.string().describe('Glob pattern (e.g., "**/*.js")'),
    path: z.string().optional().describe('Relative directory path to search in'),
})

export const globTool = async function(input: z.infer<typeof globSchema>) {
    const { pattern, path } = input;

        if (!pattern) {
            return {
                success: false,
                message: 'Missing required parameter: pattern',
                error: 'MISSING_PATTERN',
            };
        }

        try {
            const searchPath = path || process.cwd();

            const filesGenerator = glob(pattern, {
                cwd: searchPath,
            });

            // Convert AsyncGenerator to array
            const files: string[] = [];
            for await (const file of filesGenerator) {
                files.push(file);
            }

            const searchLocation = path ? ` in "${path}"` : ' in current directory';
            const message = `Found ${files.length} matches for pattern "${pattern}"${searchLocation}`;

            return {
                success: true,
                message: message,
                content: files,
            }



        } catch (error) {

            return {
                success: false,
                message: `Failed to find files matching pattern: ${pattern}`,
                error: 'GLOB_ERROR',
            };

        }
    }
