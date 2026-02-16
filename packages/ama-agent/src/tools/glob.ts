import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { validatePath, resolveProjectPath } from "../lib/sandbox";

const globSchema = z.object({
    pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.js", "src/**/*.ts", "*.json"). Supports standard glob syntax with *, **, and ? wildcards'),
    path: z.string().optional().describe('Optional relative directory path within the project to limit the search scope. If not provided, searches from the project root'),
    sortByMtime: z.boolean().optional().describe('Sort results by modification time (default: false — faster without I/O)'),
});

const RESULT_LIMIT = 100;
const MTIME_BATCH_SIZE = 50;

interface FileWithMtime {
    path: string;
    mtime: number;
}

async function getMtimesBatched(files: string[]): Promise<FileWithMtime[]> {
    const results: FileWithMtime[] = [];

    for (let i = 0; i < files.length; i += MTIME_BATCH_SIZE) {
        const batch = files.slice(i, i + MTIME_BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(async (filePath) => {
                const mtime = await Bun.file(filePath)
                    .stat()
                    .then((stats) => stats.mtime.getTime())
                    .catch(() => 0);
                return { path: filePath, mtime };
            })
        );
        results.push(...batchResults);
    }

    return results;
}

export const globTool = async function(input: z.infer<typeof globSchema>, projectCwd?: string) {
    const { pattern, path: inputPath, sortByMtime = false } = input;

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

        if (!fs.existsSync(searchPath)) {
            return {
                success: false,
                message: `Directory not found: ${searchPath}`,
                error: 'DIR_NOT_FOUND',
            };
        }

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

        const glob = new Bun.Glob(pattern);
        const files: string[] = [];
        let truncated = false;

        for await (const match of glob.scan({
            cwd: searchPath,
            absolute: true,
            onlyFiles: true,
            followSymlinks: false,
        })) {
            if (match.includes('/node_modules/') || match.includes('/.git/')) {
                continue;
            }

            if (files.length >= RESULT_LIMIT) {
                truncated = true;
                break;
            }
            files.push(match);
        }

        // Only do mtime lookups when sorting is requested
        let sortedFiles: string[];
        if (sortByMtime && files.length > 0) {
            const filesWithMtime = await getMtimesBatched(files);
            filesWithMtime.sort((a, b) => b.mtime - a.mtime);
            sortedFiles = filesWithMtime.map(f => f.path);
        } else {
            sortedFiles = files;
        }

        const output: string[] = [];
        if (sortedFiles.length === 0) {
            output.push('No files found');
        } else {
            output.push(...sortedFiles);
            if (truncated) {
                output.push('');
                output.push('(Results are truncated. Consider using a more specific path or pattern.)');
            }
        }

        const searchLocation = inputPath ? ` in "${inputPath}"` : ' in current directory';
        const message = `Found ${sortedFiles.length} matches for pattern "${pattern}"${searchLocation}`;

        return {
            success: true,
            message,
            metadata: {
                count: sortedFiles.length,
                truncated,
            },
            content: output.join('\n'),
        };

    } catch (error) {
        console.error('[glob] error:', error);
        return {
            success: false,
            message: `Failed to find files matching pattern: ${pattern}`,
            error: 'GLOB_ERROR',
        };
    }
}
