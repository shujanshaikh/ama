import { Hono } from "hono";
import { pendingToolCalls } from "./lib/executeTool"
import { cors } from "hono/cors";
import { agentRouter } from "./routes/api/v1/agent";
import { upgradeWebSocket, websocket } from 'hono/bun'
import type { WSContext } from "hono/ws";

const app = new Hono();
app.use(cors())

app.route("/api/v1", agentRouter);


export const agentStreams = new Map<string, WSContext>();

app.get("/", (c) => c.text("Hello ama"));

app.get(
  '/agent-streams',
  upgradeWebSocket((_c) => {
    return {
      onOpen: (_evt, ws) => {
        agentStreams.set("", ws)
        console.log("CLI agent connected")
      },
      onMessage(_evt) {
        const message = JSON.parse(_evt.data.toString())
      
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
      },
      onClose: () => {
        agentStreams.delete("")
        console.log("CLI agent disconnected")
      },
    }
  })
)

export default {
  fetch: app.fetch,
  websocket,
}

  



