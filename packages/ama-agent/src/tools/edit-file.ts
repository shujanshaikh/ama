import { z } from "zod"
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { calculateDiffStats } from "../lib/diff";
import { validatePath, resolveProjectPath } from "../lib/sandbox";

const editFilesSchema = z.object({
  target_file: z
    .string()
    .describe("The relative path to the file to modify. The tool will create any directories in the path that don't exist"),
  content: z.string().describe("The full content to write to the file"),
  providedNewFile: z.boolean().describe("Whether this is a new file (true) or an edit to an existing file (false). Auto-detected if omitted.").optional(),
})

export const editFiles = async function(input: z.infer<typeof editFilesSchema>, projectCwd?: string) {
    const { target_file, content, providedNewFile } = input;

    if (!target_file) {
      return {
        success: false,
        error: 'Missing required parameter: target_file',
        message: 'target_file is required',
      };
    }

    try {
      // Validate path if projectCwd is provided
      if (projectCwd) {
        const validation = validatePath(target_file, projectCwd);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error || 'Path validation failed',
            message: `Failed to edit file: ${target_file}`,
          };
        }
      }
      
      const basePath = projectCwd || process.cwd();
      const filePath = resolveProjectPath(target_file, basePath);
      const dirPath = path.dirname(filePath);

      // Ensure directory exists
      await mkdir(dirPath, { recursive: true });

      let isNewFile = providedNewFile
      let existingContent = ""
      const file = Bun.file(filePath);
      
      if (isNewFile === undefined) {
        const exists = await file.exists();
        if (exists) {
          existingContent = await file.text();
          isNewFile = false;
        } else {
          isNewFile = true;
        }
      } else if (!isNewFile) {
        const exists = await file.exists();
        if (exists) {
          existingContent = await file.text();
        } else {
          isNewFile = true;
        }
      }

      // Skip write if content is identical (no-op)
      if (!isNewFile && existingContent === content) {
        return {
          success: true,
          isNewFile: false,
          message: `No changes needed: ${target_file} (content identical)`,
          linesAdded: 0,
          linesRemoved: 0,
        };
      }

      // Write the new content using Bun.write
      await Bun.write(filePath, content);

      const diffStats = calculateDiffStats(existingContent, content);
      
      if (isNewFile) {
        return {
          success: true,
          isNewFile: true,
          old_string: "",
          new_string: content,
          message: `Created new file: ${target_file} (+${diffStats.linesAdded} lines)`,
          linesAdded: diffStats.linesAdded,
          linesRemoved: diffStats.linesRemoved,
        };
      } else {
        return {
          success: true,
          isNewFile: false,
          old_string: existingContent,
          new_string: content,
          message: `Modified file: ${target_file} (+${diffStats.linesAdded} -${diffStats.linesRemoved} lines)`,
          linesAdded: diffStats.linesAdded,
          linesRemoved: diffStats.linesRemoved,
        };
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `Failed to edit file: ${target_file}`,
      };
      
    }
  }
