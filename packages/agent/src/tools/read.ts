import { z } from "zod";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export const ReadParamsSchema = z.object({
  path: z.string().describe("Path to the file to read (relative or absolute)"),
  offset: z.number().optional().describe("Line number to start reading from (1-indexed)"),
  limit: z.number().optional().describe("Maximum number of lines to read"),
});

export async function readTool(input: z.infer<typeof ReadParamsSchema>, projectCwd?: string) {
  const absolute = path.isAbsolute(input.path) ? input.path : path.resolve(projectCwd || process.cwd(), input.path);
  const s = await stat(absolute);

  if (s.isDirectory()) {
    const entries = (await readdir(absolute)).sort();
    return { success: true, content: entries.join("\n") || "(empty directory)" };
  }

  const content = await readFile(absolute, "utf8");
  const lines = content.split(/\r?\n/);
  const start = input.offset ? Math.max(1, input.offset) : 1;
  const end = input.limit ? start + input.limit - 1 : lines.length;
  const slice = lines.slice(start - 1, end);
  return { success: true, content: slice.map((l, i) => `${start + i}: ${l}`).join("\n") };
}
