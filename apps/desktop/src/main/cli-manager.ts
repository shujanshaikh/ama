import { app } from "electron";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getTokensForCLI } from "./auth";

const AMA_DIR = path.join(os.homedir(), ".amai");
const CREDENTIALS_PATH = path.join(AMA_DIR, "credentials.json");
const PID_FILE = path.join(AMA_DIR, "daemon.pid");
const LOG_FILE = path.join(AMA_DIR, "daemon.log");

const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAY_MS = 2000;

let daemonProcess: any = null;
let restartAttempts = 0;
let shouldRun = false;

function ensureAmaiDir(): void {
  if (!fs.existsSync(AMA_DIR)) {
    fs.mkdirSync(AMA_DIR, { recursive: true });
  }
}

/** Resolve path to the bundled CLI daemon entry */
function getDaemonEntryPath(): string {
  if (app.isPackaged) {
    // In packaged app, extraResource copies the dist folder into Resources/dist/
    return path.join(process.resourcesPath, "dist", "lib", "daemon-entry.js");
  }
  // In dev mode, resolve to the workspace package dist
  return path.resolve(
    app.getAppPath(),
    "../../packages/ama-agent/dist/lib/daemon-entry.js",
  );
}

/** Write desktop auth tokens to ~/.amai/credentials.json for the CLI */
export function syncAuthTokens(): void {
  ensureAmaiDir();
  const tokens = getTokensForCLI();
  if (!tokens) return;

  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(tokens, null, 2), "utf-8");
  console.log("[cli-manager] Auth tokens synced to", CREDENTIALS_PATH);
}

/** Remove CLI credentials on sign-out */
export function clearAuthTokens(): void {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      fs.unlinkSync(CREDENTIALS_PATH);
      console.log("[cli-manager] Credentials removed");
    }
  } catch (error) {
    console.error("[cli-manager] Failed to clear credentials:", error);
  }
}

/** Ensure ~/.amai dir exists and auth tokens are synced */
export function ensureCLISetup(): void {
  ensureAmaiDir();
  syncAuthTokens();
}

/** Spawn the CLI daemon process */
export function startCLIDaemon(): void {
  shouldRun = true;
  restartAttempts = 0;

  // Kill any stale daemon from a previous session
  killByPidFile();
  cleanupPidFile();

  spawnDaemon();
}

function spawnDaemon(): void {
  if (daemonProcess && !daemonProcess.killed) {
    console.log("[cli-manager] Daemon already running");
    return;
  }

  const entryPath = getDaemonEntryPath();
  if (!fs.existsSync(entryPath)) {
    console.error("[cli-manager] Daemon entry not found at:", entryPath);
    return;
  }

  ensureAmaiDir();

  const logFd = fs.openSync(LOG_FILE, "a");

  const bunCheck = spawnSync("bun", ["--version"], { stdio: "ignore" });
  if (bunCheck.error || bunCheck.status !== 0) {
    console.error(
      "[cli-manager] Bun runtime is required to start daemon tools, but it was not found in PATH.",
    );
    return;
  }

  const child = spawn("bun", [entryPath], {
    env: {
      ...process.env,
      AMA_DAEMON: "1",
    },
    stdio: ["ignore", logFd, logFd],
    detached: false,
  }) as any;
  daemonProcess = child;

  fs.closeSync(logFd);

  if (child.pid) {
    fs.writeFileSync(PID_FILE, String(child.pid), "utf-8");
    console.log("[cli-manager] Daemon started with PID:", child.pid);
  }

  child.on("exit", (code: number | null, signal: string | null) => {
    console.log(`[cli-manager] Daemon exited (code=${code}, signal=${signal})`);
    daemonProcess = null;
    cleanupPidFile();

    // Auto-restart on unexpected crash if we still want it running
    if (shouldRun && code !== 0 && restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      console.log(`[cli-manager] Restarting daemon (attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS}) in ${RESTART_DELAY_MS}ms...`);
      setTimeout(spawnDaemon, RESTART_DELAY_MS);
    }
  });

  child.on("error", (error: Error) => {
    console.error("[cli-manager] Daemon process error:", error);
    daemonProcess = null;
    cleanupPidFile();
  });
}

/** Kill the daemon process */
export function stopCLIDaemon(): void {
  shouldRun = false;
  if (daemonProcess && !daemonProcess.killed) {
    daemonProcess.kill("SIGTERM");
    console.log("[cli-manager] Daemon stopped");
    daemonProcess = null;
  }
  // Also try to kill by PID file in case process was orphaned
  killByPidFile();
  cleanupPidFile();
}

/** Check if CLI daemon is running */
export function isCLIDaemonRunning(): boolean {
  if (daemonProcess && !daemonProcess.killed) {
    return true;
  }
  // Fallback: check PID file
  return isProcessRunningByPidFile();
}

function cleanupPidFile(): void {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {
    // ignore
  }
}

function killByPidFile(): void {
  try {
    if (!fs.existsSync(PID_FILE)) return;
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    if (!isNaN(pid)) {
      process.kill(pid, "SIGTERM");
    }
  } catch {
    // Process may already be dead
  }
}

function isProcessRunningByPidFile(): boolean {
  try {
    if (!fs.existsSync(PID_FILE)) return false;
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    if (isNaN(pid)) return false;
    // signal 0 checks if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
