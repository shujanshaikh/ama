import { z } from "zod";
import { glob } from "glob";
import path from "node:path";

export const FindParamsSchema = z.object({
  pattern: z.string().describe("Glob pattern to match files, e.g. '*.ts', '**/*.json', or 'src/**/*.spec.ts'"),
  path: z.string().optional().describe("Directory to search in (default: current directory)"),
  limit: z.number().optional().describe("Maximum number of results (default: 1000)"),
});

export async function findTool(input: z.infer<typeof FindParamsSchema>, projectCwd?: string) {
  const cwd = input.path
    ? path.resolve(projectCwd || process.cwd(), input.path)
    : (projectCwd || process.cwd());
  const limit = input.limit ?? 1000;
  const matches = await glob(input.pattern, { cwd, nodir: false, absolute: false, dot: true, ignore: ["**/.git/**", "**/node_modules/**"] });
  const out = matches.slice(0, limit);
  return { success: true, content: out.join("\n") || "No files found matching pattern" };
}
