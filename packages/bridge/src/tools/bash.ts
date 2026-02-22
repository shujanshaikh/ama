import { tool } from "ai";
import { z } from "zod";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

const bashSchema = z.object({
  command: z.string().describe("The terminal command to execute"),
  is_background: z.boolean().optional().default(false).describe("Whether the command should be run in the background"),
  timeout: z.number().optional().describe("Optional timeout in milliseconds. If not specified, commands will time out after 120000ms (2 minutes)."),
  workdir: z.string().optional().describe("The working directory to run the command in. Defaults to the project directory. Use this instead of 'cd' commands."),
  description: z.string().describe("Clear, concise description of what this command does in 5-10 words."),
});

export function createBashTool(context: ToolExecutionContext) {
  return tool({
    description: "Use this tool to run a terminal command.",
    inputSchema: bashSchema,
    execute: async ({ command, is_background, timeout, workdir, description }) => {
      return executeTool(context, "bash", {
        command,
        is_background,
        timeout,
        workdir,
        description,
      });
    },
  });
}
