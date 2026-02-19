import { readUIMessageStream, tool, ToolLoopAgent } from "ai";
import { readFile } from "./readFile";
import { globTool } from "./glob";
import { listDirectory } from "./listDirectory";
import { grepTool } from "./grep";
import { z } from "zod";
import { batchTool } from "./batch";
import { exploreSubagentPrompt } from "../lib/prompt";
import { createOpenCodeZenModel } from "@/lib/model";

export const exploreSubagent = new ToolLoopAgent({
    model: createOpenCodeZenModel("glm-5-free"),
    instructions: exploreSubagentPrompt,
    tools: {
        readFile: readFile,
        glob: globTool,
        listDirectory: listDirectory,
        grep: grepTool,
        batch: batchTool,    
    },
});


export const exploreTool = tool({
    description: 'Delegate research to a sub-agent for LONG or COMPLEX tasks: adding features, refactoring, multi-file changes, "how does X work?" questions, tracing dependencies across the codebase, or understanding unfamiliar architecture. Returns a structured summary with file paths, code excerpts, and architectural observations. Use this FIRST when the task spans 3+ files or requires broad exploration. For small single-file edits, use glob/grep/readFile directly.',
    inputSchema: z.object({
        task: z.string().describe('A specific research question or exploration goal, e.g. "Find all files related to authentication and how the auth middleware is wired up" or "What database models exist and how are they connected"'),
    }),
    execute: async function* ({ task }, { abortSignal }) {
        const result = await exploreSubagent.stream({
            prompt: task,
            abortSignal,
          });
      
          for await (const message of readUIMessageStream({
            stream: result.toUIMessageStream(),
          })) {
            yield message;
          }
        },
        // toModelOutput: ({ output: message }) => {
        //   const lastTextPart = message?.parts.findLast(p => p.type === 'text');
        //   return {
        //     type: 'text',
        //     value: lastTextPart?.text ?? 'Task completed.',
        //   };
        // },
});
