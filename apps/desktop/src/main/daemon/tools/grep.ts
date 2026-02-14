import { z } from "zod";
import path from "node:path";
import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validatePath } from "../sandbox";

const execFileAsync = promisify(execFile);
let cachedRipgrepPath: string | null = null;

export const GREP_LIMITS = {
    DEFAULT_MAX_MATCHES: 200,
    MAX_LINE_LENGTH: 500,
    MAX_TOTAL_OUTPUT_SIZE: 1 * 1024 * 1024,
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
    }).optional(),
});

interface GrepMatch {
    file: string;
    lineNumber: number;
    content: string;
    mtime: number;
}

async function getRipgrepPath(): Promise<string> {
    if (cachedRipgrepPath) {
        return cachedRipgrepPath;
    }

    if (process.platform === 'win32') {
        try {
            const { stdout } = await execFileAsync('where', ['rg']);
            const firstPath = stdout
                .split(/\r?\n/)
                .map(line => line.trim())
                .find(Boolean);
            if (firstPath) {
                cachedRipgrepPath = firstPath;
                return firstPath;
            }
        } catch {
            // Fallback to PATH lookup below.
        }
        cachedRipgrepPath = 'rg';
        return cachedRipgrepPath;
    }

    // Check common ripgrep locations on Unix-like systems.
    const paths = [
        '/opt/homebrew/bin/rg',
        '/usr/local/bin/rg',
        '/usr/bin/rg',
        'rg', // Fallback to PATH
    ];

    for (const rgPath of paths) {
        if (path.isAbsolute(rgPath)) {
            if (existsSync(rgPath)) {
                cachedRipgrepPath = rgPath;
                return rgPath;
            }
            continue;
        }

        try {
            await execFileAsync('which', [rgPath]);
            cachedRipgrepPath = rgPath;
            return rgPath;
        } catch {
            continue;
        }
    }

    cachedRipgrepPath = 'rg'; // Default fallback
    return cachedRipgrepPath;
}

async function getMtimesBatched(files: string[]): Promise<Map<string, number>> {
    const mtimeMap = new Map<string, number>();
    const BATCH_SIZE = 50;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async (filePath) => {
                try {
                    const fileStats = await stat(filePath);
                    const mtime = fileStats.mtimeMs;
                    return { path: filePath, mtime };
                } catch {
                    return { path: filePath, mtime: 0 };
                }
            })
        );
        results.forEach(({ path, mtime }) => mtimeMap.set(path, mtime));
    }

    return mtimeMap;
}

