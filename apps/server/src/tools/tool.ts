import type { LanguageModel } from "ai";
import { readFile } from "./readFile";
import { stringReplace } from "./stringReplace";
import { editFile } from "./editFile";
import { deleteFile } from "./deleteFile";
import { grepTool } from "./grep";
import { globTool } from "./glob";
import { listDirectory } from "./listDirectory";
import { bashTool } from "./bash";
import { webSearch } from "./webSearch";
import { batchTool } from "./batch";
import { createExploreTool } from "./exploreAgent";

export function createToolSet(exploreModel: LanguageModel) {
  return {
    readFile: readFile,
    stringReplace: stringReplace,
    editFile: editFile,
    deleteFile: deleteFile,
    grep: grepTool,
    glob: globTool,
    listDirectory: listDirectory,
    bash: bashTool,
    webSearch: webSearch,
    batch: batchTool,
    explore: createExploreTool(exploreModel),
  };
}