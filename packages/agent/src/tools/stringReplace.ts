// Fuzzy matching strategies sourced from OpenCode's edit tool:
// https://github.com/anomalyco/opencode
import { z } from "zod";
import path from "node:path";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { calculateDiffStats } from "../lib/diff.ts";
import { validatePath, resolveProjectPath } from "../lib/sandbox.ts";

const apply_patchSchema = z.object({
    file_path: z.string().describe("The path to the file you want to search and replace in. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is"),
    new_string: z.string().describe("The edited text to replace the old_string (must be different from the old_string)"),
    old_string: z.string().describe("The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)"),
    replaceAll: z.boolean().optional().describe("Replace all occurrences of old_string (default false)"),
})

type Replacer = (content: string, find: string) => Generator<string, void, unknown>

/**
 * Levenshtein distance for fuzzy block matching
 */
function levenshtein(a: string, b: string): number {
    if (a === "" || b === "") return Math.max(a.length, b.length);
    const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[a.length][b.length];
}

// Similarity thresholds for block anchor matching
const SINGLE_CANDIDATE_SIMILARITY_THRESHOLD = 0.0;
const MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD = 0.3;

/** Strategy 1: Exact string match (baseline) */
const SimpleReplacer: Replacer = function* (_content, find) {
    yield find;
};

/** Strategy 2: Match after trimming each line (handles whitespace diffs at line boundaries) */
const LineTrimmedReplacer: Replacer = function* (content, find) {
    const originalLines = content.split("\n");
    const searchLines = find.split("\n");

    if (searchLines[searchLines.length - 1] === "") searchLines.pop();

    for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
        let matches = true;
        for (let j = 0; j < searchLines.length; j++) {
            if (originalLines[i + j].trim() !== searchLines[j].trim()) {
                matches = false;
                break;
            }
        }
        if (matches) {
            let matchStartIndex = 0;
            for (let k = 0; k < i; k++) matchStartIndex += originalLines[k].length + 1;
            let matchEndIndex = matchStartIndex;
            for (let k = 0; k < searchLines.length; k++) {
                matchEndIndex += originalLines[i + k].length;
                if (k < searchLines.length - 1) matchEndIndex += 1;
            }
            yield content.substring(matchStartIndex, matchEndIndex);
        }
    }
};

/** Strategy 3: First/last line as anchors, fuzzy middle via Levenshtein */
const BlockAnchorReplacer: Replacer = function* (content, find) {
    const originalLines = content.split("\n");
    const searchLines = find.split("\n");

    if (searchLines.length < 3) return;
    if (searchLines[searchLines.length - 1] === "") searchLines.pop();

    const firstLineSearch = searchLines[0].trim();
    const lastLineSearch = searchLines[searchLines.length - 1].trim();
    const searchBlockSize = searchLines.length;

    const candidates: Array<{ startLine: number; endLine: number }> = [];
    for (let i = 0; i < originalLines.length; i++) {
        if (originalLines[i].trim() !== firstLineSearch) continue;
        for (let j = i + 2; j < originalLines.length; j++) {
            if (originalLines[j].trim() === lastLineSearch) {
                candidates.push({ startLine: i, endLine: j });
                break;
            }
        }
    }

    if (candidates.length === 0) return;

    const computeSimilarity = (startLine: number, endLine: number): number => {
        const actualBlockSize = endLine - startLine + 1;
        const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2);
        if (linesToCheck <= 0) return 1.0;
        let similarity = 0;
        for (let j = 1; j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
            const originalLine = originalLines[startLine + j].trim();
            const searchLine = searchLines[j].trim();
            const maxLen = Math.max(originalLine.length, searchLine.length);
            if (maxLen === 0) continue;
            const distance = levenshtein(originalLine, searchLine);
            similarity += (1 - distance / maxLen) / linesToCheck;
        }
        return similarity;
    };

    const extractBlock = (startLine: number, endLine: number): string => {
        let matchStartIndex = 0;
        for (let k = 0; k < startLine; k++) matchStartIndex += originalLines[k].length + 1;
        let matchEndIndex = matchStartIndex;
        for (let k = startLine; k <= endLine; k++) {
            matchEndIndex += originalLines[k].length;
            if (k < endLine) matchEndIndex += 1;
        }
        return content.substring(matchStartIndex, matchEndIndex);
    };

    if (candidates.length === 1) {
        const { startLine, endLine } = candidates[0];
        if (computeSimilarity(startLine, endLine) >= SINGLE_CANDIDATE_SIMILARITY_THRESHOLD) {
            yield extractBlock(startLine, endLine);
        }
        return;
    }

    // Multiple candidates: pick best
    let bestMatch: { startLine: number; endLine: number } | null = null;
    let maxSimilarity = -1;
    for (const candidate of candidates) {
        const similarity = computeSimilarity(candidate.startLine, candidate.endLine);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestMatch = candidate;
        }
    }
    if (maxSimilarity >= MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD && bestMatch) {
        yield extractBlock(bestMatch.startLine, bestMatch.endLine);
    }
};

