import pc from "picocolors";
import { startAgent } from "./server";

const VERSION = process.env.VERSION ?? "0.0.1";

// Parse command line arguments
const args = process.argv.slice(2);
let sessionCode: string | undefined;
let convexUrl: string | undefined;
let workingDir: string | undefined;

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--code" || args[i] === "-c") {
        sessionCode = args[i + 1];
        i++;
    } else if (args[i] === "--url" || args[i] === "-u") {
        convexUrl = args[i + 1];
        i++;
    } else if (args[i] === "--dir" || args[i] === "-d") {
        workingDir = args[i + 1];
        i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
        console.log(`
${pc.bold("Ama Agent CLI")} ${pc.gray(VERSION)}

Usage: ama-agent [options]

Options:
  --code, -c <code>     Session code to link with web UI
  --url, -u <url>       Convex deployment URL (or set CONVEX_URL env var)
  --dir, -d <path>      Working directory (default: current directory)
  --help, -h            Show this help message

Environment Variables:
  CONVEX_URL            Convex deployment URL (required)
  SESSION_CODE         Session code to link with web UI
  WORKING_DIRECTORY     Working directory for file operations

Example:
  ama-agent --code 123456 --url https://your-deployment.convex.cloud
    `);
        process.exit(0);
    }
}

const finalConvexUrl = convexUrl || process.env.CONVEX_URL;
const finalSessionCode = sessionCode || process.env.SESSION_CODE;
const finalWorkingDir = workingDir || process.env.WORKING_DIRECTORY;

if (!finalConvexUrl) {
    console.error(
        pc.red("Error: Convex URL is required.")
    );
    console.error(
        pc.yellow("Set it via --url flag or CONVEX_URL environment variable.")
    );
    console.error(
        pc.gray("Run 'ama-agent --help' for usage information.")
    );
    process.exit(1);
}

startAgent(finalConvexUrl, finalSessionCode, finalWorkingDir).catch(
    (error) => {
        console.error(pc.red("Failed to start agent:"), error);
        process.exit(1);
    }
);
