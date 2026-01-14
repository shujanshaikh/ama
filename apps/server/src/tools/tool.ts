import { readFile } from "./readFile";
import { stringReplace } from "./stringReplace";
import { editFile } from "./editFile";
import { deleteFile } from "./deleteFile";
import { grepTool } from "./grep";
import { globTool } from "./glob";
import { listDirectory } from "./listDirectory";
import { runTerminalCommand } from "./runTerminalCommand";
import { webSearch } from "./web-search";
import { batchTool } from "./batch";
import { supermemoryTools } from "@supermemory/tools/ai-sdk";

export const tool = {
  readFile: readFile,
  stringReplace: stringReplace,
  editFile: editFile,
  deleteFile: deleteFile,
  grep: grepTool,
  glob: globTool,
  listDirectory: listDirectory,
  runTerminalCommand: runTerminalCommand,
  webSearch: webSearch,
  batch: batchTool,
};

const supermemoryToolsConfig = process.env.SUPERMEMORY_API_KEY
  ? supermemoryTools(process.env.SUPERMEMORY_API_KEY)
  : {};

export const tools = {
  ...tool,
  ...supermemoryToolsConfig,
};
