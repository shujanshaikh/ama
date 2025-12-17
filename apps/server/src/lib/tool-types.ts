import type { readFile } from "@/tools/readFile"
import type { listDirectory } from "@/tools/listDirectory"
import type { globTool } from "@/tools/glob"
import type { grepTool } from "@/tools/grep"
import type { editFile } from "@/tools/editFile"
import type { deleteFile } from "@/tools/deleteFile"
import type { stringReplace } from "@/tools/stringReplace"
import type { InferUITool, UIMessage } from "ai"
import z from "zod"


export interface FileType {
    name: string
    type: "file" | "directory"
    isOpen?: boolean
    children?: FileType[]
    path: string
}

export interface FileEdit {
    relative_file_path: string
    code_edit: string
    instructions: string
    timestamp: Date
    toolName: string
}

export interface ToolCallFile {
    relative_file_path: string
    code_edit: string
    instructions: string
    old_string?: string
    new_string?: string
    replace_all?: boolean
}

export interface CodeMapping {
    currentFile: FileEdit | null
    editHistory: FileEdit[]
    fileList: Set<string>
}

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
type stringReplace = InferUITool<typeof stringReplace>;
type readFile = InferUITool<typeof readFile>;
type list = InferUITool<typeof listDirectory>;
type globTool = InferUITool<typeof globTool>;
type grepTool = InferUITool<typeof grepTool>;
type editFiles = InferUITool<typeof editFile>;
type deleteFile = InferUITool<typeof deleteFile>;

export type ChatTools = {
  stringReplace: stringReplace;
  readFile: readFile;
  list: list;
  globTool: globTool;
  grepTool: grepTool;
  editFiles: editFiles;
  deleteFile: deleteFile;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  appendMessage: string;
  id: string;
  title: string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface ListFileItem {
  name: string;
  absolutePath: string;
  relativePath: string;
  type: "file" | "directory";
}

export interface ReadFileOutput {
  success: boolean;
  message: string;
  content?: string;
  totalLines?: number;
  error?: string;
}

export interface ListOutput {
  success: boolean;
  message: string;
  files?: ListFileItem[];
  error?: string;
}

export interface GlobOutput {
  success: boolean;
  message: string;
  files?: string[] | Array<{ path?: string; name?: string }>;
  error?: string;
}

export interface GrepOutput {
  success: boolean;
  message: string;
  result?: {
    matches: string[];
    totalMatches: number;
    filesSearched: number;
    truncated: boolean;
  };
  error?: string;
}

export interface EditFilesOutput {
  success: boolean;
  message: string;
  error?: string;
  linesAdded?: number;
  linesRemoved?: number;
  isNewFile?: boolean;
}

export interface DeleteFileOutput {
  success: boolean;
  message: string;
  error?: string;
  linesDeleted?: number;
}

export interface SuccessOutput {
  success: boolean;
  message: string;
  error?: string;
  codes?: unknown;
}

export type ToolOutput = ReadFileOutput | ListOutput | GlobOutput | GrepOutput | SuccessOutput | EditFilesOutput | DeleteFileOutput;

export type ToolPart = {
  type: `tool-${keyof ChatTools}` | string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  output?: ToolOutput;
  errorText?: string;
};

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}