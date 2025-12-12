import pc from "picocolors";
import { startAgent } from "./server";

const VERSION = process.env.VERSION ?? "0.0.1";

// Parse command line arguments
const args = process.argv.slice(2);
let sessionCode: string | undefined;
let workingDir: string | undefined;

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--code" || args[i] === "-c") {
        sessionCode = args[i + 1];
        i++;
    } else if (args[i] === "--dir" || args[i] === "-d") {
        workingDir = args[i + 1];
        i++;
    }else if (args[i] === "--help" || args[i] === "-h") {
        console.log(`
${pc.bold("Ama Agent CLI")} ${pc.gray(VERSION)}

Usage: ama-agent [options]

Options:
  --code, -c <code>     Session code to link with web UI
  --dir, -d <path>      Working directory (default: current directory)
  --help, -h            Show this help message

Environment Variables:
  SESSION_CODE         Session code to link with web UI
  WORKING_DIRECTORY     Working directory for file operations

Example:
  ama-agent --code 123456
    `);
        process.exit(0);
    }
}

const finalSessionCode = sessionCode || process.env.SESSION_CODE;
const finalWorkingDir = workingDir || process.env.WORKING_DIRECTORY;

startAgent(finalSessionCode, finalWorkingDir).catch(
    (error) => {
        console.error(pc.red("Failed to start agent:"), error);
        process.exit(1);
    }
);
