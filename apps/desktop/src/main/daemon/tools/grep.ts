import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";
import { validatePath } from "../sandbox";

const execFileAsync = promisify(execFile);

export async function executeGrep(
  input: {
    query: string;
    options?: {
      includePattern?: string;
      excludePattern?: string;
      caseSensitive?: boolean;
      path?: string;
    };
  },
  projectCwd?: string,
) {
  const { query, options } = input;
  if (!query?.trim()) {
    return { success: false, message: "Missing required parameter: query", error: "MISSING_QUERY" };
  }

  let searchDir = projectCwd || process.cwd();
  const { includePattern, excludePattern, caseSensitive, path: subPath } = options || {};

  if (subPath) {
    searchDir = path.isAbsolute(subPath) ? subPath : path.resolve(searchDir, subPath);
    if (projectCwd) {
      const validation = validatePath(subPath, projectCwd);
      if (!validation.valid) {
        return { success: false, message: validation.error, error: "ACCESS_DENIED" };
      }
    }
  }

  if (!existsSync(searchDir)) {
    return { success: false, message: `Directory not found: ${searchDir}`, error: "DIR_NOT_FOUND" };
  }

  const args: string[] = [
    "-n", "--with-filename", "--no-heading", "--color=never",
    "--max-count=100", "--max-columns=1000",
  ];

  if (!caseSensitive) args.push("-i");
  if (includePattern) args.push("--glob", includePattern);
  if (excludePattern) args.push("--glob", `!${excludePattern}`);
  args.push("--glob", "!node_modules/**", "--glob", "!.git/**", "--glob", "!dist/**");
  args.push("--regexp", query, searchDir);

  try {
    const { stdout } = await execFileAsync("rg", args);
    const lines = stdout.trim().split("\n").filter((l) => l.length > 0);
    const matches = lines.slice(0, 200).map((line) => {
      const first = line.indexOf(":");
      const second = line.indexOf(":", first + 1);
      if (first > 0 && second > first) {
        return {
          file: line.substring(0, first),
          lineNumber: parseInt(line.substring(first + 1, second), 10),
          content: line.substring(second + 1).trim().slice(0, 500),
        };
      }
      return null;
    }).filter(Boolean);

    return {
      success: true,
      matches: matches.map((m: any) => `${m.file}:${m.lineNumber}:${m.content}`),
      detailedMatches: matches,
      query,
      matchCount: matches.length,
      message: `Found ${matches.length} matches for pattern: ${query}`,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // ripgrep not found, fall back to grep
      try {
        const grepArgs = ["-rn"];
        if (!caseSensitive) grepArgs.push("-i");
        grepArgs.push("--include=*", "--exclude-dir=node_modules", "--exclude-dir=.git", query, searchDir);
        const { stdout } = await execFileAsync("grep", grepArgs);
        const lines = stdout.trim().split("\n").filter(Boolean).slice(0, 200);
        return {
          success: true,
          matches: lines,
          query,
          matchCount: lines.length,
          message: `Found ${lines.length} matches for pattern: ${query}`,
        };
      } catch {
        return { success: true, matches: [], query, matchCount: 0, message: `No matches found for pattern: ${query}` };
      }
    }
    // exit code 1 = no matches
    if (error.status === 1) {
      return { success: true, matches: [], query, matchCount: 0, message: `No matches found for pattern: ${query}` };
    }
    return { success: false, message: `Grep error: ${error.message}`, error: "GREP_EXEC_ERROR" };
  }
}
