import type { UIMessage, UITool } from "ai";
import z from "zod";

export interface FileType {
  name: string;
  type: "file" | "directory";
  isOpen?: boolean;
  children?: FileType[];
  path: string;
}

export interface FileEdit {
  content: string;
  target_file: string;
  providedNewFile: boolean;
}

export interface ToolCallFile {
  relative_file_path: string;
  code_edit: string;
  instructions: string;
  old_string?: string;
  new_string?: string;
  replace_all?: boolean;
}

export interface CodeMapping {
  currentFile: FileEdit | null;
  editHistory: FileEdit[];
  fileList: Set<string>;
}

export interface RunTerminalCommandInput {
  command: string;
  is_background?: boolean;
  timeout?: number;
  workdir?: string;
  description: string;
}

export interface RunTerminalCommandOutput {
  success: boolean;
  message: string;
  error?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatTools = Record<string, UITool>;

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
  old_string?: string;
  new_string?: string;
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

export interface BatchToolCallResult {
  tool: string;
  success: boolean;
  result?: ToolOutput;
  error?: string;
}

export interface BatchOutput {
  success: boolean;
  message: string;
  error?: string;
  totalCalls: number;
  successful: number;
  failed: number;
  results: BatchToolCallResult[];
}

export type ToolOutput =
  | ReadFileOutput
  | ListOutput
  | GlobOutput
  | GrepOutput
  | SuccessOutput
  | EditFilesOutput
  | DeleteFileOutput
  | RunTerminalCommandOutput
  | BatchOutput;

export interface SubagentToolPart {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}

export interface ExploreOutput {
  messages?: Array<{
    role: string;
    parts: Array<SubagentToolPart | { type: "text"; text: string }>;
  }>;
}

export type ToolPart = {
  type: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  output?: ToolOutput;
  errorText?: string;
};

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
