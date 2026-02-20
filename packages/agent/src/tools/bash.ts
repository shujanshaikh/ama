import { z } from "zod";
import { spawn } from "node:child_process";

const ExplanationSchema = z.object({
  description: z
    .string()
    .describe(
      "Clear, concise description of what this command does in 5-10 words. Examples:\nInput: ls\nOutput: Lists files in current directory\n\nInput: git status\nOutput: Shows working tree status\n\nInput: npm install\nOutput: Installs package dependencies\n\nInput: mkdir foo\nOutput: Creates directory 'foo'",
    ),
});

const BLOCKED_PATTERNS: RegExp[] = [
  /\brm\s+(-\w+\s+)*(\/ |\/\s*$|~|\/\*|\*)/,
  /\bdd\s+.*of=\/dev\//,
  /\bmkfs\b/,
  /:\(\)\{.*\|.*&\}\s*;?\s*:/,
  /\bchmod\s+.*-R.*\s+\/\s*$/,
  /\bchown\s+.*-R.*\s+\/\s*$/,
  /\b(curl|wget)\s+.*\|\s*(ba)?sh/,
  /\bmv\s+(\/|\*)\s/,
  /\bcat\s+\/dev\/(u?random|zero)\s*>\s*\/dev\//,
  /\bformat\s+[A-Z]:/i,
  /\bdiskpart\b/i,
  /\bcipher\s+\/w:/i,
];

const DANGEROUS_FLAGS: RegExp[] = [
  /--no-preserve-root/,
  /\bgit\s+push\s+.*--force\b/,
  /\bgit\s+push\s+-f\b/,
];

const MAX_OUTPUT_SIZE = 1 * 1024 * 1024;
const DEFAULT_TIMEOUT = 120_000; // 2 minutes (matches OpenCode default)

function evaluateCommandSafety(command: string): { safe: boolean; reason?: string } {
  const trimmed = command.trim();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: `Blocked by safety policy: matches destructive pattern` };
    }
  }

  for (const flag of DANGEROUS_FLAGS) {
    if (flag.test(trimmed)) {
      return { safe: false, reason: `Blocked by safety policy: dangerous flag detected` };
    }
  }

  return { safe: true };
}

export const BashParamsSchema = z
  .object({
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
  })
  .merge(ExplanationSchema);

export const runSecureTerminalCommand = async (
  command: string,
  timeout: number,
  cwd?: string,
) => {
  try {
    const safety = evaluateCommandSafety(command);
    if (!safety.safe) {
      console.log(`[CLI] Blocked command: ${command} — ${safety.reason}`);
      return {
        success: false,
        message: safety.reason,
        error: "BLOCKED_COMMAND",
      };
    }

    const proc = spawn("sh", ["-c", command], {
      cwd: cwd || process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let stdout = "";
    let stderr = "";

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGTERM");
      }, timeout);
    }

    if (proc.stdout) {
      proc.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });
    }

    const exitCode = await new Promise<number | null>((resolve, reject) => {
      proc.once("error", reject);
      proc.once("close", (code) => resolve(code));
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (timedOut) {
      return {
        success: false,
        message: `Command timed out after ${timeout}ms`,
        error: "TIMEOUT",
        stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
        stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
      };
    }

    return {
      stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
      stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
      exitCode: exitCode ?? 1,
    };
  } catch (error: any) {
    console.error("Error while executing the securedShell command", error);
    return {
      success: false,
      message: "Error while executing the securedShell command",
      error: error.message,
    };
  }
};

export const bashTool = async (
  input: z.infer<typeof BashParamsSchema>,
  projectCwd?: string,
) => {
  try {
    const safety = evaluateCommandSafety(input.command);
    if (!safety.safe) {
      console.log(`[CLI] Blocked command: ${input.command} — ${safety.reason}`);
      return {
        success: false,
        message: safety.reason,
        error: "BLOCKED_COMMAND",
      };
    }

    // Validate timeout if provided
    if (input.timeout !== undefined && input.timeout < 0) {
      return {
        success: false,
        message: `Invalid timeout value: ${input.timeout}. Timeout must be a positive number.`,
        error: "INVALID_TIMEOUT",
      };
    }

    // Resolve working directory: workdir param > projectCwd > process.cwd()
    const cwd = input.workdir || projectCwd || process.cwd();
    const timeout = input.timeout ?? DEFAULT_TIMEOUT;

    if (input?.is_background) {
      const proc = spawn("sh", ["-c", input.command], {
        cwd,
        stdio: "ignore",
        detached: true,
      });

      proc.unref();

      console.log(`[LOCAL] Background command started: ${input.command}`);

      return {
        success: true,
        message: `Background command started: ${input.command}`,
        isBackground: true,
      };
    } else {
      const result: any = await runSecureTerminalCommand(
        input.command,
        timeout,
        cwd,
      );

      if (result?.error && !result?.exitCode) {
        return result;
      }

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
  } catch (error: any) {
    console.error("Error while executing the terminal command", error);
    return {
      success: false,
      message: "Error while executing the terminal command",
      error: error.message,
    };
  }
};
