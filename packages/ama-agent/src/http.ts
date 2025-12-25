import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { connectToServer, getConnectionStatus, statusEmitter } from "./server"
import { cors } from "hono/cors" 
import { getContext } from "./lib/get-files";
import { scanIdeProjects } from "./lib/ide-projects";
import { projectRegistry } from "./lib/project-registry";
import { checkpointStore } from "./lib/checkpoint";
import path from "path";
import { writeFile, readFile } from "fs/promises";

let wsConnection: ReturnType<typeof connectToServer> | null = null

export const startHttpServer = (connection?: ReturnType<typeof connectToServer>) => {
    if (connection) {
        wsConnection = connection
    }

    const app = new Hono()
    app.use(cors())
    // POST endpoint for initial status check
    app.post("/daemon/status", (c) => {
      const status = wsConnection ? getConnectionStatus(wsConnection) : 'closed';
      return c.json({ connected: status === 'open' });
    });

    // SSE endpoint for persistent status updates
    app.get("/daemon/status/stream", (c) => {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        start(controller) {
          // Send initial status immediately
          const initialStatus = wsConnection ? getConnectionStatus(wsConnection) : 'closed';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ connected: initialStatus === 'open' })}\n\n`));
          
          // Listen for status changes from the event emitter
          const statusHandler = (data: { connected: boolean }) => {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            } catch {
              // Stream closed, ignore
            }
          };
          
          statusEmitter.on('status', statusHandler);
          
          // Send heartbeat every 15 seconds to keep connection alive
          const heartbeatInterval = setInterval(() => {
            try {
              const currentStatus = wsConnection ? getConnectionStatus(wsConnection) : 'closed';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ connected: currentStatus === 'open' })}\n\n`));
            } catch {
              // Stream closed, ignore
            }
          }, 15000);
          
          // Cleanup on client disconnect
          c.req.raw.signal.addEventListener('abort', () => {
            statusEmitter.off('status', statusHandler);
            clearInterval(heartbeatInterval);
          });
        }
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
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

    // Enhanced revert endpoint with hash-based conflict detection
    app.post("/revert", async (c) => {
      try {
        const { 
          filePath, 
          oldString, 
          newString, 
          projectCwd,
          checkpointId,
          expectedAfterHash,
          force = false 
        } = await c.req.json();
        
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

        // Hash-based conflict detection using checkpoint
        if (checkpointId) {
          const verification = checkpointStore.verifyFileState(checkpointId, currentContent);
          
          if (!verification.safe && !force) {
            // Return conflict info for frontend to handle
            return c.json({ 
              success: false,
              conflict: true,
              error: verification.reason,
              currentHash: verification.currentHash,
              expectedHash: verification.checkpoint?.afterHash,
              checkpointId,
            }, 409); // 409 Conflict
          }

          // If checkpoint exists and is safe (or force=true), use checkpoint data for revert
          if (verification.checkpoint) {
            try {
              await writeFile(resolved, verification.checkpoint.beforeContent, 'utf-8');
              // Clean up checkpoint after successful revert
              checkpointStore.removeCheckpoint(checkpointId);
              return c.json({ success: true, usedCheckpoint: true });
            } catch (writeError: any) {
              return c.json({ error: `Failed to write file: ${writeError.message}` }, 500);
            }
          }
        }

        // Hash-based conflict detection using expectedAfterHash (fallback without checkpoint)
        if (expectedAfterHash && !force) {
          const currentHash = checkpointStore.computeHash(currentContent);
          
          if (currentHash !== expectedAfterHash) {
            return c.json({
              success: false,
              conflict: true,
              error: "File was modified after this edit. Current content does not match expected state.",
              currentHash,
              expectedHash: expectedAfterHash,
            }, 409);
          }
        }
        
        // Legacy fallback: string-based revert
        let finalContent: string;
        
        if (newString && newString !== oldString) {
          if (!currentContent.includes(newString)) {
            return c.json({ 
              success: false,
              conflict: true,
              error: "Cannot revert: the new content is not found in the current file. The file may have been modified." 
            }, 409);
          }
          
          const occurrences = currentContent.split(newString).length - 1;
          if (occurrences > 1) {
            return c.json({ 
              success: false,
              conflict: true,
              error: "Cannot revert: the new content appears multiple times in the file" 
            }, 409);
          }
          
          finalContent = currentContent.replace(newString, oldString);
        } else {
          finalContent = oldString;
        }
        
        await writeFile(resolved, finalContent, 'utf-8');
        
        // Clean up checkpoint if it exists
        if (checkpointId) {
          checkpointStore.removeCheckpoint(checkpointId);
        }
        
        return c.json({ success: true });
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    });

    // Force revert endpoint - bypasses conflict detection
    app.post("/revert/force", async (c) => {
      try {
        const { filePath, checkpointId, projectCwd } = await c.req.json();
        
        if (!checkpointId) {
          return c.json({ error: "checkpointId is required for force revert" }, 400);
        }
        
        const checkpoint = checkpointStore.getCheckpoint(checkpointId);
        if (!checkpoint) {
          return c.json({ error: "Checkpoint not found" }, 404);
        }
        
        let resolved: string;
        if (projectCwd) {
          resolved = path.isAbsolute(filePath || checkpoint.filePath) 
            ? (filePath || checkpoint.filePath)
            : path.resolve(projectCwd, filePath || checkpoint.filePath);
          
          const normalizedResolved = path.normalize(resolved);
          const normalizedCwd = path.normalize(projectCwd);
          if (!normalizedResolved.startsWith(normalizedCwd)) {
            return c.json({ error: "Path is outside project directory" }, 403);
          }
        } else {
          resolved = checkpoint.filePath;
        }
        
        try {
          await writeFile(resolved, checkpoint.beforeContent, 'utf-8');
          checkpointStore.removeCheckpoint(checkpointId);
          return c.json({ success: true, forced: true });
        } catch (writeError: any) {
          return c.json({ error: `Failed to write file: ${writeError.message}` }, 500);
        }
      } catch (error: any) {
        return c.json({ error: error.message }, 500);
      }
    });

    // Get checkpoint info endpoint
    app.get("/checkpoints/:checkpointId", (c) => {
      const checkpointId = c.req.param("checkpointId");
      const checkpoint = checkpointStore.getCheckpoint(checkpointId);
      
      if (!checkpoint) {
        return c.json({ error: "Checkpoint not found" }, 404);
      }
      
      // Don't expose full content, just metadata
      return c.json({
        id: checkpoint.id,
        filePath: checkpoint.filePath,
        beforeHash: checkpoint.beforeHash,
        afterHash: checkpoint.afterHash,
        timestamp: checkpoint.timestamp,
      });
    });

    // List all checkpoints (for debugging/admin)
    app.get("/checkpoints", (c) => {
      const stats = checkpointStore.getStats();
      const checkpoints = checkpointStore.getAllCheckpoints().map(cp => ({
        id: cp.id,
        filePath: cp.filePath,
        beforeHash: cp.beforeHash,
        afterHash: cp.afterHash,
        timestamp: cp.timestamp,
      }));
      
      return c.json({ stats, checkpoints });
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
