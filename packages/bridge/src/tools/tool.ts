import type { ToolExecutionContext } from "@/lib/executeTool";
import { createBatchTool } from "@/tools/batch";
import { createBashTool } from "@/tools/bash";
import { createDeleteFileTool } from "@/tools/deleteFile";
import { createEditFileTool } from "@/tools/editFile";
import { createExploreTool } from "@/tools/exploreAgent";
import { createGlobTool } from "@/tools/glob";
import { createGrepTool } from "@/tools/grep";
import { createListDirectoryTool } from "@/tools/listDirectory";
import { createReadFileTool } from "@/tools/readFile";
import { createStringReplaceTool } from "@/tools/stringReplace";
import { createWebSearchTool } from "@/tools/webSearch";

export function createTools(context: ToolExecutionContext) {
  return {
    readFile: createReadFileTool(context),
    stringReplace: createStringReplaceTool(context),
    editFile: createEditFileTool(context),
    deleteFile: createDeleteFileTool(context),
    grep: createGrepTool(context),
    glob: createGlobTool(context),
    listDirectory: createListDirectoryTool(context),
    bash: createBashTool(context),
    webSearch: createWebSearchTool(context),
    batch: createBatchTool(context),
    explore: createExploreTool(context),
  };
}
