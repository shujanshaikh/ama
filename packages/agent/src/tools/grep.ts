import { z } from "zod";
import { spawn } from "node:child_process";
import path from "node:path";

export const GrepParamsSchema = z.object({
  pattern: z.string().describe("Search pattern (regex or literal string)"),
  path: z.string().optional().describe("Directory or file to search (default: current directory)"),
  glob: z.string().optional().describe("Filter files by glob pattern, e.g. '*.ts' or '**/*.spec.ts'"),
  ignoreCase: z.boolean().optional().describe("Case-insensitive search (default: false)"),
  literal: z.boolean().optional().describe("Treat pattern as literal string instead of regex (default: false)"),
  context: z.number().optional().describe("Number of lines to show before and after each match (default: 0)"),
  limit: z.number().optional().describe("Maximum number of matches to return (default: 100)"),
});

export async function grepTool(input: z.infer<typeof GrepParamsSchema>, projectCwd?: string) {
  const searchPath = input.path ? path.resolve(projectCwd || process.cwd(), input.path) : (projectCwd || process.cwd());
  const args = ["-nH", "--color=never", "--hidden", "--max-count", String(input.limit ?? 100)];
  if (input.ignoreCase) args.push("-i");
  if (input.literal) args.push("-F");
  if (input.glob) args.push("--glob", input.glob);
  if (input.context && input.context > 0) args.push("-C", String(input.context));
  args.push("--", input.pattern, searchPath);

  return new Promise((resolve) => {
    const proc = spawn("rg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 1) {
        resolve({ success: true, content: "No matches found" });
        return;
      }
      if (code !== 0) {
        resolve({ success: false, error: "GREP_ERROR", message: stderr || `rg exited ${code}` });
        return;
      }
      resolve({ success: true, content: stdout.trim() });
    });
    proc.on("error", (error) => resolve({ success: false, error: "GREP_ERROR", message: error.message }));
  });
}
