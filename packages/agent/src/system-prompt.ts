import { toolSnippets, type ToolName } from "./pi.ts";

export interface BuildSystemPromptOptions {
  customPrompt?: string;
  selectedTools?: ToolName[];
  promptGuidelines?: string[];
  appendSystemPrompt?: string;
  cwd: string;
}

export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const {
    customPrompt,
    selectedTools = ["read", "bash", "edit", "write"],
    promptGuidelines,
    appendSystemPrompt,
    cwd,
  } = options;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;
  const normalizedCwd = cwd.replace(/\\/g, "/");

  if (customPrompt) {
    let prompt = customPrompt;
    if (appendSystemPrompt) {
      prompt += `\n\n${appendSystemPrompt}`;
    }
    prompt += `\nCurrent date: ${date}`;
    prompt += `\nCurrent working directory: ${normalizedCwd}`;
    return prompt;
  }

  const toolsList = selectedTools
    .map((name) => `- ${name}: ${toolSnippets[name]}`)
    .join("\n");

  const guidelines = [
    "Use read before mutating files",
    "Prefer concise responses",
    "Use exact file paths when reporting changes",
    ...(promptGuidelines ?? []),
  ]
    .map((line) => `- ${line}`)
    .join("\n");

  let prompt = `You are an expert coding assistant operating inside ama, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.\n\nAvailable tools:\n${toolsList}\n\nGuidelines:\n${guidelines}`;

  if (appendSystemPrompt) {
    prompt += `\n\n${appendSystemPrompt}`;
  }

  prompt += `\n\nCurrent date: ${date}`;
  prompt += `\nCurrent working directory: ${normalizedCwd}`;

  return prompt;
}