const WhitespaceNormalizedReplacer: Replacer = function* (content, find) {
    const normalizeWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();
    const normalizedFind = normalizeWhitespace(find);

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (normalizeWhitespace(line) === normalizedFind) {
            yield line;
        } else {
            const normalizedLine = normalizeWhitespace(line);
            if (normalizedLine.includes(normalizedFind)) {
                const words = find.trim().split(/\s+/);
                if (words.length > 0) {
                    const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
                    try {
                        const regex = new RegExp(pattern);
                        const match = line.match(regex);
                        if (match) yield match[0];
                    } catch { /* invalid regex, skip */ }
                }
            }
        }
    }

    // Multi-line matching
    const findLines = find.split("\n");
    if (findLines.length > 1) {
        for (let i = 0; i <= lines.length - findLines.length; i++) {
            const block = lines.slice(i, i + findLines.length);
            if (normalizeWhitespace(block.join("\n")) === normalizedFind) {
                yield block.join("\n");
            }
        }
    }
};

const IndentationFlexibleReplacer: Replacer = function* (content, find) {
    const removeIndentation = (text: string) => {
        const lines = text.split("\n");
        const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
        if (nonEmptyLines.length === 0) return text;
        const minIndent = Math.min(
            ...nonEmptyLines.map((line) => {
                const match = line.match(/^(\s*)/);
                return match ? match[1].length : 0;
            }),
        );
        return lines.map((line) => (line.trim().length === 0 ? line : line.slice(minIndent))).join("\n");
    };

    const normalizedFind = removeIndentation(find);
    const contentLines = content.split("\n");
    const findLines = find.split("\n");

    for (let i = 0; i <= contentLines.length - findLines.length; i++) {
        const block = contentLines.slice(i, i + findLines.length).join("\n");
        if (removeIndentation(block) === normalizedFind) {
            yield block;
        }
    }
};

const EscapeNormalizedReplacer: Replacer = function* (content, find) {
    const unescapeString = (str: string): string => {
        return str.replace(/\\(n|t|r|'|"|`|\\|\n|\$)/g, (match, capturedChar) => {
            switch (capturedChar) {
                case "n": return "\n";
                case "t": return "\t";
                case "r": return "\r";
                case "'": return "'";
                case '"': return '"';
                case "`": return "`";
                case "\\": return "\\";
                case "\n": return "\n";
                case "$": return "$";
                default: return match;
            }
        });
    };

    const unescapedFind = unescapeString(find);
    if (content.includes(unescapedFind)) {
        yield unescapedFind;
    }

    const lines = content.split("\n");
    const findLines = unescapedFind.split("\n");
    for (let i = 0; i <= lines.length - findLines.length; i++) {
        const block = lines.slice(i, i + findLines.length).join("\n");
        if (unescapeString(block) === unescapedFind) {
            yield block;
        }
    }
};

const TrimmedBoundaryReplacer: Replacer = function* (content, find) {
    const trimmedFind = find.trim();
    if (trimmedFind === find) return;  // already trimmed

    if (content.includes(trimmedFind)) {
        yield trimmedFind;
    }

    const lines = content.split("\n");
    const findLines = find.split("\n");
    for (let i = 0; i <= lines.length - findLines.length; i++) {
        const block = lines.slice(i, i + findLines.length).join("\n");
        if (block.trim() === trimmedFind) {
            yield block;
        }
    }
};

const ContextAwareReplacer: Replacer = function* (content, find) {
    const findLines = find.split("\n");
    if (findLines.length < 3) return;
    if (findLines[findLines.length - 1] === "") findLines.pop();

    const contentLines = content.split("\n");
    const firstLine = findLines[0].trim();
    const lastLine = findLines[findLines.length - 1].trim();

    for (let i = 0; i < contentLines.length; i++) {
        if (contentLines[i].trim() !== firstLine) continue;
        for (let j = i + 2; j < contentLines.length; j++) {
            if (contentLines[j].trim() === lastLine) {
                const blockLines = contentLines.slice(i, j + 1);
                if (blockLines.length === findLines.length) {
                    let matchingLines = 0;
                    let totalNonEmptyLines = 0;
                    for (let k = 1; k < blockLines.length - 1; k++) {
                        const blockLine = blockLines[k].trim();
                        const findLine = findLines[k].trim();
                        if (blockLine.length > 0 || findLine.length > 0) {
                            totalNonEmptyLines++;
                            if (blockLine === findLine) matchingLines++;
                        }
                    }
                    if (totalNonEmptyLines === 0 || matchingLines / totalNonEmptyLines >= 0.5) {
                        yield blockLines.join("\n");
                        break;
                    }
                }
                break;
            }
        }
    }
};

const MultiOccurrenceReplacer: Replacer = function* (content, find) {
    let startIndex = 0;
    while (true) {
        const index = content.indexOf(find, startIndex);
        if (index === -1) break;
        yield find;
        startIndex = index + find.length;
    }
};

