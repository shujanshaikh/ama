import { readUIMessageStream, tool, ToolLoopAgent } from "ai";
import { z } from "zod";
import { exploreSubagentPrompt } from "@/lib/prompt";
import { createOpenCodeZenModel } from "@/lib/model";
import type { ToolExecutionContext } from "@/lib/executeTool";
import { createReadFileTool } from "@/tools/readFile";
import { createGlobTool } from "@/tools/glob";
import { createListDirectoryTool } from "@/tools/listDirectory";
import { createGrepTool } from "@/tools/grep";
import { createBatchTool } from "@/tools/batch";

export function createExploreTool(context: ToolExecutionContext) {
  const exploreSubagent = new ToolLoopAgent({
    model: createOpenCodeZenModel("glm-5-free", context.env),
    instructions: exploreSubagentPrompt,
    tools: {
      readFile: createReadFileTool(context),
      glob: createGlobTool(context),
      listDirectory: createListDirectoryTool(context),
      grep: createGrepTool(context),
      batch: createBatchTool(context),
    },
  });

  return tool({
    description: "Delegate research to a sub-agent for complex tasks.",
    inputSchema: z.object({
      task: z.string().describe("A specific research question or exploration goal"),
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
  });
}
