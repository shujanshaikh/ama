import { main } from "../server";
import { isCodeServerInstalled, installCodeServer, startCodeServer } from "./code-server";
import pc from "picocolors";
import os from "os";

if (process.env.AMA_DAEMON === '1') {
    (async () => {
        try {
            if (!isCodeServerInstalled()) {
                console.log(pc.cyan('First run detected. Setting up code-server...'));
                try {
                    await installCodeServer();
                } catch (error: any) {
                    console.error(pc.red(`Failed to install code-server: ${error.message}`));
                    console.log(pc.yellow('Continuing without code-server...'));
                }
            }

            if (isCodeServerInstalled()) {
                try {
                    const projectDir = process.cwd() || os.homedir();
                    await startCodeServer(projectDir);
                } catch (error: any) {
                    console.error(pc.red(`Failed to start code-server: ${error.message}`));
                }
            }

            await main();
        } catch (error) {
            console.error('Daemon error:', error);
            process.exit(1);
        }
    })();
} else {
    console.error('This script should only be run as a daemon');
    process.exit(1);
}

