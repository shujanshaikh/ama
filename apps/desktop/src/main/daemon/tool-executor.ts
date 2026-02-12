import { executeReadFile } from "./tools/read-file";
import { executeEditFile } from "./tools/edit-file";
import { executeStringReplace } from "./tools/string-replace";
import { executeDeleteFile } from "./tools/delete-file";
import { executeGrep } from "./tools/grep";
import { executeGlob } from "./tools/glob";
import { executeListDirectory } from "./tools/list-directory";
import { executeRunTerminalCommand } from "./tools/run-terminal-command";
import { executeBatch } from "./tools/batch";

export const toolExecutors: Record<
  string,
  (args: any, projectCwd?: string) => Promise<any>
> = {
  readFile: executeReadFile,
  editFile: executeEditFile,
  stringReplace: executeStringReplace,
  deleteFile: executeDeleteFile,
  grep: executeGrep,
  glob: executeGlob,
  listDirectory: executeListDirectory,
  runTerminalCommand: executeRunTerminalCommand,
  batch: executeBatch,
};
