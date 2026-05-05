import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ReplaceEditSchema = z.object({
  oldText: z.string().describe("Exact text for one targeted replacement."),
  newText: z.string().describe("Replacement text for this targeted edit."),
});

export const EditParamsSchema = z.object({
  path: z.string().describe("Path to the file to edit (relative or absolute)"),
  edits: z.array(ReplaceEditSchema).describe("One or more targeted replacements."),
});

export async function editTool(input: z.infer<typeof EditParamsSchema>, projectCwd?: string) {
  const absolute = path.isAbsolute(input.path) ? input.path : path.resolve(projectCwd || process.cwd(), input.path);
  let content = await readFile(absolute, "utf8");

  for (const e of input.edits) {
    const count = content.split(e.oldText).length - 1;
    if (count !== 1) {
      return { success: false, error: count === 0 ? "STRING_NOT_FOUND" : "STRING_NOT_UNIQUE" };
    }
    content = content.replace(e.oldText, e.newText);
  }

  await writeFile(absolute, content, "utf8");
  return { success: true, message: `Edited ${input.path}` };
}
