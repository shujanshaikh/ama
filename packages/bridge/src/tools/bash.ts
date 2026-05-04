import { tool } from "ai";
import { z } from "zod";
import { executeTool, type ToolExecutionContext } from "@/lib/executeTool";

export function createBashTool(context: ToolExecutionContext) {
  return tool({
    description: "Execute a bash command in the current working directory.",
    inputSchema: z.object({
      command: z.string().describe("Bash command to execute"),
      timeout: z.number().optional().describe("Timeout in seconds (optional, no default timeout)"),
    }),
    execute: async ({ command, timeout }) => executeTool(context, "bash", { command, timeout }),
  });
}
