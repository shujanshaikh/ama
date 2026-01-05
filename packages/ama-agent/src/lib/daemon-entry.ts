import { main } from "../server";
import { isCodeServerInstalled, installCodeServer, startCodeServer } from "./code-server";
import pc from "picocolors";
import os from "os";

if (process.env.AMA_DAEMON === '1') {
    (async () => {
        try {
            if (!isCodeServerInstalled()) {
                console.log(pc.gray('setting up code-server...'));
                try {
                    await installCodeServer();
                } catch (error: any) {
                    console.error(pc.red(`code-server install failed: ${error.message}`));
                    console.log(pc.gray('continuing without code-server...'));
                }
            }

            if (isCodeServerInstalled()) {
                try {
                    const projectDir = process.cwd() || os.homedir();
                    await startCodeServer(projectDir);
                } catch (error: any) {
                    console.error(pc.red(`code-server start failed: ${error.message}`));
                }
            }

            await main();
        } catch (error) {
            console.error(pc.red('daemon error'));
            process.exit(1);
        }
    })();
} else {
    console.error(pc.red('this script should only be run as a daemon'));
    process.exit(1);
}

