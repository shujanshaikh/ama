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
    description: 'Delegate a research task to an exploration agent that can search, read, and navigate the codebase. Use this to find relevant files, trace dependencies, understand architecture, or gather context before making changes. The agent returns a structured summary of its findings including file paths, code excerpts, and architectural observations.',
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
