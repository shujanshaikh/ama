import { z } from "zod";
import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";

const excludePatterns = [
  "node_modules",
  "dist",
  "build",
  "coverage",
  "logs",
  "tmp",
];

const excludePattern = excludePatterns.join("|");

const listSchema = z.object({
  path: z.string().optional(),
  recursive: z.boolean().optional().describe("Whether to list files recursively"),
  maxDepth: z.number().optional().describe("Maximum recursion depth (default: unlimited)"),
  pattern: z.string().optional().describe("File extension (e.g., '.ts') or glob-like pattern"),
  includeDirectories: z.boolean().optional().describe("Whether to include directories in results (default: true)"),
  includeFiles: z.boolean().optional().describe("Whether to include files in results (default: true)"),
})
export const list = async function(input: z.infer<typeof listSchema>) {
  const { path: relativePath, recursive, maxDepth, pattern, includeDirectories, includeFiles } = input;

    if (maxDepth !== undefined) {
      if (!Number.isInteger(maxDepth) || maxDepth < 0) {
        return {
          success: false,
          message: 'maxDepth must be a non-negative integer',
          error: 'INVALID_MAX_DEPTH',
        };
      }
    }

    const includeFilesNormalized = includeFiles ?? true;
    const includeDirectoriesNormalized = includeDirectories ?? true;

    if (!includeFilesNormalized && !includeDirectoriesNormalized) {
      return {
        success: false,
        message:
          'At least one of includeFiles or includeDirectories must be true',
        error: 'INVALID_INCLUDE_OPTIONS',
      };
    }
    try {
      const absolutePath = relativePath ? path.resolve(relativePath) : process.cwd();
      try {
        await access(absolutePath);
      } catch {
        return {
          success: false,
          message: `File does not exist: ${absolutePath}`,
          error: 'FILE_DOES_NOT_EXIST',
        };
      }

      const isDir = (await stat(absolutePath)).isDirectory();
      if (!isDir) {
        return {
          success: false,
          message: `File is not a directory: ${absolutePath}`,
          error: 'FILE_IS_NOT_A_DIRECTORY',
        };
      }

      const collected: Array<{
        name: string;
        absolutePath: string;
        relativePath: string;
        type: "file" | "directory";
      }> = [];

      const patternMatcher = (() => {
        if (!pattern) return null;

        if (pattern.startsWith(".") && !pattern.includes("*") && !pattern.includes("?")) {
          return (entryName: string) => entryName.endsWith(pattern);
        }

        const escaped = pattern
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".");
        const regex = new RegExp(`^${escaped}$`);
        return (entryName: string) => regex.test(entryName);
      })();

      const matchPattern = (entryName: string) => {
        if (!patternMatcher) return true;
        return patternMatcher(entryName);
      };

      const maxDepthNormalized = recursive ? maxDepth ?? Infinity : 0;

      const walk = async (currentDir: string, depth: number) => {
        const entries = await readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const entryAbsolutePath = path.join(currentDir, entry.name);
          const entryRelativePath = path.relative(absolutePath, entryAbsolutePath) || ".";

          if (entry.isDirectory()) {
            const isExcluded = entry.name.match(excludePattern);
            
            if (includeDirectoriesNormalized && matchPattern(entry.name) && !isExcluded) {
              collected.push({
                name: entry.name,
                absolutePath: entryAbsolutePath,
                relativePath: entryRelativePath,
                type: "directory",
              });
            }

            if (recursive && depth < maxDepthNormalized && !isExcluded) {
              await walk(entryAbsolutePath, depth + 1);
            }
          } else if (entry.isFile()) {
            if (includeFilesNormalized && matchPattern(entry.name) && !entry.name.match(excludePattern)) {
              collected.push({
                name: entry.name,
                absolutePath: entryAbsolutePath,
                relativePath: entryRelativePath,
                type: "file",
              });
            }
          }
        }
      };

      await walk(absolutePath, 0);

      const totalFiles = collected.filter(item => item.type === "file").length;
      const totalDirectories = collected.filter(item => item.type === "directory").length;

      let message = `Successfully listed ${collected.length} items in: ${relativePath ?? absolutePath}`;
      if (recursive) {
        message += ` (recursive${maxDepth !== undefined ? `, max depth ${maxDepth}` : ""})`;
      }
      if (pattern) {
        message += ` (filtered by pattern: ${pattern})`;
      }
      message += ` - ${totalFiles} files, ${totalDirectories} directories`;

      return {
        success: true,
        message,
        files: collected,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list files: ${error}`,
        error: 'LIST_ERROR',
      };
    }
  }

