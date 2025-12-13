import { Hono } from "hono";
import { WebSocketServer, type WebSocket } from "ws";
import { createAdaptorServer } from "@hono/node-server";
import type { Server } from "http";
import { pendingToolCalls } from "./lib/executeTool"
import { cors } from "hono/cors";
import { agentRouter } from "./routes/api/v1/agent";

const app = new Hono();
app.use(cors())

app.route("/api/v1", agentRouter);

export const rpcConnections = new Map<string, WebSocket>();

app.get("/", (c) => c.text("Hello ama"));

const server = createAdaptorServer({ fetch: app.fetch }) as Server;
const wss = new WebSocketServer({ server, path: '/rpc' });


wss.on('connection', (ws, _req) => {
    rpcConnections.set("", ws)
    console.log("CLI agent connected")
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString())
      
      if (message.type === 'tool_result') {
        const callId = message.callId || message.id
        const pending = pendingToolCalls.get(callId)
        if (pending) {
          if (message.error) {
            pending.reject(new Error(message.error))
          } else {
            pending.resolve(message.result)
          }
          pendingToolCalls.delete(callId)
        }
      }
    })
    
    ws.on('close', () => {
      rpcConnections.delete("")
      console.log("CLI agent disconnected")
    })
  })
  server.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
  })
  



