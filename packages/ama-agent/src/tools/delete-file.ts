
import { z } from "zod";
import { readFile, unlink } from "node:fs/promises";
import { validatePath, resolveProjectPath } from "../lib/sandbox";


const deleteFileSchema = z.object({
    path: z.string().describe('Relative file path to delete'),
});


export const deleteFile = async function(input: z.infer<typeof deleteFileSchema>, projectCwd?: string) {
    const { path: realPath } = input;
        if (!realPath) {
            return {
                success: false,
                message: 'Missing required parameter: path',
                error: 'MISSING_PATH',
            };
        }
        
        // Validate path if projectCwd is provided
        if (projectCwd) {
            const validation = validatePath(realPath, projectCwd);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.error || 'Path validation failed',
                    error: 'ACCESS_DENIED',
                };
            }
        }
        
        try {
            const basePath = projectCwd || process.cwd();
            const absolute_file_path = resolveProjectPath(realPath, basePath);
            if (!absolute_file_path) {
                return {
                    success: false,
                    message: 'Invalid file path',
                    error: 'INVALID_FILE_PATH',
                };
            }
            const originalContent =
                await readFile(absolute_file_path);
            if (originalContent === undefined) {
                return {
                    success: false,
                    message: `Failed to read file before deletion: ${realPath}`,
                    error: 'READ_ERROR',
                };
            }

            const deleteResult = await unlink(absolute_file_path).catch(() => {
                return {
                    success: false,
                    message: `Failed to read file before deletion: ${realPath}`,
                    error: 'DELETE_ERROR',
                };
            });
            if(!deleteResult?.success){
                return {
                    success: false,
                    message: `Failed to delete file before deletion: ${realPath}`,
                    error: 'DELETE_ERROR',
                };
            }

            return {
                success: true,
                message: `Successfully deleted file: ${realPath}`,
                content: originalContent,
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete file: ${realPath}`,
                error: 'DELETE_ERROR',
            };
        }

}