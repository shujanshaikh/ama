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
import { supermemoryTools } from "@supermemory/tools/ai-sdk";
import { exploreTool } from "./exploreAgent";

export const tool = {
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
  explore: exploreTool,
};

const supermemoryToolsConfig = process.env.SUPERMEMORY_API_KEY
  ? supermemoryTools(process.env.SUPERMEMORY_API_KEY)
  : {};

export const tools = {
  ...tool,
  ...supermemoryToolsConfig,
};
