import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { connectToServer, getConnectionStatus } from "./server"
import { cors } from "hono/cors"
import * as fs from "fs";
import * as path from "path";
import { execSync } from "node:child_process";  
import { upgradeWebSocket } from "hono/bun"
import { getContext } from "./lib/get-files";
import { scanIdeProjects } from "./lib/ide-projects";

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
      const status = wsConnection ? getConnectionStatus(wsConnection) : 'closed';
      return c.json({ connected: status === 'open' });
    });

    app.get("context",async (c) => {
      const context = getContext(process.cwd());
      return c.body(JSON.stringify(context));
    });
    
    app.get("/ide-projects", async (c) => {
      try {
        const projects = await scanIdeProjects();
        if (!projects) {
          return c.json({ error: "No projects found" }, 500);
        }
        return c.json({ projects });
      } catch (error) {
        return c.json({ error: "Failed to scan IDE projects" }, 500);
      }
    });


    serve({ fetch: app.fetch, port: 3456 });

}
