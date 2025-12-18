import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateDiffStats } from "../lib/diff";

const apply_patchSchema = z.object({
    file_path: z.string().describe("The path to the file you want to search and replace in. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is"),
    new_string: z.string().describe("The edited text to replace the old_string (must be different from the old_string)"),
    old_string: z.string().describe("The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)"),
})

export const apply_patch = async function(input: z.infer<typeof apply_patchSchema>) {
    const { file_path, new_string, old_string } = input;    
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

            const absolute_file_path = path.resolve(file_path);

            let fileContent: string;
            try {
                fileContent = await readFile(absolute_file_path, 'utf-8');
            } catch (error: any) {
                if (error?.code === 'ENOENT') {
                    return {
                        success: false,
                        message: `File not found: ${file_path}`,
                        error: 'FILE_NOT_FOUND',
                    };
                }
                return {
                    success: false,
                    message: `Failed to read file: ${file_path}`,
                    error: 'READ_ERROR',
                };
            }

            if (!fileContent.includes(old_string)) {
                return {
                    success: false,
                    message: `old_string not found in file: ${file_path}`,
                    error: 'STRING_NOT_FOUND',
                };
            }

            const occurrences = fileContent.split(old_string).length - 1;
            if (occurrences > 1) {
                return {
                    success: false,
                    message: `old_string appears ${occurrences} times in the file. It must be unique. Please include more context to make it unique.`,
                    error: 'STRING_NOT_UNIQUE',
                };
            }

            const newContent = fileContent.replace(old_string, new_string);

            try {
                await writeFile(absolute_file_path, newContent, 'utf-8');
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