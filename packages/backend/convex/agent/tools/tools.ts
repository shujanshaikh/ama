import { readFile } from "./readFIle";
import { stringReplace } from "./stringReplace";
import { listDirTool } from "./listDir";
import { grepTool } from "./grep";
import { editFiles } from "./editFile";
import { deleteFile } from "./deleteFile";
import { globTool } from "./glob";


export const tools = {
    readFile: readFile,
    stringReplace: stringReplace,
    listDir: listDirTool,
    grep: grepTool,
    editFile: editFiles,
    deleteFile: deleteFile,
    glob: globTool,
}