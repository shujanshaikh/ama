import { tool } from "ai";
import { z } from "zod";
import { executeTool } from "@/lib/executeTool";

const ExplanationSchema = z.object({
    explanation: z
      .string()
      .describe("One sentence explanation as to why this tool is being used"),
  });
  
  const bashSchema = z
    .object({
      command: z.string().describe("The terminal command to execute"),
      is_background: z
        .boolean()
        .describe("Whether the command should be run in the background"),
    })
    .merge(ExplanationSchema);


export const bashTool = tool({
    description: `Use this tool to run a terminal command
- The command parameter must be a valid terminal command
- The is_background parameter is optional and defaults to false
- The explanation parameter is optional and is used to explain why the tool is being used
`,
    inputSchema: bashSchema,
    execute: async ({ command, is_background }) => {
        try {
            const result = await executeTool("bash", {
                command,
                is_background,
            });
            return result;
        } catch (error: any) {
            console.error(`Error running terminal command: ${error}`);
            return {
                success: false,
                message: `Failed to run terminal command: ${error.message || error}`,
                error: 'RUN_TERMINAL_COMMAND_ERROR',
            };
        }
       
    }
});