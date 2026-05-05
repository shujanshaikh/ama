import { bashTool } from "./tools/bash.ts";
import { editTool } from "./tools/edit.ts";
import { findTool } from "./tools/find.ts";
import { grepTool } from "./tools/grep.ts";
import { lsTool } from "./tools/ls.ts";
import { readTool } from "./tools/read.ts";
import { writeTool } from "./tools/write.ts";

export { bashTool, editTool, findTool, grepTool, lsTool, readTool, writeTool };

export type ToolName = "read" | "bash" | "edit" | "write" | "grep" | "find" | "ls";
export const allToolNames: Set<ToolName> = new Set(["read", "bash", "edit", "write", "grep", "find", "ls"]);

export type ToolExecutor = (input: any, projectCwd?: string) => Promise<any>;

export interface ToolsOptions { projectCwd?: string; }
export interface NamedTool { name: ToolName; execute: (input: any) => Promise<any>; }

function bindTool(executor: ToolExecutor, projectCwd?: string) {
  return async (input: any) => executor(input, projectCwd);
}

export function createTool(toolName: ToolName, options?: ToolsOptions): NamedTool {
  const cwd = options?.projectCwd;
  switch (toolName) {
    case "read": return { name: "read", execute: bindTool(readTool, cwd) };
    case "bash": return { name: "bash", execute: bindTool(bashTool, cwd) };
    case "edit": return { name: "edit", execute: bindTool(editTool, cwd) };
    case "write": return { name: "write", execute: bindTool(writeTool, cwd) };
    case "grep": return { name: "grep", execute: bindTool(grepTool, cwd) };
    case "find": return { name: "find", execute: bindTool(findTool, cwd) };
    case "ls": return { name: "ls", execute: bindTool(lsTool, cwd) };
  }
}

export function createCodingTools(options?: ToolsOptions): NamedTool[] {
  return [createTool("read", options), createTool("bash", options), createTool("edit", options), createTool("write", options)];
}

export function createReadOnlyTools(options?: ToolsOptions): NamedTool[] {
  return [createTool("read", options), createTool("grep", options), createTool("find", options), createTool("ls", options)];
}

export function createAllTools(options?: ToolsOptions): Record<ToolName, NamedTool> {
  return {
    read: createTool("read", options),
    bash: createTool("bash", options),
    edit: createTool("edit", options),
    write: createTool("write", options),
    grep: createTool("grep", options),
    find: createTool("find", options),
    ls: createTool("ls", options),
  };
}

export const toolSnippets: Record<ToolName, string> = {
  read: "Read file contents",
  bash: "Execute bash commands",
  edit: "Edit files with exact replacements",
  write: "Create or overwrite files",
  grep: "Search file contents",
  find: "Find files by glob",
  ls: "List directory contents",
};
