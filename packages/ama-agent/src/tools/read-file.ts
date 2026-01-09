import { z } from "zod";
import path from "node:path";
import { validatePath } from "../lib/sandbox";

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

// Helper function to read file content and return appropriate response
async function readFileContent(
  absolute_file_path: string,
  relative_file_path: string,
  should_read_entire_file: boolean,
  start_line_one_indexed?: number,
  end_line_one_indexed?: number
) {
  const file = Bun.file(absolute_file_path);
  
  // Check if file exists
  const exists = await file.exists();
  if (!exists) {
    return {
      success: false,
      message: `File not found: ${relative_file_path}`,
      error: 'FILE_NOT_FOUND',
    };
  }

  // Check if it's a directory by checking file size (directories have size 0 and reading them fails)
  try {
    const fileContent = await file.text();
    const lines = fileContent.split(/\r?\n/);
    const totalLines = lines.length;

    if (should_read_entire_file) {
      return {
        success: true,
        message: `Successfully read entire file: ${relative_file_path} (${totalLines} lines)`,
        content: fileContent,
        totalLines,
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
    const selectedLines = lines
      .slice(startIndex, normalizedEnd)
      .join('\n');
    const linesRead = normalizedEnd - (start_line_one_indexed as number) + 1;

    return {
      success: true,
      message: `Successfully read lines ${start_line_one_indexed}-${normalizedEnd} from file: ${relative_file_path} (${linesRead} lines of ${totalLines} total)`,
      content: selectedLines,
      totalLines,
    };
  } catch (error: any) {
    // If reading fails, it might be a directory or permission issue
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

    // Resolve the absolute file path
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
      // Fallback to process.cwd() if no projectCwd provided
      absolute_file_path = path.resolve(relative_file_path);
    }

    // Use the helper function to read file content
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
