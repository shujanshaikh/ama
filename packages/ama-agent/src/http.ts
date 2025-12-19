import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { connectToServer, getConnectionStatus } from "./server"
import { cors } from "hono/cors"
import * as fs from "fs";
import * as path from "path";
import { execSync } from "node:child_process";  
import { upgradeWebSocket } from "hono/bun"
import { getContext } from "./lib/get-files";

let wsConnection: ReturnType<typeof connectToServer> | null = null

export const startHttpServer = (connection?: ReturnType<typeof connectToServer>) => {
    if (connection) {
        wsConnection = connection
    }

    const app = new Hono()
    app.use(cors())
    // app.get(
    //     '/cli-status',
    //     upgradeWebSocket((c) => {
    //       return {

    //         onMessage(_evt) {
    //           const message = JSON.parse(_evt.data.toString())
    //           if(message.type === 'cli-status') {
    //             return c.json({ status: "connected" })
    //           }

    //           return c.json({ status: "disconnected" })
    //         },
    //         onClose: () => {

    //         },
    //       }
    //     })
    //   )


    app.post("/daemon/status/stream", (c) => {
      return c.body(new ReadableStream({
        start(controller) {
          const sendStatus = () => {
            const status = wsConnection ? getConnectionStatus(wsConnection) : 'closed';
            controller.enqueue(`data: ${JSON.stringify({ connected: status === 'open' })}\n\n`);
          };

          sendStatus();
          wsConnection?.addEventListener('close', () => {
            controller.enqueue(`data: ${JSON.stringify({ connected: false })}\n\n`);
          });
        }
      }), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    });

    app.get("context",async (c) => {
      const context = getContext(process.cwd());
      return c.body(JSON.stringify(context));
    });
    

    app.get("/cwd", (c) => {
      const cwd = process.cwd();
      let projectName = path.basename(cwd);
      let isGitRepo = false;

      try {
        if (fs.existsSync(path.join(cwd, ".git")) && fs.lstatSync(path.join(cwd, ".git")).isDirectory()) {
          isGitRepo = true;
        } else {
          try {
            execSync("git rev-parse --is-inside-work-tree", { cwd, stdio: "ignore" });
            isGitRepo = true;
          } catch {
            isGitRepo = false;
          }
        }
      } catch {
        isGitRepo = false;
      }   

      return c.body(
        JSON.stringify({
          cwd,
          projectName,
          isGitRepo,
        })
      );
    });

    serve({ fetch: app.fetch, port: 3456 });

}
