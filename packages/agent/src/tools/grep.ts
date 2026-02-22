import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { spawn } from "node:child_process";
import { validatePath } from "../lib/sandbox.ts";

export const GREP_LIMITS = {
    DEFAULT_MAX_MATCHES: 200,
    MAX_LINE_LENGTH: 2000, // aligned with OpenCode's 2000-char truncation
    MAX_TOTAL_OUTPUT_SIZE: 1 * 1024 * 1024,
    EXECUTION_TIMEOUT_MS: 15_000,
    TRUNCATION_MESSAGE:
        '\n[Results truncated due to size limits. Use more specific patterns or file filters to narrow your search.]',
};

const grepSchema = z.object({
    query: z.string().describe('The regex pattern to search for'),
    options: z.object({
        includePattern: z.string().optional().describe('Glob pattern for files to include (e.g., "*.ts", "*.{ts,tsx}")'),
        excludePattern: z.string().optional().describe('Glob pattern for files to exclude'),
        caseSensitive: z.boolean().optional().describe('Whether the search should be case sensitive'),
        path: z.string().optional().describe('Subdirectory to search in'),
        sortByMtime: z.boolean().optional().describe('Sort results by file modification time (default: true)'),
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
let _cachedRgChecked = false;

async function getRipgrepPath(): Promise<string | null> {
    if (_cachedRgChecked) return _cachedRgPath;

    const candidates: string[] = [];
    if (process.env.RG_PATH) {
        candidates.push(process.env.RG_PATH);
    }

    candidates.push('/opt/homebrew/bin/rg', '/usr/local/bin/rg', '/usr/bin/rg');

    const pathEntries = process.env.PATH?.split(path.delimiter) ?? [];
    const rgNames = process.platform === 'win32' ? ['rg.exe', 'rg'] : ['rg'];
    for (const entry of pathEntries) {
        for (const name of rgNames) {
            candidates.push(path.join(entry, name));
        }
    }

    for (const rgPath of candidates) {
        if (rgPath && fs.existsSync(rgPath)) {
            _cachedRgPath = rgPath;
            _cachedRgChecked = true;
            return rgPath;
        }
    }

    _cachedRgChecked = true;
    _cachedRgPath = null;
    return null;
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
                const mtime = await fsp
                    .stat(filePath)
                    .then((stats) => stats.mtimeMs)
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
        const { includePattern, excludePattern, caseSensitive, path: subPath, sortByMtime = true } = options || {};

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

        if (!rgPath) {
            return {
                success: false,
                message: 'Ripgrep (rg) not found on PATH. Install ripgrep to use this tool.',
                error: 'GREP_NOT_FOUND',
            };
        }

        const args: string[] = [
            '-nH',          // line numbers + filename (compact form, matching OpenCode)
            '--hidden',     // search hidden files (aligned with OpenCode)
            '--no-messages', // suppress error messages for unreadable files
            '--color=never',
            `--max-count=${GREP_LIMITS.DEFAULT_MAX_MATCHES}`,
            '--max-columns=2000',
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

        // Default exclusions
        args.push('--glob', '!node_modules/**');
        args.push('--glob', '!.git/**');
        args.push('--glob', '!dist/**');
        args.push('--glob', '!build/**');
        args.push('--glob', '!*.min.js');
        args.push('--glob', '!*.min.css');
        args.push('--glob', '!package-lock.json');
        args.push('--glob', '!yarn.lock');
        args.push('--glob', '!bun.lockb');
        args.push('--glob', '!pnpm-lock.yaml');

        args.push('--regexp', query);
        args.push(searchDir);

        const proc = spawn(rgPath, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        // Timeout + cancellation for ripgrep
        let timedOut = false;
        let stdout = '';
        let stderr = '';
        let outputTruncated = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            proc.kill('SIGTERM');
        }, GREP_LIMITS.EXECUTION_TIMEOUT_MS);

        if (proc.stdout) {
            proc.stdout.on('data', (chunk: Buffer | string) => {
                const text = chunk.toString();
                if (stdout.length >= GREP_LIMITS.MAX_TOTAL_OUTPUT_SIZE) {
                    outputTruncated = true;
                    return;
                }
                const remaining = GREP_LIMITS.MAX_TOTAL_OUTPUT_SIZE - stdout.length;
                if (text.length > remaining) {
                    stdout += text.slice(0, remaining);
                    outputTruncated = true;
                    return;
                }
                stdout += text;
            });
        }

        if (proc.stderr) {
            proc.stderr.on('data', (chunk: Buffer | string) => {
                stderr += chunk.toString();
            });
        }

        const exitCode = await new Promise<number | null>((resolve, reject) => {
            proc.once('error', reject);
            proc.once('close', (code) => resolve(code));
        });

        clearTimeout(timeoutId);

        if (timedOut) {
            return {
                success: false,
                message: `Search timed out after ${GREP_LIMITS.EXECUTION_TIMEOUT_MS}ms. Use more specific patterns.`,
                error: 'GREP_TIMEOUT',
            };
        }

        // exit code 1 = no matches (not an error)
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

        // exit code 2 = partial errors (e.g. broken symlinks, permission issues)
        // Still process any results we got - don't treat as full failure
        if (exitCode !== 0 && exitCode !== 2) {
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

                // Truncate long lines (aligned with OpenCode's 2000-char limit)
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

        // Sort by mtime by default (aligned with OpenCode behavior)
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

        const truncated = rawMatches.length > GREP_LIMITS.DEFAULT_MAX_MATCHES || outputTruncated;
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
