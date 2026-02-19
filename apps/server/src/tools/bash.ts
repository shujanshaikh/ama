import { tool } from "ai";
import { z } from "zod";
import { executeTool } from "@/lib/executeTool";

const bashSchema = z.object({
    command: z.string().describe("The terminal command to execute"),
    is_background: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether the command should be run in the background"),
    timeout: z
      .number()
      .optional()
      .describe("Optional timeout in milliseconds. If not specified, commands will time out after 120000ms (2 minutes)."),
    workdir: z
      .string()
      .optional()
      .describe("The working directory to run the command in. Defaults to the project directory. Use this instead of 'cd' commands."),
    description: z
      .string()
      .describe(
        "Clear, concise description of what this command does in 5-10 words. Examples:\nInput: ls\nOutput: Lists files in current directory\n\nInput: git status\nOutput: Shows working tree status\n\nInput: npm install\nOutput: Installs package dependencies\n\nInput: mkdir foo\nOutput: Creates directory 'foo'",
      ),
  });


export const bashTool = tool({
    description: `Use this tool to run a terminal command.
- The command parameter must be a valid terminal command
- Use the workdir parameter to set the working directory instead of 'cd' commands
- The timeout parameter defaults to 120000ms (2 minutes)
- The description parameter should concisely describe what the command does
`,
    inputSchema: bashSchema,
    execute: async ({ command, is_background, timeout, workdir, description }) => {
        try {
            const result = await executeTool("bash", {
                command,
                is_background,
                timeout,
                workdir,
                description,
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