export const grepTool = async function(input: z.infer<typeof grepSchema>, projectCwd?: string) {
    const parsedInput = grepSchema.safeParse(input);
    if (!parsedInput.success) {
        return {
            success: false,
            message: `Invalid grep input: ${parsedInput.error.issues[0]?.message ?? "Invalid input"}`,
            error: "INVALID_INPUT",
        };
    }

    const { query, options } = parsedInput.data;

    if (!query || query.trim() === '') {
        return {
            success: false,
            message: 'Missing required parameter: query',
            error: 'MISSING_QUERY',
        };
    }

    try {
        const { includePattern, excludePattern, caseSensitive, path: subPath } = options || {};

        let searchDir = projectCwd || process.cwd();

        // Handle subdirectory path
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

        // Verify directory exists
        if (!existsSync(searchDir)) {
            return {
                success: false,
                message: `Directory not found: ${searchDir}`,
                error: 'DIR_NOT_FOUND',
            };
        }

        const rgPath = await getRipgrepPath();

        // Build ripgrep arguments
        const args: string[] = [
            '-n',                    // Line numbers
            '--with-filename',       // Always show filename
            '--no-heading',          // Don't group by file
            '--color=never',         // No ANSI colors
            '--max-count=100',       // Max matches per file
            '--max-columns=1000',    // Truncate long lines
        ];

        // Case sensitivity (default: case insensitive)
        if (!caseSensitive) {
            args.push('-i');
        }

        // Include pattern (e.g., "*.ts", "*.{js,jsx}")
        if (includePattern) {
            args.push('--glob', includePattern);
        }

        // Exclude pattern
        if (excludePattern) {
            args.push('--glob', `!${excludePattern}`);
        }

        // Always exclude common directories
        args.push('--glob', '!node_modules/**');
        args.push('--glob', '!.git/**');
        args.push('--glob', '!dist/**');
        args.push('--glob', '!build/**');
        args.push('--glob', '!*.min.js');
        args.push('--glob', '!*.min.css');
        args.push('--glob', '!package-lock.json');
        args.push('--glob', '!yarn.lock');
        args.push('--glob', '!bun.lockb');

        // Add the pattern and search directory
        args.push('--regexp', query);
        args.push(searchDir);

        let stdout: string;
        let stderr: string;
        let exitCode: number;

        try {
            const result = await execFileAsync(rgPath, args, {
                timeout: 25000,
                maxBuffer: 8 * 1024 * 1024,
            });
            stdout = result.stdout;
            stderr = result.stderr;
            exitCode = 0;
        } catch (error: any) {
            // exit code 1 means no matches (not an error)
            if (error.code === 1 || error.status === 1) {
                return {
                    success: true,
                    matches: [],
                    detailedMatches: [],
                    query,
                    matchCount: 0,
                    message: `No matches found for pattern: ${query}`,
                };
            }

            // Other non-zero exit codes are errors
            stdout = error.stdout || '';
            stderr = error.stderr || '';
            exitCode = error.code || error.status || 2;

            if (exitCode !== 0 && !stdout) {
                return {
                    success: false,
                    message: `Ripgrep error: ${stderr || 'Unknown error'}`,
                    error: 'GREP_EXEC_ERROR',
                };
            }
        }

        // Parse ripgrep output
        const lines = stdout.trim().split('\n').filter(line => line.length > 0);
        const rawMatches: GrepMatch[] = [];
        const uniqueFiles = new Set<string>();

        const rgLinePattern = /^(.*?):(\d+):(.*)$/;
        for (const line of lines) {
            // Format: filepath:linenum:content
            // The non-greedy file capture works for Windows drive letters (e.g. C:\...:12:...).
            const match = line.match(rgLinePattern);
            if (!match) {
                continue;
            }

            const file = match[1];
            const lineNumber = parseInt(match[2], 10);
            let content = match[3];

            if (Number.isNaN(lineNumber)) {
                continue;
            }

            // Truncate long content
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

        // Get mtimes for sorting by recency
        const mtimeMap = await getMtimesBatched(Array.from(uniqueFiles));

        // Add mtimes to matches
        for (const match of rawMatches) {
            match.mtime = mtimeMap.get(match.file) || 0;
        }

        // Sort by mtime (most recent first), then by file path
        rawMatches.sort((a, b) => {
            if (b.mtime !== a.mtime) {
                return b.mtime - a.mtime;
            }
            return a.file.localeCompare(b.file);
        });

        // Apply limits
        const truncated = rawMatches.length > GREP_LIMITS.DEFAULT_MAX_MATCHES;
        const finalMatches = truncated
            ? rawMatches.slice(0, GREP_LIMITS.DEFAULT_MAX_MATCHES)
            : rawMatches;

        // Build output
        const detailedMatches = finalMatches.map(m => ({
            file: m.file,
            lineNumber: m.lineNumber,
            content: m.content,
        }));

        const matches = finalMatches.map(m =>
            `${m.file}:${m.lineNumber}:${m.content}`
        );

        // Group matches by file for formatted output
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

        let content = groupedOutput.join('\n');
        if (content.length > GREP_LIMITS.MAX_TOTAL_OUTPUT_SIZE) {
            content =
                content.slice(0, GREP_LIMITS.MAX_TOTAL_OUTPUT_SIZE) +
                GREP_LIMITS.TRUNCATION_MESSAGE;
        }

        return {
            success: true,
            matches,
            detailedMatches,
            query,
            matchCount: finalMatches.length,
            truncated,
            message: `Found ${finalMatches.length} matches for pattern: ${query}`,
            content,
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
