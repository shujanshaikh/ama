import { z } from "zod";
import { readFile, stat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { validatePath, resolveProjectPath } from "../sandbox";


const deleteFileSchema = z.object({
    path: z.string().describe('Relative file path to delete'),
});


export const deleteFile = async function(input: z.infer<typeof deleteFileSchema>, projectCwd?: string) {
    const parsedInput = deleteFileSchema.safeParse(input);
    if (!parsedInput.success) {
        return {
            success: false,
            message: `Invalid deleteFile input: ${parsedInput.error.issues[0]?.message ?? "Invalid input"}`,
            error: "INVALID_INPUT",
        };
    }

    const { path: realPath } = parsedInput.data;
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

        if (!existsSync(absolute_file_path)) {
            return {
                success: false,
                message: `File not found: ${realPath}`,
                error: 'FILE_NOT_FOUND',
            };
        }

        try {
            const fileStats = await stat(absolute_file_path);
            if (!fileStats.isFile()) {
                return {
                    success: false,
                    message: `Path is not a file: ${realPath}`,
                    error: "NOT_A_FILE",
                };
            }
        } catch {
            return {
                success: false,
                message: `Unable to stat path before deletion: ${realPath}`,
                error: "STAT_ERROR",
            };
        }

        // Read original content before deletion
        let originalContent: string | undefined;
        let readWarning: string | undefined;
        try {
            originalContent = await readFile(absolute_file_path, "utf-8");
        } catch {
            // Continue with deletion even if pre-read fails (e.g. binary/encoding issues).
            readWarning = `Unable to read file content before deletion: ${realPath}`;
        }

        // Delete the file
        try {
            await unlink(absolute_file_path);
        } catch {
            return {
                success: false,
                message: `Failed to delete file: ${realPath}`,
                error: 'DELETE_ERROR',
            };
        }

        return {
            success: true,
            message: `Successfully deleted file: ${realPath}`,
            content: originalContent,
            warning: readWarning,
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to delete file: ${realPath}`,
            error: 'DELETE_ERROR',
        };
    }
}
