import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { validatePath, resolveProjectPath } from "../sandbox";

export async function executeStringReplace(
  input: {
    file_path: string;
    old_string: string;
    new_string: string;
  },
  projectCwd?: string,
) {
  const { file_path, old_string, new_string } = input;

  if (old_string === new_string) {
    return { success: false, message: "old_string and new_string must be different", error: "STRINGS_IDENTICAL" };
  }

  if (projectCwd) {
    const validation = validatePath(file_path, projectCwd);
    if (!validation.valid) {
      return { success: false, message: validation.error, error: "ACCESS_DENIED" };
    }
  }

  const basePath = projectCwd || process.cwd();
  const absolutePath = resolveProjectPath(file_path, basePath);

  if (!existsSync(absolutePath)) {
    return { success: false, message: `File not found: ${file_path}`, error: "FILE_NOT_FOUND" };
  }

  const fileContent = await readFile(absolutePath, "utf-8");

  if (!fileContent.includes(old_string)) {
    return { success: false, message: `old_string not found in file: ${file_path}`, error: "STRING_NOT_FOUND" };
  }

  const occurrences = fileContent.split(old_string).length - 1;
  if (occurrences > 1) {
    return {
      success: false,
      message: `old_string appears ${occurrences} times in the file. It must be unique.`,
      error: "STRING_NOT_UNIQUE",
    };
  }

  const newContent = fileContent.replace(old_string, new_string);
  await writeFile(absolutePath, newContent, "utf-8");

  return {
    success: true,
    old_string,
    new_string,
    message: `Successfully replaced string in file: ${file_path}`,
  };
}
