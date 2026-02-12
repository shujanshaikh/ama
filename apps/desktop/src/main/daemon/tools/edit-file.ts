import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { validatePath, resolveProjectPath } from "../sandbox";

export async function executeEditFile(
  input: {
    target_file: string;
    content: string;
    providedNewFile?: boolean;
  },
  projectCwd?: string,
) {
  const { target_file, content, providedNewFile } = input;

  if (projectCwd) {
    const validation = validatePath(target_file, projectCwd);
    if (!validation.valid) {
      return { success: false, error: validation.error, message: `Failed to edit file: ${target_file}` };
    }
  }

  const basePath = projectCwd || process.cwd();
  const filePath = resolveProjectPath(target_file, basePath);
  const dirPath = path.dirname(filePath);

  await mkdir(dirPath, { recursive: true });

  let isNewFile = providedNewFile;
  let existingContent = "";

  if (isNewFile === undefined) {
    if (existsSync(filePath)) {
      existingContent = await readFile(filePath, "utf-8");
      isNewFile = false;
    } else {
      isNewFile = true;
    }
  } else if (!isNewFile && existsSync(filePath)) {
    existingContent = await readFile(filePath, "utf-8");
  }

  await writeFile(filePath, content, "utf-8");

  return {
    success: true,
    isNewFile,
    old_string: existingContent,
    new_string: content,
    message: isNewFile ? `Created new file: ${target_file}` : `Modified file: ${target_file}`,
  };
}
