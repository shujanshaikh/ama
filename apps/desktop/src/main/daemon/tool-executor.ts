import { read_file } from "./tools/read-file";
import { editFiles } from "./tools/edit-file";
import { apply_patch } from "./tools/apply-patch";
import { deleteFile } from "./tools/delete-file";
import { grepTool } from "./tools/grep";
import { globTool } from "./tools/glob";
import { list } from "./tools/ls-dir";
import { runTerminalCommand } from "./tools/runTerminalCommand";
import { batchTool } from "./tools/batch";

export const toolExecutors: Record<
  string,
  (args: any, projectCwd?: string) => Promise<any>
> = {
  readFile: read_file,
  editFile: editFiles,
  applyPatch: apply_patch,
  deleteFile: deleteFile,
  grep: grepTool,
  glob: globTool,
  listDirectory: list,
  runTerminalCommand: runTerminalCommand,
  batch: batchTool,
};
