import { readFile } from "node:fs/promises";
import path from "node:path";
import { validatePath } from "../sandbox";

export async function executeReadFile(
  input: {
    relative_file_path: string;
    should_read_entire_file: boolean;
    start_line_one_indexed?: number;
    end_line_one_indexed?: number;
  },
  projectCwd?: string,
) {
  const { relative_file_path, should_read_entire_file, start_line_one_indexed, end_line_one_indexed } = input;

  if (!relative_file_path) {
    return { success: false, message: "Missing required parameter: relative_file_path", error: "MISSING_TARGET_FILE" };
  }

  let absolutePath: string;
  if (projectCwd) {
    const validation = validatePath(relative_file_path, projectCwd);
    if (!validation.valid) {
      return { success: false, message: validation.error, error: "ACCESS_DENIED" };
    }
    absolutePath = validation.resolvedPath!;
  } else {
    absolutePath = path.resolve(relative_file_path);
  }

  try {
    const content = await readFile(absolutePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const totalLines = lines.length;

    if (should_read_entire_file) {
      return {
        success: true,
        message: `Successfully read entire file: ${relative_file_path} (${totalLines} lines)`,
        content,
        totalLines,
      };
    }

    const startIndex = (start_line_one_indexed ?? 1) - 1;
    const normalizedEnd = Math.min(end_line_one_indexed ?? totalLines, totalLines);
    const selectedLines = lines.slice(startIndex, normalizedEnd).join("\n");

    return {
      success: true,
      message: `Successfully read lines ${start_line_one_indexed}-${normalizedEnd} from file: ${relative_file_path}`,
      content: selectedLines,
      totalLines,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return { success: false, message: `File not found: ${relative_file_path}`, error: "FILE_NOT_FOUND" };
    }
    return { success: false, message: `Failed to read file: ${relative_file_path}`, error: "READ_ERROR" };
  }
}
