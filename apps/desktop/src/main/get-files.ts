import { readdirSync } from "node:fs";
import path from "node:path";

const ignoreFiles = [
  "node_modules", ".git", ".next", ".env", ".env.local",
  ".output", ".turbo", ".vercel", ".tanstack", ".nitro",
  ".wrangler", ".alchemy", ".coverage", ".nyc_output",
  ".cache", "tmp", "temp", ".idea", ".vscode",
  ".zig-cache", "zig-out", "coverage", "logs",
  ".venv", "venv", "env", "dist", "build",
];

export function getContext(
  dir: string,
  base = dir,
  allFiles: string[] = [],
): string[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreFiles.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getContext(fullPath, base, allFiles);
      } else {
        allFiles.push(path.relative(base, fullPath));
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return allFiles;
}
