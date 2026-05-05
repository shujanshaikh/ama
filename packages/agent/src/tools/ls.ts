import { z } from "zod";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const LsParamsSchema = z.object({
  path: z.string().optional().describe("Directory to list (default: current directory)"),
  limit: z.number().optional().describe("Maximum number of entries to return (default: 500)"),
});

export async function lsTool(input: z.infer<typeof LsParamsSchema>, projectCwd?: string) {
  const dir = input.path ? path.resolve(projectCwd || process.cwd(), input.path) : (projectCwd || process.cwd());
  const names = (await readdir(dir)).sort((a, b) => a.localeCompare(b));
  const limit = input.limit ?? 500;
  const out: string[] = [];
  for (const n of names.slice(0, limit)) {
    const s = await stat(path.join(dir, n));
    out.push(s.isDirectory() ? `${n}/` : n);
  }
  return { success: true, content: out.join("\n") || "(empty directory)" };
}
