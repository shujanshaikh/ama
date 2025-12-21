import pc from "picocolors";
import { main } from "./server";
import { login, isAuthenticated, logout } from "./lib/auth-login";
import { isCodeServerInstalled, installCodeServer, startCodeServer } from "./lib/code-server";
import { startDaemon, stopDaemon, isDaemonRunning, getDaemonPid } from "./lib/daemon";
import { projectRegistry } from "./lib/project-registry";
import path from "path";
import fs from "fs";
import readline from "readline";

const VERSION = process.env.VERSION ?? "0.0.1";

// Capture the current working directory at startup before any async operations change it
const PROJECT_DIR = process.cwd();

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
    // First run detection - install code-server if not present
    if (!isCodeServerInstalled()) {
        console.log(pc.cyan('First run detected. Setting up code-server...'));
        try {
            await installCodeServer();
        } catch (error: any) {
            console.error(pc.red(`Failed to install code-server: ${error.message}`));
            console.log(pc.yellow('Continuing without code-server...'));
        }
    }

    // Start code-server if installed
    if (isCodeServerInstalled()) {
        try {
            await startCodeServer(PROJECT_DIR);
        } catch (error: any) {
            console.error(pc.red(`Failed to start code-server: ${error.message}`));
        }
    }

    // Start the main ama server
    main();
}

// Parse command line arguments
const args = process.argv.slice(2);

// Handle help
if (args[0] === "--help" || args[0] === "-h") {
    console.log(`
${pc.bold("ama cli")} ${pc.gray(VERSION)}

Usage: ama [command] [options]

Commands:
  login                 Authorize device
  logout                Log out and remove credentials
  start                  Start background daemon
  stop                  Stop background daemon
  status                Check daemon status
  project add <path>    Register a project directory
  project list          List registered projects
Options:
  --help, -h            Show this help message
  --logout, -l          Log out and remove credentials
Environment Variables:
  SERVER_URL            Server URL to connect to

Example:
  ama login
  ama start
  ama project add /path/to/project
  ama                  Start the agent (will prompt for background mode)
    `);
    process.exit(0);
}


// Handle start command (start daemon)
if (args[0] === "start") {
    if (isDaemonRunning()) {
        console.log(pc.yellow('Daemon is already running'));
        process.exit(0);
    }
    if (!isAuthenticated()) {
        console.log(pc.yellow('Not authenticated. Please log in first.'));
        login()
            .then(() => {
                console.log(pc.green('Starting daemon...'));
                startDaemon();
                console.log(pc.green('Daemon started successfully'));
                process.exit(0);
            })
            .catch(() => {
                console.error(pc.red('Login failed. Cannot start daemon.'));
                process.exit(1);
            });
    } else {
        startDaemon();
        console.log(pc.green('Daemon started successfully'));
        process.exit(0);
    }
}

// Handle stop command
if (args[0] === "stop") {
    if (stopDaemon()) {
        console.log(pc.green('Daemon stopped successfully'));
    } else {
        console.log(pc.yellow('Daemon was not running'));
    }
    process.exit(0);
}

// Handle status command
if (args[0] === "status") {
    const running = isDaemonRunning();
    const pid = getDaemonPid();
    if (running && pid) {
        console.log(pc.green(`Daemon is running (PID: ${pid})`));
    } else {
        console.log(pc.yellow('Daemon is not running'));
    }
    process.exit(0);
}

// Handle project commands
if (args[0] === "project") {
    if (args[1] === "add") {
        const projectPath = args[2];
        if (!projectPath) {
            console.error(pc.red('Please provide a project path'));
            console.log('Usage: ama project add <path>');
            process.exit(1);
        }
        const resolvedPath = path.resolve(projectPath);
        if (!fs.existsSync(resolvedPath)) {
            console.error(pc.red(`Path does not exist: ${resolvedPath}`));
            process.exit(1);
        }
        if (!fs.statSync(resolvedPath).isDirectory()) {
            console.error(pc.red(`Path is not a directory: ${resolvedPath}`));
            process.exit(1);
        }
        // Use path basename as project ID for CLI
        const projectId = path.basename(resolvedPath);
        projectRegistry.register(projectId, resolvedPath);
        console.log(pc.green(`Project registered: ${projectId} -> ${resolvedPath}`));
        process.exit(0);
    } else if (args[1] === "list") {
        const projects = projectRegistry.list();
        if (projects.length === 0) {
            console.log(pc.yellow('No projects registered'));
        } else {
            console.log(pc.bold('Registered projects:'));
            projects.forEach(project => {
                console.log(`  ${pc.cyan(project.id)}: ${project.cwd} ${project.active ? pc.green('(active)') : ''}`);
            });
        }
        process.exit(0);
    } else {
        console.error(pc.red(`Unknown project command: ${args[1]}`));
        console.log('Use "ama project add <path>" or "ama project list"');
        process.exit(1);
    }
}


if (args[0] === "login" || args[0] === "--login") {
    login()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else if (args[0] === "logout" || args[0] === "--logout") {
    logout()
    console.log(pc.green('Logged out successfully'))
    process.exit(0)
} else {
    // No command provided - prompt for background mode
    (async () => {
        // Check authentication first
        if (!isAuthenticated()) {
            console.log(pc.yellow('Not authenticated. Please log in first.'));
            try {
                await login();
            } catch {
                console.error(pc.red('Login failed. Cannot start server.'));
                process.exit(1);
            }
        }

        // Check if daemon is already running
        if (isDaemonRunning()) {
            console.log(pc.yellow('Daemon is already running. Use "ama status" to check its status.'));
            process.exit(0);
        }

        // Prompt user for background mode
        console.log('');
        console.log(pc.bold('How would you like to run ama?'));
        console.log(pc.gray('Background mode is highly recommended for better performance and stability.'));
        const answer = await promptUser(
            pc.cyan('Run in background? (Y/n): ')
        );

        const runInBackground = answer === '' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';

        if (runInBackground) {
            console.log(pc.green('Starting daemon in background...'));
            startDaemon();
            console.log(pc.green('Daemon started successfully!'));
            console.log(pc.gray('Use "ama status" to check daemon status.'));
            console.log(pc.gray('Use "ama stop" to stop the daemon.'));
            process.exit(0);
        } else {
            console.log(pc.yellow('Starting in foreground mode...'));
            startWithCodeServer();
        }
    })();
}