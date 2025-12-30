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
${pc.bold("amai cli")} ${pc.gray(VERSION)}

Usage: amai [command] [options]

Commands:
  login                 Authorize device
  logout                Log out and remove credentials
  start                 Start background daemon (background mode is highly recommended for better performance and stability)
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
  amai login
  amai start
  amai project add /path/to/project
  amai                  Start the agent (will prompt for background mode)
    `);
    process.exit(0);
}


// Handle start command (start daemon)
if (args[0] === "start") {
    if (isDaemonRunning()) {
        console.log(pc.yellow('ama is already running'));
        process.exit(0);
    }
    if (!isAuthenticated()) {
        console.log(pc.yellow('Not authenticated. Please log in first.'));
        login()
            .then(() => {
                console.log(pc.green('starting ama in background mode...'));
                startDaemon();
                console.log(pc.green('ama started in background mode successfully'));
                process.exit(0);
            })
            .catch(() => {
                console.error(pc.red('Login failed. Cannot start ama in background mode.'));
                process.exit(1);
            });
    } else {
        startDaemon();
        console.log(pc.green(pc.bold('amai started in background mode')));
        console.log(pc.gray(`Tip: You can check status any time with ${pc.bold('amai status')}`));
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
            console.log('Usage: amai project add <path>');
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
        console.log('Use "amai project add <path>" or "amai project list"');
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
            console.log(pc.yellow('Daemon is already running. Use "amai status" to check its status.'));
            process.exit(0);
        }

        // Prompt user for background mode
        console.log('');
        console.log(pc.bold('How would you like to run amai?'));
        console.log(pc.gray('Background mode is highly recommended for better performance and stability.'));
        const answer = await promptUser(
            pc.cyan('Run in background? (Y/n): ')
        );

        const runInBackground = answer === '' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';

        if (runInBackground) {
            console.log(pc.green('Starting daemon in background...'));
            startDaemon();
            console.log(pc.green('Daemon started successfully!'));
            console.log(pc.gray('Use "amai status" to check daemon status.'));
            console.log(pc.gray('Use "amai stop" to stop the daemon.'));
            process.exit(0);
        } else {
            console.log(pc.yellow('Starting in foreground mode...'));
            startWithCodeServer();
        }
    })();
}