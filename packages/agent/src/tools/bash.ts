import { spawn } from "node:child_process";
import { z } from "zod";

export const BashParamsSchema = z.object({
  command: z.string().describe("Bash command to execute"),
  timeout: z.number().optional().describe("Timeout in seconds (optional, no default timeout)"),
});

export async function bashTool(input: z.infer<typeof BashParamsSchema>, projectCwd?: string) {
  const cwd = projectCwd || process.cwd();
  const timeoutMs = input.timeout && input.timeout > 0 ? input.timeout * 1000 : 0;

  return new Promise((resolve) => {
    const proc = spawn("sh", ["-c", input.command], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          proc.kill("SIGTERM");
        }, timeoutMs)
      : undefined;

    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        resolve({ success: false, error: "TIMEOUT", message: `Command timed out after ${input.timeout}s` });
        return;
      }
      resolve({
        success: code === 0,
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        message: code === 0 ? "Command executed" : "Command failed",
      });
    });

    proc.on("error", (error) => {
      if (timer) clearTimeout(timer);
      resolve({ success: false, error: "EXEC_ERROR", message: error.message });
    });
  });
}
