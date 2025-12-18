import { z } from "zod"
import path from "node:path";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { calculateDiffStats } from "../lib/diff";
const editFilesSchema = z.object({
  target_file: z
    .string()
    .describe("The relative path to the file to modify. The tool will create any directories in the path that don't exist"),
  content : z.string().describe("The content to write to the file"),
  providedNewFile : z.boolean().describe("The new file content to write to the file").optional(),
})

export const editFiles = async function(input: z.infer<typeof editFilesSchema>) {
    const { target_file, content, providedNewFile } = input;
    try {
      const filePath = path.resolve(process.cwd(), target_file);
      const dirPath = path.dirname(filePath);

      // Ensure directory exists
      await mkdir(dirPath, { recursive: true });

      let isNewFile = providedNewFile
      let existingContent = ""
      if(isNewFile === undefined) {
        try {
          existingContent = await fs.promises.readFile(filePath, 'utf-8');
          isNewFile = false
        } catch (error) {
          isNewFile = true
        }
      } else if (!isNewFile) {
        try {
          existingContent = await fs.promises.readFile(filePath, 'utf-8');
        } catch (error) {
          isNewFile = true
        }
      }

      // Write the new content
      await fs.promises.writeFile(filePath, content);
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