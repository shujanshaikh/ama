import type { ToolExecutionContext } from "@/lib/executeTool";
import { createBashTool } from "@/tools/bash";
import { createEditFileTool } from "@/tools/editFile";
import { createGlobTool } from "@/tools/glob";
import { createGrepTool } from "@/tools/grep";
import { createListDirectoryTool } from "@/tools/listDirectory";
import { createReadFileTool } from "@/tools/readFile";
import { createStringReplaceTool } from "@/tools/stringReplace";

export function createTools(context: ToolExecutionContext) {
  return {
    read: createReadFileTool(context),
    bash: createBashTool(context),
    edit: createStringReplaceTool(context),
    write: createEditFileTool(context),
    grep: createGrepTool(context),
    find: createGlobTool(context),
    ls: createListDirectoryTool(context),
  };
}
