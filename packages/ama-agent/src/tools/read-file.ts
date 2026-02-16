import { z } from "zod";
import path from "node:path";
import { validatePath } from "../lib/sandbox";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB hard cap
const MAX_LINES_RETURNED = 10_000;

const read_fileSchema = z.object({
  relative_file_path: z
    .string()
    .describe("The relative path to the file to read."),
  should_read_entire_file: z
    .boolean()
    .describe("Whether to read the entire file."),
  start_line_one_indexed: z
    .number()
    .optional()
    .describe(
      "The one-indexed line number to start reading from (inclusive).",
    ),
  end_line_one_indexed: z
    .number()
    .optional()
    .describe("The one-indexed line number to end reading at (inclusive)."),
})

async function readFileContent(
  absolute_file_path: string,
  relative_file_path: string,
  should_read_entire_file: boolean,
  start_line_one_indexed?: number,
  end_line_one_indexed?: number
) {
  const file = Bun.file(absolute_file_path);

  const exists = await file.exists();
  if (!exists) {
    return {
      success: false,
      message: `File not found: ${relative_file_path}`,
      error: 'FILE_NOT_FOUND',
    };
  }

  try {
    // Check file size before reading
    const stat = await file.stat();
    if (stat.size > MAX_FILE_SIZE) {
      return {
        success: false,
        message: `File too large (${Math.round(stat.size / 1024 / 1024)}MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024}MB. Use line ranges to read portions.`,
        error: 'FILE_TOO_LARGE',
      };
    }

    const fileContent = await file.text();
    const lines = fileContent.split(/\r?\n/);
    const totalLines = lines.length;

    if (should_read_entire_file) {
      const cappedLines = lines.slice(0, MAX_LINES_RETURNED);
      const truncated = totalLines > MAX_LINES_RETURNED;
      const content = cappedLines.join('\n');

      return {
        success: true,
        message: truncated
          ? `Read first ${MAX_LINES_RETURNED} of ${totalLines} lines from: ${relative_file_path} (truncated)`
          : `Successfully read entire file: ${relative_file_path} (${totalLines} lines)`,
        content,
        totalLines,
        truncated,
      };
    }

    const startIndex = (start_line_one_indexed as number) - 1;
    if (startIndex >= totalLines) {
      return {
        success: false,
        message:
          'start_line_one_indexed must be less than or equal to the total number of lines in the file',
        error: 'INVALID_LINE_RANGE',
      };
    }

    const normalizedEnd = Math.min(end_line_one_indexed as number, totalLines);
    const rangeSize = normalizedEnd - startIndex;
    const cappedEnd = rangeSize > MAX_LINES_RETURNED
      ? startIndex + MAX_LINES_RETURNED
      : normalizedEnd;

    const selectedLines = lines.slice(startIndex, cappedEnd).join('\n');
    const linesRead = cappedEnd - startIndex;

    return {
      success: true,
      message: `Successfully read lines ${start_line_one_indexed}-${cappedEnd} from file: ${relative_file_path} (${linesRead} lines of ${totalLines} total)`,
      content: selectedLines,
      totalLines,
      truncated: cappedEnd < normalizedEnd,
    };
  } catch (error: any) {
    if (error?.code === 'EISDIR') {
      return {
        success: false,
        message: `Path is not a file: ${relative_file_path}`,
        error: 'NOT_A_FILE',
      };
    }
    return {
      success: false,
      message: `Failed to read file: ${relative_file_path}`,
      error: 'READ_ERROR',
    };
  }
}

export const read_file = async function(input: z.infer<typeof read_fileSchema>, projectCwd?: string) {
  const { relative_file_path, should_read_entire_file, start_line_one_indexed, end_line_one_indexed } = input;

  try {
    if (!relative_file_path) {
      return {
        success: false,
        message: 'Missing required parameter: target_file',
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
