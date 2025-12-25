import { z } from "zod"
import path from "node:path";
import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { calculateDiffStats } from "../lib/diff";
import { validatePath, resolveProjectPath } from "../lib/sandbox";
import { checkpointStore } from "../lib/checkpoint";
import { randomUUID } from "crypto";

const editFilesSchema = z.object({
  target_file: z
    .string()
    .describe("The relative path to the file to modify. The tool will create any directories in the path that don't exist"),
  content : z.string().describe("The content to write to the file"),
  providedNewFile : z.boolean().describe("The new file content to write to the file").optional(),
  toolCallId: z.string().optional().describe("Optional tool call ID for checkpoint tracking"),
})

export const editFiles = async function(input: z.infer<typeof editFilesSchema>, projectCwd?: string) {
    const { target_file, content, providedNewFile, toolCallId } = input;
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

      // Generate checkpoint ID if not provided
      const checkpointId = toolCallId || randomUUID();

      // Create checkpoint before writing (for reliable revert)
      const checkpoint = checkpointStore.createCheckpoint(
        checkpointId,
        filePath,
        existingContent,
        content
      );

      // Write the new content
      try {
        await fs.promises.writeFile(filePath, content);
      } catch (writeError: any) {
        // Remove checkpoint if write failed
        checkpointStore.removeCheckpoint(checkpointId);
        throw writeError;
      }

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
          // Include checkpoint info for frontend
          checkpointId: checkpoint.id,
          beforeHash: checkpoint.beforeHash,
          afterHash: checkpoint.afterHash,
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
          // Include checkpoint info for frontend
          checkpointId: checkpoint.id,
          beforeHash: checkpoint.beforeHash,
          afterHash: checkpoint.afterHash,
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
