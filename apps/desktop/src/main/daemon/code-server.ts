import { homedir } from "node:os";
import type { ChildProcess } from "node:child_process";
import {
  isCodeServerInstalled,
  installCodeServer,
  startCodeServer,
} from "amai/lib/code-server";
import { projectRegistry } from "./project-registry";

let codeServerProcess: ChildProcess | null = null;

export async function ensureCodeServerRunning(cwd?: string): Promise<boolean> {
  if (codeServerProcess && !codeServerProcess.killed) {
    return true;
  }

  try {
    if (!isCodeServerInstalled()) {
      console.log("[code-server] Installing...");
      await installCodeServer();
    }

    if (!isCodeServerInstalled()) {
      console.log("[code-server] Install failed, skipping");
      return false;
    }

    const workDir =
      cwd ||
      projectRegistry.list()[0]?.cwd ||
      homedir();

    codeServerProcess = await startCodeServer(workDir);
    console.log("[code-server] Started");
    return true;
  } catch (error: unknown) {
    console.error("[code-server] Failed to start:", error);
    return false;
  }
}

export function stopCodeServer(): void {
  if (codeServerProcess && !codeServerProcess.killed) {
    codeServerProcess.kill("SIGTERM");
    codeServerProcess = null;
    console.log("[code-server] Stopped");
  }
}

export function isCodeServerRunning(): boolean {
  return codeServerProcess != null && !codeServerProcess.killed;
}
