import pc from "picocolors";
import { main } from "./server";

const VERSION = process.env.VERSION ?? "0.0.1";

// Parse command line arguments
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
        console.log(`
${pc.bold("Ama Agent CLI")} ${pc.gray(VERSION)}

Usage: ama  [options]

Options:
  --help, -h            Show this help message

Environment Variables:
  SERVER_URL         Server URL to connect to

Example:
  ama --server-url ws://localhost:3000
    `);
        process.exit(0);
    }
}

main();