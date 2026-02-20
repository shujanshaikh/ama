import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import * as fsp from "node:fs/promises";
import { validatePath } from "../lib/sandbox.ts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB hard cap
const MAX_LINES_RETURNED = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_LINE_SUFFIX = `... (line truncated to ${MAX_LINE_LENGTH} chars)`;
const MAX_BYTES = 50 * 1024; // 50KB byte cap for output

// ── Binary file detection ───────────────────────────────────────────────

const BINARY_EXTENSIONS = new Set([
    ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".class", ".jar",
    ".war", ".7z", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".odt", ".ods", ".odp", ".bin", ".dat", ".obj", ".o", ".a",
    ".lib", ".wasm", ".pyc", ".pyo", ".ico", ".bmp", ".ttf", ".woff",
    ".woff2", ".eot", ".mp3", ".mp4", ".avi", ".mov", ".flv",
]);

async function isBinaryFile(filepath: string, fileSize: number): Promise<boolean> {
    const ext = path.extname(filepath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return true;
    if (fileSize === 0) return false;

    try {
        const fh = await fsp.open(filepath, "r");
        try {
            const sampleSize = Math.min(4096, fileSize);
            const bytes = Buffer.alloc(sampleSize);
            const result = await fh.read(bytes, 0, sampleSize, 0);
            if (result.bytesRead === 0) return false;

            let nonPrintableCount = 0;
            for (let i = 0; i < result.bytesRead; i++) {
                if (bytes[i] === 0) return true; // null byte = binary
                if (bytes[i] < 9 || (bytes[i] > 13 && bytes[i] < 32)) {
                    nonPrintableCount++;
                }
            }
            return nonPrintableCount / result.bytesRead > 0.3;
        } finally {
            await fh.close();
        }
    } catch {
        return false;
    }
}

// ── Similar filename suggestions ────────────────────────────────────────

async function findSimilarFiles(filepath: string): Promise<string[]> {
    const dir = path.dirname(filepath);
    const base = path.basename(filepath).toLowerCase();
    try {
        const entries = await fsp.readdir(dir);
        return entries
            .filter(
                (entry) =>
                    entry.toLowerCase().includes(base) ||
                    base.includes(entry.toLowerCase()),
            )
            .map((entry) => path.join(dir, entry))
            .slice(0, 3);
    } catch {
        return [];
    }
}

// ── Schema ──────────────────────────────────────────────────────────────

const read_fileSchema = z.object({
    relative_file_path: z
        .string()
        .describe("The path to the file or directory to read."),
    should_read_entire_file: z
        .boolean()
        .describe("Whether to read the entire file.")
        .optional()
        .default(true),
    start_line_one_indexed: z
        .number()
        .optional()
        .describe("The one-indexed line number to start reading from (inclusive). Alias: offset."),
    end_line_one_indexed: z
        .number()
        .optional()
        .describe("The one-indexed line number to end reading at (inclusive). Alias: offset + limit."),
});

// ── Core read logic ─────────────────────────────────────────────────────

async function readFileContent(
    absolute_file_path: string,
    relative_file_path: string,
    should_read_entire_file: boolean,
    start_line_one_indexed?: number,
    end_line_one_indexed?: number
) {
    // Check if path exists at all
    let stat: fs.Stats;
    try {
        stat = fs.statSync(absolute_file_path);
    } catch {
        // File not found - suggest similar files
        const suggestions = await findSimilarFiles(absolute_file_path);
        let message = `File not found: ${relative_file_path}`;
        if (suggestions.length > 0) {
            message += `\n\nDid you mean one of these?\n${suggestions.join("\n")}`;
        }
        return {
            success: false,
            message,
            error: 'FILE_NOT_FOUND',
        };
    }

    // ── Handle directories ──────────────────────────────────────────────
    if (stat.isDirectory()) {
        try {
            const dirents = await fsp.readdir(absolute_file_path, { withFileTypes: true });
            const entries = await Promise.all(
                dirents.map(async (dirent) => {
                    if (dirent.isDirectory()) return dirent.name + "/";
                    if (dirent.isSymbolicLink()) {
                        const target = await fsp.stat(path.join(absolute_file_path, dirent.name)).catch(() => undefined);
                        if (target?.isDirectory()) return dirent.name + "/";
                    }
                    return dirent.name;
                }),
            );
            entries.sort((a, b) => a.localeCompare(b));

            const truncated = entries.length > MAX_LINES_RETURNED;
            const sliced = entries.slice(0, MAX_LINES_RETURNED);

            const output = [
                `<path>${absolute_file_path}</path>`,
                `<type>directory</type>`,
                `<entries>`,
                sliced.join("\n"),
                truncated
                    ? `\n(Showing ${sliced.length} of ${entries.length} entries)`
                    : `\n(${entries.length} entries)`,
                `</entries>`,
            ].join("\n");

            return {
                success: true,
                message: `Listed directory: ${relative_file_path} (${entries.length} entries)`,
                content: output,
                totalLines: entries.length,
                truncated,
            };
        } catch (err: any) {
            return {
                success: false,
                message: `Failed to list directory: ${relative_file_path}`,
                error: 'READ_ERROR',
            };
        }
    }

    // ── Handle files ────────────────────────────────────────────────────
    try {
        if (stat.size > MAX_FILE_SIZE) {
            return {
                success: false,
                message: `File too large (${Math.round(stat.size / 1024 / 1024)}MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024}MB. Use line ranges to read portions.`,
                error: 'FILE_TOO_LARGE',
            };
        }

        // Binary file detection
        const binary = await isBinaryFile(absolute_file_path, stat.size);
        if (binary) {
            return {
                success: false,
                message: `Cannot read binary file: ${relative_file_path}`,
                error: 'BINARY_FILE',
            };
        }

        const fileContent = await fsp.readFile(absolute_file_path, "utf8");
        const lines = fileContent.split(/\r?\n/);
        const totalLines = lines.length;

        // Calculate range
        const start = should_read_entire_file ? 0 : ((start_line_one_indexed ?? 1) - 1);
        const end = should_read_entire_file
            ? Math.min(totalLines, MAX_LINES_RETURNED)
            : Math.min(end_line_one_indexed ?? totalLines, totalLines);

        if (start >= totalLines && !(totalLines === 0 && start === 0)) {
            return {
                success: false,
                message: `Offset ${start + 1} is out of range for this file (${totalLines} lines)`,
                error: 'INVALID_LINE_RANGE',
            };
        }

        // Build line-numbered output with byte cap
        const outputLines: string[] = [];
        let bytes = 0;
        let truncatedByBytes = false;
        let actualEnd = start;

        for (let i = start; i < end; i++) {
            let line = lines[i];
            // Truncate individual long lines
            if (line.length > MAX_LINE_LENGTH) {
                line = line.substring(0, MAX_LINE_LENGTH) + MAX_LINE_SUFFIX;
            }
            const numberedLine = `${i + 1}: ${line}`;
            const lineBytes = Buffer.byteLength(numberedLine, "utf-8") + (outputLines.length > 0 ? 1 : 0);

            if (bytes + lineBytes > MAX_BYTES && outputLines.length > 0) {
                truncatedByBytes = true;
                break;
            }

            outputLines.push(numberedLine);
            bytes += lineBytes;
            actualEnd = i + 1;
        }

        const hasMoreLines = actualEnd < totalLines;
        const truncated = truncatedByBytes || hasMoreLines || (should_read_entire_file && totalLines > MAX_LINES_RETURNED);

        // Build output in OpenCode-style XML format
        let output = `<path>${absolute_file_path}</path>\n<type>file</type>\n<content>\n`;
        output += outputLines.join("\n");

        if (truncatedByBytes) {
            output += `\n\n(Output capped at ${MAX_BYTES / 1024} KB. Showing lines ${start + 1}-${actualEnd}. Use start_line_one_indexed=${actualEnd + 1} to continue.)`;
        } else if (hasMoreLines && !should_read_entire_file) {
            output += `\n\n(Showing lines ${start + 1}-${actualEnd} of ${totalLines}. Use start_line_one_indexed=${actualEnd + 1} to continue.)`;
        } else {
            output += `\n\n(End of file - total ${totalLines} lines)`;
        }
        output += "\n</content>";

        return {
            success: true,
            message: truncated
                ? `Read lines ${start + 1}-${actualEnd} of ${totalLines} from: ${relative_file_path} (truncated)`
                : `Successfully read file: ${relative_file_path} (${totalLines} lines)`,
            content: output,
            totalLines,
            truncated,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Failed to read file: ${relative_file_path}`,
            error: 'READ_ERROR',
        };
    }
}

// ── Export ───────────────────────────────────────────────────────────────

export const read_file = async function(input: z.infer<typeof read_fileSchema>, projectCwd?: string) {
    const { relative_file_path, should_read_entire_file = true, start_line_one_indexed, end_line_one_indexed } = input;

    try {
        if (!relative_file_path) {
            return {
                success: false,
                message: 'Missing required parameter: relative_file_path',
                error: 'MISSING_TARGET_FILE',
            };
        }

        if (!should_read_entire_file) {
            if (
                start_line_one_indexed === undefined ||
                end_line_one_indexed === undefined
            ) {
                return {
                    success: false,
                    message:
                        'start_line_one_indexed and end_line_one_indexed are required when should_read_entire_file is false',
                    error: 'MISSING_LINE_RANGE',
                };
            }

            if (
                !Number.isInteger(start_line_one_indexed) ||
                start_line_one_indexed < 1
            ) {
                return {
                    success: false,
                    message:
                        'start_line_one_indexed must be a positive integer (1-indexed)',
                    error: 'INVALID_START_LINE',
                };
            }

            if (
                !Number.isInteger(end_line_one_indexed) ||
                end_line_one_indexed < 1
            ) {
                return {
                    success: false,
                    message:
                        'end_line_one_indexed must be a positive integer (1-indexed)',
                    error: 'INVALID_END_LINE',
                };
            }

            if (end_line_one_indexed < start_line_one_indexed) {
                return {
                    success: false,
                    message:
                        'end_line_one_indexed must be greater than or equal to start_line_one_indexed',
                    error: 'INVALID_LINE_RANGE',
                };
            }
        }

        let absolute_file_path: string;

        if (projectCwd) {
            const validation = validatePath(relative_file_path, projectCwd);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.error || 'Path validation failed',
                    error: 'ACCESS_DENIED',
                };
            }
            absolute_file_path = validation.resolvedPath!;
        } else {
            absolute_file_path = path.resolve(relative_file_path);
        }

        return await readFileContent(
            absolute_file_path,
            relative_file_path,
            should_read_entire_file,
            start_line_one_indexed,
            end_line_one_indexed
        );
    } catch {
        return {
            success: false,
            message: `Failed to read file: ${relative_file_path}`,
            error: 'READ_ERROR',
        };
    }
}
