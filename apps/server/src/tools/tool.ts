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


export const tools = {
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
} 