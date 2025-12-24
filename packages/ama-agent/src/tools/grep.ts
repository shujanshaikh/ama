import { exec } from "node:child_process";
import { promisify } from "util";
import { z } from "zod";
import path from "node:path";
import { validatePath } from "../lib/sandbox";



export const GREP_LIMITS = {
  DEFAULT_MAX_MATCHES: 200,
  MAX_TOTAL_OUTPUT_SIZE: 1 * 1024 * 1024,
  TRUNCATION_MESSAGE:
    '\n[Results truncated due to size limits. Use more specific patterns or file filters to narrow your search.]',
};

const grepSchema = z.object({
  query: z.string().describe('The regex pattern to search for'),
  options: z.object({
    includePattern: z.string().optional().describe('Glob pattern for files to include (e.g., "*.ts")'),
    excludePattern: z.string().optional().describe('Glob pattern for files to exclude'),
    caseSensitive: z.boolean().optional().describe('Whether the search should be case sensitive'),
  })
})


export const execAsync = promisify(exec);

export const grepTool = async function(input: z.infer<typeof grepSchema>, projectCwd?: string) {
    const { query, options } = input;

    try {
      const { includePattern, excludePattern, caseSensitive } = options || {};

      const searchDir = projectCwd || process.cwd();

      // Validate that we can search in this directory
      if (projectCwd && !path.isAbsolute(projectCwd)) {
        return {
          success: false,
          message: 'Invalid project directory',
          error: 'INVALID_PROJECT_DIR',
        };
      }

      let command = `rg -n --with-filename "${query}"`;
      if (caseSensitive) {
        command += ' -i';
      }
      if (includePattern) {
        command += ` --glob "${includePattern}"`;
      }
      if (excludePattern) {
        command += ` --glob "!${excludePattern}"`;
      }

      command += ` --max-count 50`;
      command += ` "${searchDir}"`;

      const { stdout } = await execAsync(command);

      const rawMatches =
        stdout.trim()
          .split("\n")
          .filter(line => line.length > 0);

      const detailedMatches = []
      const matches: string[] = []

      for (const rawMatch of rawMatches) {
        const colonIndex = rawMatch.indexOf(":");
        const secondColonIndex = rawMatch.indexOf(":", colonIndex + 1);

        if (colonIndex > 0 && secondColonIndex > colonIndex) {
          const file = rawMatch.substring(0, colonIndex);
          const lineNumber = parseInt(rawMatch.substring(colonIndex + 1, secondColonIndex), 10);
          let content = rawMatch.substring(secondColonIndex + 1)

          if (content.length > 250) {
            content = content.substring(0, 250) + "...";
          }

          detailedMatches.push({
            file,
            lineNumber,
            content,
          });
          matches.push(`${file}:${lineNumber}:${content}`);
        } else {
          matches.push(rawMatch);
        }
      }
      return {
        success: true,
        matches,
        detailedMatches,
        query,
        matchCount: matches.length,
        message: `Found ${matches.length} matches for pattern: ${query}`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || String(error),
        error: 'GREP_EXEC_ERROR',
      };
    }
  }
