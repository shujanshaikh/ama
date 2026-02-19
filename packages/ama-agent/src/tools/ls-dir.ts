import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { validatePath, resolveProjectPath } from "../lib/sandbox";

const DEFAULT_IGNORE_PATTERNS = [
    "node_modules",
    "__pycache__",
    ".git",
    "dist",
    "build",
    "target",
    "vendor",
    "bin",
    "obj",
    ".idea",
    ".vscode",
    ".zig-cache",
    "zig-out",
    ".coverage",
    "coverage",
    "tmp",
    "temp",
    ".cache",
    "cache",
    "logs",
    ".venv",
    "venv",
    "env",
    ".next",
    ".turbo",
    ".vercel",
    ".output",
];

const RESULT_LIMIT = 500;
const MTIME_BATCH_SIZE = 50;

const listSchema = z.object({
    path: z.string().optional().describe("Path to the directory to list"),
    recursive: z.boolean().optional().describe("Whether to list files recursively (default: true)"),
    maxDepth: z.number().optional().describe("Maximum recursion depth (default: 3)"),
    pattern: z.string().optional().describe("File extension (e.g., '.ts') or glob-like pattern"),
    showHidden: z.boolean().optional().describe("Whether to show hidden files (default: false)"),
    includeMetadata: z.boolean().optional().describe("Whether to fetch file metadata like mtime (default: false -- faster without I/O)"),
    ignore: z.array(z.string()).optional().describe("Additional glob patterns to ignore (added to default ignore list)"),
});

interface FileEntry {
    name: string;
    absolutePath: string;
    relativePath: string;
    type: "file" | "directory";
    mtime: number;
    depth: number;
}

function shouldIgnore(name: string, showHidden: boolean, ignoreSet: Set<string>): boolean {
    // Check hidden files
    if (!showHidden && name.startsWith('.') && name !== '.') {
        return true;
    }
    
    // Check ignore patterns
    return ignoreSet.has(name);
}

function matchPattern(name: string, pattern: string | undefined): boolean {
    if (!pattern) return true;
    
    // Simple extension match (e.g., ".ts")
    if (pattern.startsWith('.') && !pattern.includes('*')) {
        return name.endsWith(pattern);
    }
    
    // Convert glob to regex
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(name);
}

async function getMtimesBatched(entries: FileEntry[]): Promise<void> {
    for (let i = 0; i < entries.length; i += MTIME_BATCH_SIZE) {
        const batch = entries.slice(i, i + MTIME_BATCH_SIZE);
        await Promise.all(
            batch.map(async (entry) => {
                entry.mtime = await Bun.file(entry.absolutePath)
                    .stat()
                    .then((stats) => stats.mtime.getTime())
                    .catch(() => 0);
            })
        );
    }
}

function buildTreeOutput(entries: FileEntry[], basePath: string): string {
    // Group entries by directory
    const tree = new Map<string, FileEntry[]>();
    
    for (const entry of entries) {
        const dir = path.dirname(entry.relativePath);
        const dirKey = dir === '.' ? '' : dir;
        
        if (!tree.has(dirKey)) {
            tree.set(dirKey, []);
        }
        tree.get(dirKey)!.push(entry);
    }
    
    // Sort each directory's contents: directories first, then files, alphabetically
    for (const [, items] of tree) {
        items.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }
    
    const lines: string[] = [`${basePath}/`];
    
    function renderLevel(dirPath: string, indent: string): void {
        const items = tree.get(dirPath) || [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isLast = i === items.length - 1;
            const prefix = isLast ? '└── ' : '├── ';
            const childIndent = indent + (isLast ? '    ' : '│   ');
            
            if (item.type === 'directory') {
                lines.push(`${indent}${prefix}${item.name}/`);
                // Render children of this directory
                const childPath = dirPath ? `${dirPath}/${item.name}` : item.name;
                renderLevel(childPath, childIndent);
            } else {
                lines.push(`${indent}${prefix}${item.name}`);
            }
        }
    }
    
    renderLevel('', '');
    
    return lines.join('\n');
}

