import { z } from "zod";

const ExplanationSchema = z.object({
  explanation: z
    .string()
    .describe("One sentence explanation as to why this tool is being used"),
});

// ── Category-based command safety policy ───────────────────────────────────

/** Patterns that are always blocked (destructive / dangerous) */
const BLOCKED_PATTERNS: RegExp[] = [
  // rm with -r/-f flags (combined or separate) targeting /, ~, $HOME, or *
  /\brm\s+(-\w+\s+)*(\/ |\/\s*$|~|\/\*|\*)/,
  // Disk-wiping commands
  /\bdd\s+.*of=\/dev\//,
  /\bmkfs\b/,
  // Fork bomb
  /:\(\)\{.*\|.*&\}\s*;?\s*:/,
  // Recursive chmod/chown on root
  /\bchmod\s+.*-R.*\s+\/\s*$/,
  /\bchown\s+.*-R.*\s+\/\s*$/,
  // Pipe from remote URL directly into shell
  /\b(curl|wget)\s+.*\|\s*(ba)?sh/,
  // Move root filesystem
  /\bmv\s+(\/|\*)\s/,
  // Write random data to disk device
  /\bcat\s+\/dev\/(u?random|zero)\s*>\s*\/dev\//,
  // Windows-specific destructive
  /\bformat\s+[A-Z]:/i,
  /\bdiskpart\b/i,
  /\bcipher\s+\/w:/i,
];

/** Argument-level patterns that should be rejected */
const DANGEROUS_FLAGS: RegExp[] = [
  /--no-preserve-root/,
  /\bgit\s+push\s+.*--force\b/,
  /\bgit\s+push\s+-f\b/,
];

/** Max output size per command (1MB) */
const MAX_OUTPUT_SIZE = 1 * 1024 * 1024;

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

export const RunTerminalCmdParamsSchema = z
  .object({
    command: z.string().describe("The terminal command to execute (e.g., 'ls -la', 'pwd', 'echo $HOME')"),
    is_background: z
      .boolean()
      .describe("Whether the command should be run in the background"),
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

    const proc = Bun.spawn(["sh", "-c", command], {
      cwd: cwd || process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });

    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeout);
    }

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

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
      exitCode,
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

export const runTerminalCommand = async (
  input: z.infer<typeof RunTerminalCmdParamsSchema>,
  projectCwd?: string,
) => {
  try {
    // Validate command safety first for both foreground and background
    const safety = evaluateCommandSafety(input.command);
    if (!safety.safe) {
      console.log(`[CLI] Blocked command: ${input.command} — ${safety.reason}`);
      return {
        success: false,
        message: safety.reason,
        error: "BLOCKED_COMMAND",
      };
    }

    if (input?.is_background) {
      const proc = Bun.spawn(["sh", "-c", input.command], {
        cwd: projectCwd || process.cwd(),
        stdout: "ignore",
        stderr: "ignore",
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
        30000,
        projectCwd
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
