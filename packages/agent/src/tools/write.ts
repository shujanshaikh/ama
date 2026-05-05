import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const WriteParamsSchema = z.object({
  path: z.string().describe("Path to the file to write (relative or absolute)"),
  content: z.string().describe("Content to write to the file"),
});

export async function writeTool(input: z.infer<typeof WriteParamsSchema>, projectCwd?: string) {
  const absolute = path.isAbsolute(input.path) ? input.path : path.resolve(projectCwd || process.cwd(), input.path);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, input.content, "utf8");
  return { success: true, message: `Wrote ${input.path}` };
}
