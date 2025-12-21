import { z } from "zod";
import { glob } from "node:fs/promises";
import path from "node:path";
import { validatePath, resolveProjectPath } from "../lib/sandbox";

const globSchema = z.object({
    pattern: z.string().describe('Glob pattern (e.g., "**/*.js")'),
    path: z.string().optional().describe('Relative directory path to search in'),
})

export const globTool = async function(input: z.infer<typeof globSchema>, projectCwd?: string) {
    const { pattern, path: inputPath } = input;

        if (!pattern) {
            return {
                success: false,
                message: 'Missing required parameter: pattern',
                error: 'MISSING_PATTERN',
            };
        }

        try {
            const basePath = projectCwd || process.cwd();
            const searchPath = inputPath ? resolveProjectPath(inputPath, basePath) : basePath;
            
            // Validate search path if projectCwd is provided and inputPath is given
            if (projectCwd && inputPath) {
                const validation = validatePath(inputPath, projectCwd);
                if (!validation.valid) {
                    return {
                        success: false,
                        message: validation.error || 'Path validation failed',
                        error: 'ACCESS_DENIED',
                    };
                }
            }

            const filesGenerator = glob(pattern, {
                cwd: searchPath,
            });

            // Convert AsyncGenerator to array
            const files: string[] = [];
            for await (const file of filesGenerator) {
                files.push(file);
            }

            const searchLocation = inputPath ? ` in "${inputPath}"` : ' in current directory';
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
