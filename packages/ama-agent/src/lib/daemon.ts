import { spawn } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { AMA_DIR } from "../constant";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DAEMON_PID_FILE = path.join(AMA_DIR, 'daemon.pid');
const DAEMON_LOG_FILE = path.join(AMA_DIR, 'daemon.log');

export function isDaemonRunning(): boolean {
    if (!fs.existsSync(DAEMON_PID_FILE)) {
        return false;
    }
    try {
        const pid = Number(fs.readFileSync(DAEMON_PID_FILE, 'utf8'));
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}


export function stopDaemon(): boolean {
    if (!fs.existsSync(DAEMON_PID_FILE)) {
        return false;
    }
    try {
        const pid = Number(fs.readFileSync(DAEMON_PID_FILE, 'utf8'));
        process.kill(pid, 'SIGTERM');
        fs.unlinkSync(DAEMON_PID_FILE);
        return true;
    } catch (error) {
        return false;
    }
}

export function startDaemon(): void {
    if (!fs.existsSync(AMA_DIR)) {
        fs.mkdirSync(AMA_DIR, { recursive: true });
    }

    if (isDaemonRunning()) {
        stopDaemon();
    }

    const daemonScript = path.join(__dirname, 'lib', 'daemon-entry.js');
    if (!fs.existsSync(daemonScript)) {
        throw new Error(`Daemon entry script not found at: ${daemonScript}. Please rebuild the project.`);
    }
    
    const logFd = fs.openSync(DAEMON_LOG_FILE, 'a');

    const daemon = spawn(process.execPath, [daemonScript], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env, AMA_DAEMON: '1' },
        cwd: process.cwd(),
    });

    daemon.unref();

    fs.writeFileSync(DAEMON_PID_FILE, String(daemon.pid));

    fs.closeSync(logFd);
}

export function getDaemonPid(): number | null {
    if (!fs.existsSync(DAEMON_PID_FILE)) {
        return null;
    }
    try {
        return Number(fs.readFileSync(DAEMON_PID_FILE, 'utf8'));
    } catch {
        return null;
    }
}