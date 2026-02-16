import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { validatePath } from "../lib/sandbox";

export const GREP_LIMITS = {
    DEFAULT_MAX_MATCHES: 200,
    MAX_LINE_LENGTH: 500,
    MAX_TOTAL_OUTPUT_SIZE: 1 * 1024 * 1024,
    EXECUTION_TIMEOUT_MS: 15_000,
    TRUNCATION_MESSAGE:
        '\n[Results truncated due to size limits. Use more specific patterns or file filters to narrow your search.]',
};

const grepSchema = z.object({
    query: z.string().describe('The regex pattern to search for'),
    options: z.object({
        includePattern: z.string().optional().describe('Glob pattern for files to include (e.g., "*.ts")'),
        excludePattern: z.string().optional().describe('Glob pattern for files to exclude'),
        caseSensitive: z.boolean().optional().describe('Whether the search should be case sensitive'),
        path: z.string().optional().describe('Subdirectory to search in'),
        sortByMtime: z.boolean().optional().describe('Sort results by file modification time (default: false)'),
    }).optional(),
});

interface GrepMatch {
    file: string;
    lineNumber: number;
    content: string;
    mtime: number;
}

// ── Cached ripgrep binary resolution (resolved once at module load) ─────
let _cachedRgPath: string | null = null;

async function getRipgrepPath(): Promise<string> {
    if (_cachedRgPath) return _cachedRgPath;

    const paths = [
        '/opt/homebrew/bin/rg',
        '/usr/local/bin/rg',
        '/usr/bin/rg',
    ];

    for (const rgPath of paths) {
        if (fs.existsSync(rgPath)) {
            _cachedRgPath = rgPath;
            return rgPath;
        }
    }

    _cachedRgPath = 'rg';
    return 'rg';
}

// Eagerly resolve at import time
getRipgrepPath();

async function getMtimesBatched(files: string[]): Promise<Map<string, number>> {
    const mtimeMap = new Map<string, number>();
    const BATCH_SIZE = 50;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async (filePath) => {
                const mtime = await Bun.file(filePath)
                    .stat()
                    .then((stats) => stats.mtime.getTime())
                    .catch(() => 0);
                return { path: filePath, mtime };
            })
        );
        results.forEach(({ path, mtime }) => mtimeMap.set(path, mtime));
    }

    return mtimeMap;
}

