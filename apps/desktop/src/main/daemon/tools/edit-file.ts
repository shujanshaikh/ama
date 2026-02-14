import { z } from "zod"
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { calculateDiffStats } from "../diff";
import { validatePath, resolveProjectPath } from "../sandbox";

const editFilesSchema = z.object({
  target_file: z
    .string()
    .describe("The relative path to the file to modify. The tool will create any directories in the path that don't exist"),
  content : z.string().describe("The content to write to the file"),
  providedNewFile : z.boolean().describe("The new file content to write to the file").optional(),
})

export const editFiles = async function(input: z.infer<typeof editFilesSchema>, projectCwd?: string) {
    const parsedInput = editFilesSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        success: false,
        error: "INVALID_INPUT",
        message: `Invalid editFile input: ${parsedInput.error.issues[0]?.message ?? "Invalid input"}`,
      };
    }

    const { target_file, content, providedNewFile } = parsedInput.data;
    try {
      if (!target_file.trim()) {
        return {
          success: false,
          error: "MISSING_TARGET_FILE",
          message: "Missing required parameter: target_file",
        };
      }

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

      if(isNewFile === undefined) {
        if (existsSync(filePath)) {
          existingContent = await readFile(filePath, "utf-8");
          isNewFile = false;
        } else {
          isNewFile = true;
        }
      } else if (!isNewFile) {
        if (existsSync(filePath)) {
          existingContent = await readFile(filePath, "utf-8");
        } else {
          isNewFile = true;
        }
      }

      // Write the new content
      await writeFile(filePath, content, "utf-8");

      const diffStats = calculateDiffStats(existingContent, content);

      if (isNewFile) {
        return {
          success: true,
          isNewFile: true,
          old_string: "",
          new_string: content,
          message: `Created new file: ${target_file}`,
          linesAdded: diffStats.linesAdded,
          linesRemoved: diffStats.linesRemoved,
        };
      } else {
        return {
          success: true,
          isNewFile: false,
          old_string: existingContent,
          new_string: content,
          message: `Modified file: ${target_file}`,
          linesAdded: diffStats.linesAdded,
          linesRemoved: diffStats.linesRemoved,
        };
      }

    } catch (error : any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `Failed to edit file: ${target_file}`,
      };

    }
  }
