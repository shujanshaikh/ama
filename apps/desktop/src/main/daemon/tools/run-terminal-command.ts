import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const harmfulCommands = [
  "rm -rf *", "rm -rf /", "rm -rf /home", "rm -rf /root",
  "dd if=/dev/zero of=/dev/sda", "mkfs.ext4 /", ":(){:|:&};:",
  "chmod -R 000 /", "mv / /tmp", "format C:",
];

export async function executeRunTerminalCommand(
  input: { command: string; is_background?: boolean; explanation?: string },
  projectCwd?: string,
) {
  const { command, is_background } = input;

  if (harmfulCommands.includes(command)) {
    return { success: false, message: `Harmful command detected: ${command}`, error: "HARMFUL_COMMAND_DETECTED" };
  }

  const cwd = projectCwd || process.cwd();

  if (is_background) {
    const { exec: execCp } = require("node:child_process");
    const proc = execCp(command, { cwd, detached: true, stdio: "ignore" });
    proc.unref?.();
    return { success: true, message: `Background command started: ${command}`, isBackground: true };
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 30000,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      success: true,
      stdout: stdout?.trim(),
      stderr: stderr?.trim(),
      exitCode: 0,
      message: `Command executed successfully: ${command}`,
    };
  } catch (error: any) {
    if (error.killed) {
      return { success: false, message: `Command timed out: ${command}`, error: "TIMEOUT" };
    }
    return {
      success: error.code === 0,
      stdout: error.stdout?.trim(),
      stderr: error.stderr?.trim(),
      exitCode: error.code,
      message: `Command failed with exit code ${error.code}: ${command}`,
    };
  }
}
