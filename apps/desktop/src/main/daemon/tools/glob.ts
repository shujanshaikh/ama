import fg from "fast-glob";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { validatePath, resolveProjectPath } from "../sandbox";

export async function executeGlob(
  input: { pattern: string; path?: string },
  projectCwd?: string,
) {
  const { pattern, path: inputPath } = input;
  if (!pattern) {
    return { success: false, message: "Missing required parameter: pattern", error: "MISSING_PATTERN" };
  }

  const basePath = projectCwd || process.cwd();
  const searchPath = inputPath ? resolveProjectPath(inputPath, basePath) : basePath;

  if (!existsSync(searchPath)) {
    return { success: false, message: `Directory not found: ${searchPath}`, error: "DIR_NOT_FOUND" };
  }

  if (projectCwd && inputPath) {
    const validation = validatePath(inputPath, projectCwd);
    if (!validation.valid) {
      return { success: false, message: validation.error, error: "ACCESS_DENIED" };
    }
  }

  try {
    const files = await fg(pattern, {
      cwd: searchPath,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ["**/node_modules/**", "**/.git/**"],
    });

    const limited = files.slice(0, 100);
    const truncated = files.length > 100;

    // Sort by mtime
    const withMtime = limited.map((f) => {
      try {
        return { path: f, mtime: statSync(f).mtimeMs };
      } catch {
        return { path: f, mtime: 0 };
      }
    });
    withMtime.sort((a, b) => b.mtime - a.mtime);

    return {
      success: true,
      message: `Found ${withMtime.length} matches for pattern "${pattern}"`,
      metadata: { count: withMtime.length, truncated },
      content: withMtime.map((f) => f.path).join("\n"),
    };
  } catch (error: any) {
    return { success: false, message: `Failed to find files: ${error.message}`, error: "GLOB_ERROR" };
  }
}
