import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { connectToServer, getConnectionStatus } from "./server"
import { cors } from "hono/cors" 
import { getContext } from "./lib/get-files";
import { scanIdeProjects } from "./lib/ide-projects";
import { projectRegistry } from "./lib/project-registry";

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

    // Project registration endpoints
    app.post("/projects/register", async (c) => {
      try {
        const { projectId, cwd, name } = await c.req.json();
        if (!projectId || !cwd) {
          return c.json({ error: "projectId and cwd are required" }, 400);
        }
        projectRegistry.register(projectId, cwd, name);
        return c.json({ success: true, projectId, cwd });
      } catch (error: any) {
        return c.json({ error: error.message || "Failed to register project" }, 500);
      }
    });

    app.get("/projects", (c) => {
      const projects = projectRegistry.list();
      return c.json({ projects });
    });

    app.get("/projects/:projectId", (c) => {
      const projectId = c.req.param("projectId");
      const project = projectRegistry.getProject(projectId);
      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }
      return c.json({ project });
    });

    app.delete("/projects/:projectId", (c) => {
      const projectId = c.req.param("projectId");
      projectRegistry.unregister(projectId);
      return c.json({ success: true });
    });


    serve({ fetch: app.fetch, port: 3456 });

}
