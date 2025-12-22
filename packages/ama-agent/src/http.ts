import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { connectToServer, getConnectionStatus } from "./server"
import { cors } from "hono/cors" 
import { getContext } from "./lib/get-files";
import { scanIdeProjects } from "./lib/ide-projects";
import { projectRegistry } from "./lib/project-registry";
import path from "path";
import { writeFile, readFile } from "fs/promises";

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

    app.post("/revert", async (c) => {
      try {
        const { filePath, oldString, newString, projectCwd } = await c.req.json();
        if (!filePath || oldString === undefined) {
          return c.json({ error: "filePath and oldString required" }, 400);
        }
        
        let resolved: string;
        if (projectCwd) {
          resolved = path.isAbsolute(filePath) 
            ? filePath 
            : path.resolve(projectCwd, filePath);
          
          const normalizedResolved = path.normalize(resolved);
          const normalizedCwd = path.normalize(projectCwd);
          if (!normalizedResolved.startsWith(normalizedCwd)) {
            return c.json({ error: "Path is outside project directory" }, 403);
          }
        } else {
          resolved = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(process.cwd(), filePath);
        }
        
        let currentContent: string;
        try {
          currentContent = await readFile(resolved, 'utf-8');
        } catch (error: any) {
          if (error?.code === 'ENOENT') {
            return c.json({ error: `File not found: ${filePath}` }, 404);
          }
          return c.json({ error: `Failed to read file: ${error.message}` }, 500);
        }
        
        let finalContent: string;
        
        if (newString && newString !== oldString) {
          if (!currentContent.includes(newString)) {
            return c.json({ error: "Cannot revert: the new content is not found in the current file. The file may have been modified." }, 400);
          }
          
          const occurrences = currentContent.split(newString).length - 1;
          if (occurrences > 1) {
            return c.json({ error: "Cannot revert: the new content appears multiple times in the file" }, 400);
          }
          
          finalContent = currentContent.replace(newString, oldString);
        } else {
          finalContent = oldString;
        }
        
        await writeFile(resolved, finalContent, 'utf-8');
        return c.json({ success: true });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
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
