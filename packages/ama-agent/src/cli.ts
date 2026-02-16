import pc from "picocolors";
import { main } from "./server";
import { login, isAuthenticated, logout } from "./lib/auth-login";
import { startCodexOAuth, getCodexStatus, codexLogout as logoutCodex } from "./lib/codex-auth";
import { isCodeServerInstalled, installCodeServer, startCodeServer } from "./lib/code-server";
import { startDaemon, stopDaemon, isDaemonRunning, getDaemonPid } from "./lib/daemon";
import { projectRegistry } from "./lib/project-registry";
import path from "path";
import fs from "fs";
import readline from "readline";
import { spawn } from "child_process";

const VERSION = process.env.VERSION ?? "0.0.9";

const PROJECT_DIR = process.cwd();

const LOGO = `
   __ _ _ __ ___   __ _ 
  / _\` | '_ \` _ \\ / _\` |
 | (_| | | | | | | (_| |
  \\__,_|_| |_| |_|\\__,_|
`;

// Prompt user for input
function promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// Start server with code-server
async function startWithCodeServer() {
    if (!isCodeServerInstalled()) {
        console.log(pc.gray('setting up code-server...'));
        try {
            await installCodeServer();
        } catch (error: any) {
            console.error(pc.red(`failed to install code-server: ${error.message}`));
            console.log(pc.gray('continuing without code-server...'));
        }
    }

    if (isCodeServerInstalled()) {
        try {
            await startCodeServer(PROJECT_DIR);
        } catch (error: any) {
            console.error(pc.red(`failed to start code-server: ${error.message}`));
        }
    }

    main();
}

// Check for updates from npm registry
async function checkForUpdates(): Promise<{ current: string; latest: string; hasUpdate: boolean }> {
    try {
        const response = await fetch("https://registry.npmjs.org/amai/latest");
        const data = await response.json() as { version: string };
        const latestVersion = data.version;
        return {
            current: VERSION,
            latest: latestVersion,
            hasUpdate: latestVersion !== VERSION
        };
    } catch {
        return { current: VERSION, latest: VERSION, hasUpdate: false };
    }
}

// Run npm install globally
function runNpmInstall(): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn('bun', ['add', '-g', 'amai@latest'], {
            stdio: 'inherit',
            shell: true
        });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`bun add exited with code ${code}`));
        });
        child.on('error', reject);
    });
}

const args = process.argv.slice(2);

// Handle version
if (args[0] === "--version" || args[0] === "-v") {
    console.log(pc.gray(`amai ${VERSION}`));
    process.exit(0);
}

// Handle help
if (args[0] === "--help" || args[0] === "-h") {
    console.log(pc.cyan(LOGO));
    console.log(pc.gray(`  v${VERSION}`));
    console.log('');
    console.log(pc.cyan('  usage'));
    console.log(pc.gray('    amai [command]'));
    console.log('');
    console.log(pc.cyan('  commands'));
    console.log(pc.gray('    login           authenticate with amai'));
    console.log(pc.gray('    codex           connect ChatGPT subscription for Codex'));
    console.log(pc.gray('    codex status    check Codex auth status'));
    console.log(pc.gray('    codex logout    remove Codex credentials'));
    console.log(pc.gray('    logout          remove credentials'));
    console.log(pc.gray('    start           start background daemon'));
    console.log(pc.gray('    stop            stop background daemon'));
    console.log(pc.gray('    status          check daemon status'));
    console.log(pc.gray('    update          update to latest version'));
    console.log(pc.gray('    project add     register a project'));
    console.log(pc.gray('    project list    list projects'));
    console.log('');
    console.log(pc.cyan('  options'));
    console.log(pc.gray('    -h, --help      show help'));
    console.log(pc.gray('    -v, --version   show version'));
    console.log('');
    process.exit(0);
}

