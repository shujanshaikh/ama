import { readdirSync, statSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { validatePath, resolveProjectPath } from "../sandbox";

const RESULT_LIMIT = 500;
const IGNORE = new Set([
  "node_modules", ".git", ".next", ".output", ".turbo", ".vercel",
  ".tanstack", ".nitro", ".wrangler", ".cache", "tmp", "temp",
]);

interface FileEntry {
  name: string;
  relativePath: string;
  type: "file" | "directory";
  depth: number;
}

export async function executeListDirectory(
  input: {
    path?: string;
    recursive?: boolean;
    maxDepth?: number;
    pattern?: string;
    showHidden?: boolean;
  },
  projectCwd?: string,
) {
  const { path: relativePath, recursive = true, maxDepth = 3, showHidden = false } = input;

  const basePath = projectCwd || process.cwd();
  const absolutePath = relativePath
    ? resolveProjectPath(relativePath, basePath)
    : basePath;

  if (projectCwd && relativePath) {
    const validation = validatePath(relativePath, projectCwd);
    if (!validation.valid) {
      return { success: false, message: validation.error, error: "ACCESS_DENIED" };
    }
  }

  if (!existsSync(absolutePath)) {
    return { success: false, message: `Directory not found: ${absolutePath}`, error: "DIR_NOT_FOUND" };
  }

  const collected: FileEntry[] = [];
  let truncated = false;

  function walk(currentDir: string, depth: number) {
    if (collected.length >= RESULT_LIMIT) { truncated = true; return; }

    let entries;
    try { entries = readdirSync(currentDir, { withFileTypes: true }); } catch { return; }

    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (collected.length >= RESULT_LIMIT) { truncated = true; break; }
      if (!showHidden && entry.name.startsWith(".")) continue;
      if (IGNORE.has(entry.name)) continue;

      const entryPath = path.join(currentDir, entry.name);
      const relPath = path.relative(absolutePath, entryPath);

      if (entry.isDirectory()) {
        collected.push({ name: entry.name, relativePath: relPath, type: "directory", depth });
        if (recursive && depth < maxDepth) walk(entryPath, depth + 1);
      } else {
        collected.push({ name: entry.name, relativePath: relPath, type: "file", depth });
      }
    }
  }

  walk(absolutePath, 0);

  const totalFiles = collected.filter((i) => i.type === "file").length;
  const totalDirs = collected.filter((i) => i.type === "directory").length;

  return {
    success: true,
    message: `Listed ${collected.length} items (${totalFiles} files, ${totalDirs} directories)`,
    files: collected.map((i) => ({ name: i.name, path: i.relativePath, type: i.type })),
    metadata: { totalFiles, totalDirectories: totalDirs, totalItems: collected.length, truncated },
  };
}
