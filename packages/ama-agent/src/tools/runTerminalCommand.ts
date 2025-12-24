import { z } from "zod";
import { spawn } from "node:child_process";

const ExplanationSchema = z.object({
  explanation: z
    .string()
    .describe("One sentence explanation as to why this tool is being used"),
});

export const RunTerminalCmdParamsSchema = z
  .object({
    command: z.string().describe("The terminal command to execute"),
    is_background: z
      .boolean()
      .describe("Whether the command should be run in the background"),
  })
  .merge(ExplanationSchema);

export const runSecureTerminalCommand = async (
  command: string,
  timeout: number,
) => {
  try {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });

      let stdout = "";
      let stderr = "";
      let timeoutId: NodeJS.Timeout | null = null!;

      if (timeoutId > 0) {
        timeoutId = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
      }

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Handle process exit
      child.stdout.on("close", (code : string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Always resolve - let caller handle exit code
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      // Handle process errors
      child.stderr.on("error", (error : string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
    });
  } catch {
    console.error("Error while ecexuting the securedShell command")
  }
};

export const runTerminalCommand = async (
  input: z.infer<typeof RunTerminalCmdParamsSchema>,
  projectCwd?: string,
) => {
  try {
    if (input?.is_background) {
      // For background commands, use spawn with shell enabled
      const child = spawn(input.command, {
        cwd: projectCwd,
        detached: true,
        stdio: "ignore",
        shell: true,
      });

      child.unref(); // Allow parent to exit

      console.log(`[LOCAL] Background command started: ${input.command}`);

      return {
        success: true,
        message: `Background command started: ${input.command}`,
        isBackground: true,
      };
    } else {
      // For foreground commands, use secure spawn with timeout and shell
      const result : any = await runSecureTerminalCommand(
        input.command,
        30000 // 30 second timeout
      );

      const success = result?.exitCode === 0;
      return {
        success,
        stdout: result?.stdout?.trim(),
        stderr: result?.stderr?.trim(),
        exitCode: result?.exitCode,
        message: success
          ? `Command executed successfully: ${input.command}`
          : `Command failed with exit code ${result?.exitCode}: ${input.command}`,
      };
    }
  } catch (error : any) {
    console.error("Error while executing the terminal command", error)
    return {
      success: false,
      message: "Error while executing the terminal command",
      error: error.message,
    }
  }
};
