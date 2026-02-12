import { readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { validatePath, resolveProjectPath } from "../sandbox";

export async function executeDeleteFile(
  input: { path: string },
  projectCwd?: string,
) {
  const filePath = input.path;
  if (!filePath) {
    return { success: false, message: "Missing required parameter: path", error: "MISSING_PATH" };
  }

  if (projectCwd) {
    const validation = validatePath(filePath, projectCwd);
    if (!validation.valid) {
      return { success: false, message: validation.error, error: "ACCESS_DENIED" };
    }
  }

  const basePath = projectCwd || process.cwd();
  const absolutePath = resolveProjectPath(filePath, basePath);

  if (!existsSync(absolutePath)) {
    return { success: false, message: `File not found: ${filePath}`, error: "FILE_NOT_FOUND" };
  }

  const originalContent = await readFile(absolutePath, "utf-8");
  await unlink(absolutePath);

  return { success: true, message: `Successfully deleted file: ${filePath}`, content: originalContent };
}