const REPLACERS: Replacer[] = [
    SimpleReplacer,
    LineTrimmedReplacer,
    BlockAnchorReplacer,
    WhitespaceNormalizedReplacer,
    IndentationFlexibleReplacer,
    EscapeNormalizedReplacer,
    TrimmedBoundaryReplacer,
    ContextAwareReplacer,
    MultiOccurrenceReplacer,
];

function smartReplace(content: string, oldString: string, newString: string, replaceAll = false): string {
    if (oldString === newString) {
        throw new Error("No changes to apply: oldString and newString are identical.");
    }

    let notFound = true;

    for (const replacer of REPLACERS) {
        for (const search of replacer(content, oldString)) {
            const index = content.indexOf(search);
            if (index === -1) continue;
            notFound = false;
            if (replaceAll) {
                return content.replaceAll(search, newString);
            }
            const lastIndex = content.lastIndexOf(search);
            if (index !== lastIndex) continue;
            return content.substring(0, index) + newString + content.substring(index + search.length);
        }
    }

    if (notFound) {
        throw new Error(
            "oldString not found in content. It must match the file contents exactly, including whitespace, indentation, and line endings."
        );
    }
    throw new Error(
        "Found multiple matches for oldString. Provide more surrounding lines in oldString to identify the correct match."
    );
}

export const apply_patch = async function(input: z.infer<typeof apply_patchSchema>, projectCwd?: string) {
    const { file_path, new_string, old_string, replaceAll: shouldReplaceAll = false } = input;
    try {
        if (!file_path) {
            return {
                success: false,
                message: 'Missing required parameter: file_path',
                error: 'MISSING_FILE_PATH',
            };
        }

        if (old_string === undefined || old_string === null) {
            return {
                success: false,
                message: 'Missing required parameter: old_string',
                error: 'MISSING_OLD_STRING',
            };
        }

        if (new_string === undefined || new_string === null) {
            return {
                success: false,
                message: 'Missing required parameter: new_string',
                error: 'MISSING_NEW_STRING',
            };
        }

        if (old_string === new_string) {
            return {
                success: false,
                message: 'old_string and new_string must be different',
                error: 'STRINGS_IDENTICAL',
            };
        }

        if (projectCwd) {
            const validation = validatePath(file_path, projectCwd);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.error || 'Path validation failed',
                    error: 'ACCESS_DENIED',
                };
            }
        }

        const basePath = projectCwd || process.cwd();
        const absolute_file_path = resolveProjectPath(file_path, basePath);

        let exists = true;
        try {
            await access(absolute_file_path, constants.F_OK);
        } catch {
            exists = false;
        }

        if (!exists) {
            if (old_string === "") {
                await mkdir(path.dirname(absolute_file_path), { recursive: true });
                await writeFile(absolute_file_path, new_string, "utf8");
                const diffStats = calculateDiffStats("", new_string);
                return {
                    success: true,
                    isNewFile: true,
                    old_string: "",
                    new_string: new_string,
                    linesAdded: diffStats.linesAdded,
                    linesRemoved: diffStats.linesRemoved,
                    message: `Created new file: ${file_path}`,
                };
            }
            return {
                success: false,
                message: `File not found: ${file_path}`,
                error: 'FILE_NOT_FOUND',
            };
        }

        let fileContent: string;
        try {
            fileContent = await readFile(absolute_file_path, "utf8");
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to read file: ${file_path}`,
                error: 'READ_ERROR',
            };
        }

        let newContent: string;
        try {
            newContent = smartReplace(fileContent, old_string, new_string, shouldReplaceAll);
        } catch (err: any) {
            if (err.message.includes("not found")) {
                return {
                    success: false,
                    message: `old_string not found in file: ${file_path}. Ensure it matches the file contents exactly, including whitespace and indentation.`,
                    error: 'STRING_NOT_FOUND',
                };
            }
            if (err.message.includes("multiple matches")) {
                const occurrences = fileContent.split(old_string).length - 1;
                return {
                    success: false,
                    message: `old_string appears ${occurrences > 1 ? occurrences + ' times' : 'multiple times (via fuzzy match)'} in the file. Provide more surrounding context to make it unique, or set replaceAll to true.`,
                    error: 'STRING_NOT_UNIQUE',
                };
            }
            return {
                success: false,
                message: err.message,
                error: 'REPLACE_ERROR',
            };
        }

        try {
            await writeFile(absolute_file_path, newContent, "utf8");
            const diffStats = calculateDiffStats(fileContent, newContent);
            return {
                success: true,
                old_string: old_string,
                new_string: new_string,
                linesAdded: diffStats.linesAdded,
                linesRemoved: diffStats.linesRemoved,
                message: `Successfully replaced string in file: ${file_path}`,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to write to file: ${file_path}`,
                error: 'WRITE_ERROR',
            };
        }
    } catch (error: any) {
        return {
            success: false,
            message: `Unexpected error: ${error.message}`,
            error: 'UNEXPECTED_ERROR',
        };
    }
}