// Handle update command
if (args[0] === "update") {
    (async () => {
        console.log(pc.gray('checking for updates...'));
        const { current, latest, hasUpdate } = await checkForUpdates();

        if (!hasUpdate) {
            console.log(pc.cyan(`already on latest version (${current})`));
            process.exit(0);
        }

        console.log(pc.cyan(`update available: ${current} -> ${latest}`));
        const answer = await promptUser(pc.gray('install update? (Y/n): '));

        if (answer === '' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log(pc.gray('updating...'));
            try {
                await runNpmInstall();
                console.log(pc.cyan(`updated to ${latest}`));
            } catch (error: any) {
                console.error(pc.red(`update failed: ${error.message}`));
                process.exit(1);
            }
        }
        process.exit(0);
    })();
} else if (args[0] === "codex") {
    (async () => {
        try {
            const subCommand = args[1];
            if (subCommand === "status") {
                const status = await getCodexStatus();
                console.log(pc.gray(`codex auth: ${status.authenticated ? 'connected' : 'not connected'}`));
                process.exit(0);
            }

            if (subCommand === "logout") {
                await logoutCodex();
                console.log(pc.cyan("codex credentials removed"));
                process.exit(0);
            }

            console.log(pc.gray("starting codex auth..."));
            const { authUrl, waitForCallback } = await startCodexOAuth();
            console.log("");
            console.log(pc.cyan(`open: ${authUrl}`));
            console.log(pc.gray("complete authorization in your browser..."));
            const result = await waitForCallback();
            console.log(pc.cyan(`codex connected (account: ${result.accountId})`));
            process.exit(0);
        } catch (error: any) {
            console.error(pc.red(error.message || "codex auth failed"));
            process.exit(1);
        }
    })();
} else if (args[0] === "start") {
    // Handle start command
    (async () => {
        if (isDaemonRunning()) {
            console.log(pc.gray('amai is already running'));
            process.exit(0);
        }

        if (!isAuthenticated()) {
            console.log(pc.gray('not authenticated'));
            try {
                await login();
            } catch {
                console.error(pc.red('login failed'));
                process.exit(1);
            }
        }

        startDaemon();
        console.log(pc.cyan('amai started'));
        console.log(pc.gray(`check status: amai status`));
        process.exit(0);
    })();
} else if (args[0] === "stop") {
    // Handle stop command
    if (stopDaemon()) {
        console.log(pc.cyan('daemon stopped'));
    } else {
        console.log(pc.gray('daemon was not running'));
    }
    process.exit(0);
} else if (args[0] === "status") {
    // Handle status command
    const running = isDaemonRunning();
    const pid = getDaemonPid();
    console.log('');
    console.log(pc.cyan('  amai status'));
    console.log('');
    if (running && pid) {
        console.log(pc.gray(`  status   running`));
        console.log(pc.gray(`  pid      ${pid}`));
    } else {
        console.log(pc.gray(`  status   stopped`));
    }
    console.log(pc.gray(`  version  ${VERSION}`));
    console.log('');
    process.exit(0);
} else if (args[0] === "project") {
    // Handle project commands
    if (args[1] === "add") {
        const projectPath = args[2];
        if (!projectPath) {
            console.error(pc.red('please provide a project path'));
            console.log(pc.gray('usage: amai project add <path>'));
            process.exit(1);
        }
        const resolvedPath = path.resolve(projectPath);
        if (!fs.existsSync(resolvedPath)) {
            console.error(pc.red(`path does not exist: ${resolvedPath}`));
            process.exit(1);
        }
        if (!fs.statSync(resolvedPath).isDirectory()) {
            console.error(pc.red(`path is not a directory: ${resolvedPath}`));
            process.exit(1);
        }
        const projectId = path.basename(resolvedPath);
        projectRegistry.register(projectId, resolvedPath);
        console.log(pc.cyan(`project registered: ${projectId}`));
        console.log(pc.gray(`  ${resolvedPath}`));
        process.exit(0);
    } else if (args[1] === "list") {
        const projects = projectRegistry.list();
        console.log('');
        console.log(pc.cyan('  projects'));
        console.log('');
        if (projects.length === 0) {
            console.log(pc.gray('  no projects registered'));
        } else {
            projects.forEach(project => {
                const status = project.active ? pc.cyan('active') : pc.gray('inactive');
                console.log(pc.gray(`  ${project.id} [${status}]`));
                console.log(pc.gray(`    ${project.cwd}`));
            });
        }
        console.log('');
        process.exit(0);
    } else {
        console.error(pc.red(`unknown project command: ${args[1]}`));
        console.log(pc.gray('usage: amai project add <path> | amai project list'));
        process.exit(1);
    }
} else if (args[0] === "login" || args[0] === "--login") {
    (async () => {
        try {
            await login();
            console.log('');

            // After login, ask if they want to start
            if (isDaemonRunning()) {
                console.log(pc.gray('amai is already running'));
                process.exit(0);
            }

            const answer = await promptUser(pc.gray('start amai now? (Y/n): '));
            const shouldStart = answer === '' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';

            if (shouldStart) {
                const bgAnswer = await promptUser(pc.gray('run in background? (Y/n): '));
                const runInBackground = bgAnswer === '' || bgAnswer.toLowerCase() === 'y' || bgAnswer.toLowerCase() === 'yes';

                if (runInBackground) {
                    console.log(pc.gray('starting...'));
                    startDaemon();
                    console.log(pc.cyan('amai started'));
                    console.log(pc.gray('use "amai status" to check status'));
                } else {
                    console.log(pc.gray('starting in foreground...'));
                    startWithCodeServer();
                    return; // Don't exit, foreground mode runs
                }
            }
            process.exit(0);
        } catch {
            console.error(pc.red('login failed'));
            process.exit(1);
        }
    })();
} else if (args[0] === "logout" || args[0] === "--logout") {
    logout();
    console.log(pc.cyan('logged out'));
    process.exit(0);
} else {
    // No command provided - prompt for background mode
    (async () => {
        console.log(pc.cyan(LOGO));

        // Check authentication first
        if (!isAuthenticated()) {
            console.log(pc.gray('not authenticated'));
            try {
                await login();
                console.log('');
            } catch {
                console.error(pc.red('login failed'));
                process.exit(1);
            }
        }

        // Check if daemon is already running
        if (isDaemonRunning()) {
            console.log(pc.gray('amai is already running'));
            console.log(pc.gray('use "amai status" to check status'));
            process.exit(0);
        }

        // Prompt user for background mode
        const answer = await promptUser(pc.gray('run in background? (Y/n): '));
        const runInBackground = answer === '' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';

        if (runInBackground) {
            console.log(pc.gray('starting...'));
            startDaemon();
            console.log(pc.cyan('amai started'));
            console.log(pc.gray('use "amai status" to check status'));
            console.log(pc.gray('use "amai stop" to stop'));
            process.exit(0);
        } else {
            console.log(pc.gray('starting in foreground...'));
            startWithCodeServer();
        }
    })();
}