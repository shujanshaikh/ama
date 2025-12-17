import pc from "picocolors";
import { main } from "./server";
import { login, isAuthenticated, logout } from "./lib/auth-login";

const VERSION = process.env.VERSION ?? "0.0.1";

// Parse command line arguments
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
        console.log(`
${pc.bold("ama cli")} ${pc.gray(VERSION)}

Usage: ama [command] [options]

Commands:
  login                 Authorize device
  logout                Log out and remove credentials
Options:
  --help, -h            Show this help message
  --logout, -l          Log out and remove credentials
Environment Variables:
  SERVER_URL            Server URL to connect to

Example:
  ama login
  ama                  Start the agent (will prompt for login if not authenticated)
    `);
        process.exit(0);
    }
}


if (args[0] === "login" || args[0] === "--login") {
    login()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else {
    if (!isAuthenticated()) {
        console.log(pc.yellow('Not authenticated. Please log in first.'));
        login()
            .then(() => {
                console.log(pc.green('Starting server...'));
                main();
            })
            .catch(() => {
                console.error(pc.red('Login failed. Cannot start server.'));
                process.exit(1);
            });
    } else {
        // Already authenticated, start the server
        main();
    }
}

if (args[0] === "logout" || args[0] === "--logout") {
    logout()
    console.log(pc.green('Logged out successfully'))
    process.exit(0)
}