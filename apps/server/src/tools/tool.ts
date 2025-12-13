import { readFile } from "./readFile";
import { stringReplace } from "./stringReplace";
import { editFile } from "./editFile";
import { deleteFile } from "./deleteFile";
import { grepTool } from "./grep";
import { globTool } from "./glob";
import { listDirectory } from "./listDirectory";

export const tool = {
    readFile: readFile,
    stringReplace: stringReplace,
    editFile: editFile,
    deleteFile: deleteFile,
    grep: grepTool,
    glob: globTool,
    listDirectory: listDirectory,
}