export const list = async function(input: z.infer<typeof listSchema>, projectCwd?: string) {
    const {
        path: relativePath,
        recursive = true,
        maxDepth = 3,
        pattern,
        showHidden = false,
        includeMetadata = false,
        ignore: extraIgnore,
    } = input;

    if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 0)) {
        return {
            success: false,
            message: 'maxDepth must be a non-negative integer',
            error: 'INVALID_MAX_DEPTH',
        };
    }

    try {
        const basePath = projectCwd || process.cwd();
        const absolutePath = relativePath 
            ? resolveProjectPath(relativePath, basePath)
            : basePath;
        
        // Validate path if projectCwd is provided
        if (projectCwd && relativePath) {
            const validation = validatePath(relativePath, projectCwd);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.error || 'Path validation failed',
                    error: 'ACCESS_DENIED',
                };
            }
        }

        // Check if path exists
        if (!fs.existsSync(absolutePath)) {
            return {
                success: false,
                message: `Directory not found: ${absolutePath}`,
                error: 'DIR_NOT_FOUND',
            };
        }

        // Check if it's a directory
        const stats = fs.statSync(absolutePath);
        if (!stats.isDirectory()) {
            return {
                success: false,
                message: `Path is not a directory: ${absolutePath}`,
                error: 'NOT_A_DIRECTORY',
            };
        }

        // Build the ignore set from defaults + user-provided extras
        const ignoreSet = new Set<string>(DEFAULT_IGNORE_PATTERNS);
        if (extraIgnore && extraIgnore.length > 0) {
            for (const pat of extraIgnore) {
                ignoreSet.add(pat);
            }
        }

        const collected: FileEntry[] = [];
        let truncated = false;

        const walk = async (currentDir: string, depth: number): Promise<void> => {
            if (collected.length >= RESULT_LIMIT) {
                truncated = true;
                return;
            }

            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(currentDir, { withFileTypes: true });
            } catch {
                return; // Skip directories we can't read
            }

            // Sort entries: directories first, then alphabetically
            entries.sort((a, b) => {
                if (a.isDirectory() !== b.isDirectory()) {
                    return a.isDirectory() ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            for (const entry of entries) {
                if (collected.length >= RESULT_LIMIT) {
                    truncated = true;
                    break;
                }

                if (shouldIgnore(entry.name, showHidden, ignoreSet)) {
                    continue;
                }

                const entryAbsolutePath = path.join(currentDir, entry.name);
                const entryRelativePath = path.relative(absolutePath, entryAbsolutePath);

                if (entry.isDirectory()) {
                    collected.push({
                        name: entry.name,
                        absolutePath: entryAbsolutePath,
                        relativePath: entryRelativePath,
                        type: 'directory',
                        mtime: 0,
                        depth,
                    });

                    // Recurse into subdirectories
                    if (recursive && depth < maxDepth) {
                        await walk(entryAbsolutePath, depth + 1);
                    }
                } else if (entry.isFile()) {
                    // Apply pattern filter to files
                    if (matchPattern(entry.name, pattern)) {
                        collected.push({
                            name: entry.name,
                            absolutePath: entryAbsolutePath,
                            relativePath: entryRelativePath,
                            type: 'file',
                            mtime: 0,
                            depth,
                        });
                    }
                }
            }
        };

        await walk(absolutePath, 0);

        // Only fetch mtimes when metadata is requested (saves I/O)
        if (includeMetadata) {
            await getMtimesBatched(collected);
        }

        // Count stats
        const totalFiles = collected.filter(item => item.type === 'file').length;
        const totalDirectories = collected.filter(item => item.type === 'directory').length;

        // Build tree output
        const treeOutput = buildTreeOutput(collected, relativePath || path.basename(absolutePath));

        // Build message
        let message = `Listed ${collected.length} items`;
        if (relativePath) {
            message += ` in "${relativePath}"`;
        }
        message += ` (${totalFiles} files, ${totalDirectories} directories)`;
        
        if (recursive) {
            message += ` [depth: ${maxDepth}]`;
        }
        if (pattern) {
            message += ` [filter: ${pattern}]`;
        }
        if (truncated) {
            message += ` [TRUNCATED at ${RESULT_LIMIT} items]`;
        }

        // Prepare simplified file list for structured output
        const files = collected.map(item => ({
            name: item.name,
            path: item.relativePath,
            type: item.type,
        }));

        return {
            success: true,
            message,
            metadata: {
                totalFiles,
                totalDirectories,
                totalItems: collected.length,
                truncated,
                maxDepth,
                recursive,
            },
            files,
            content: treeOutput,
        };

    } catch (error) {
        console.error('[list] error:', error);
        return {
            success: false,
            message: `Failed to list directory: ${error}`,
            error: 'LIST_ERROR',
        };
    }
}