export const grepTool = async function(input: z.infer<typeof grepSchema>, projectCwd?: string) {
    const { query, options } = input;

    if (!query || query.trim() === '') {
        return {
            success: false,
            message: 'Missing required parameter: query',
            error: 'MISSING_QUERY',
        };
    }

    try {
        const { includePattern, excludePattern, caseSensitive, path: subPath, sortByMtime = false } = options || {};

        let searchDir = projectCwd || process.cwd();

        if (subPath) {
            searchDir = path.isAbsolute(subPath) ? subPath : path.resolve(searchDir, subPath);

            if (projectCwd) {
                const validation = validatePath(subPath, projectCwd);
                if (!validation.valid) {
                    return {
                        success: false,
                        message: validation.error || 'Path validation failed',
                        error: 'ACCESS_DENIED',
                    };
                }
            }
        }

        if (!fs.existsSync(searchDir)) {
            return {
                success: false,
                message: `Directory not found: ${searchDir}`,
                error: 'DIR_NOT_FOUND',
            };
        }

        const rgPath = await getRipgrepPath();

        const args: string[] = [
            '-n',
            '--with-filename',
            '--no-heading',
            '--color=never',
            '--max-count=100',
            '--max-columns=1000',
        ];

        if (!caseSensitive) {
            args.push('-i');
        }

        if (includePattern) {
            args.push('--glob', includePattern);
        }

        if (excludePattern) {
            args.push('--glob', `!${excludePattern}`);
        }

        args.push('--glob', '!node_modules/**');
        args.push('--glob', '!.git/**');
        args.push('--glob', '!dist/**');
        args.push('--glob', '!build/**');
        args.push('--glob', '!*.min.js');
        args.push('--glob', '!*.min.css');
        args.push('--glob', '!package-lock.json');
        args.push('--glob', '!yarn.lock');
        args.push('--glob', '!bun.lockb');

        args.push('--regexp', query);
        args.push(searchDir);

        const proc = Bun.spawn([rgPath, ...args], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        // Timeout + cancellation for ripgrep
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            proc.kill();
        }, GREP_LIMITS.EXECUTION_TIMEOUT_MS);

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        clearTimeout(timeoutId);

        if (timedOut) {
            return {
                success: false,
                message: `Search timed out after ${GREP_LIMITS.EXECUTION_TIMEOUT_MS}ms. Use more specific patterns.`,
                error: 'GREP_TIMEOUT',
            };
        }

        if (exitCode === 1) {
            return {
                success: true,
                matches: [],
                detailedMatches: [],
                query,
                matchCount: 0,
                message: `No matches found for pattern: ${query}`,
            };
        }

        if (exitCode !== 0) {
            return {
                success: false,
                message: `Ripgrep error: ${stderr || 'Unknown error'}`,
                error: 'GREP_EXEC_ERROR',
            };
        }

        const lines = stdout.trim().split('\n').filter(line => line.length > 0);
        const rawMatches: GrepMatch[] = [];
        const uniqueFiles = new Set<string>();

        for (const line of lines) {
            const firstColon = line.indexOf(':');
            const secondColon = line.indexOf(':', firstColon + 1);

            if (firstColon > 0 && secondColon > firstColon) {
                const file = line.substring(0, firstColon);
                const lineNumber = parseInt(line.substring(firstColon + 1, secondColon), 10);
                let content = line.substring(secondColon + 1);

                if (content.length > GREP_LIMITS.MAX_LINE_LENGTH) {
                    content = content.substring(0, GREP_LIMITS.MAX_LINE_LENGTH) + '...';
                }

                rawMatches.push({
                    file,
                    lineNumber,
                    content: content.trim(),
                    mtime: 0,
                });
                uniqueFiles.add(file);
            }
        }

        // Only fetch mtimes when sorting is requested (saves I/O)
        if (sortByMtime && uniqueFiles.size > 0) {
            const mtimeMap = await getMtimesBatched(Array.from(uniqueFiles));
            for (const match of rawMatches) {
                match.mtime = mtimeMap.get(match.file) || 0;
            }
            rawMatches.sort((a, b) => {
                if (b.mtime !== a.mtime) return b.mtime - a.mtime;
                return a.file.localeCompare(b.file);
            });
        }

        const truncated = rawMatches.length > GREP_LIMITS.DEFAULT_MAX_MATCHES;
        const finalMatches = truncated
            ? rawMatches.slice(0, GREP_LIMITS.DEFAULT_MAX_MATCHES)
            : rawMatches;

        const detailedMatches = finalMatches.map(m => ({
            file: m.file,
            lineNumber: m.lineNumber,
            content: m.content,
        }));

        const matches = finalMatches.map(m =>
            `${m.file}:${m.lineNumber}:${m.content}`
        );

        const groupedOutput: string[] = [`Found ${finalMatches.length} matches`];
        let currentFile = '';

        for (const match of finalMatches) {
            if (currentFile !== match.file) {
                if (currentFile !== '') {
                    groupedOutput.push('');
                }
                currentFile = match.file;
                groupedOutput.push(`${match.file}:`);
            }
            groupedOutput.push(`  Line ${match.lineNumber}: ${match.content}`);
        }

        if (truncated) {
            groupedOutput.push('');
            groupedOutput.push(GREP_LIMITS.TRUNCATION_MESSAGE);
        }

        return {
            success: true,
            matches,
            detailedMatches,
            query,
            matchCount: finalMatches.length,
            truncated,
            message: `Found ${finalMatches.length} matches for pattern: ${query}`,
            content: groupedOutput.join('\n'),
        };

    } catch (error: any) {
        console.error('[grep] error:', error);
        return {
            success: false,
            message: error?.message || String(error),
            error: 'GREP_EXEC_ERROR',
        };
    }
}
