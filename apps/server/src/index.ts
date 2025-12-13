import { Hono } from "hono";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText , smoothStream } from "ai"
import { WebSocketServer, type WebSocket } from "ws";
import { createAdaptorServer } from "@hono/node-server";
import type { Server } from "http";
import { pendingToolCalls } from "./lib/executeTool"
import { tool } from "./tools/tool";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { cors } from "hono/cors";

const app = new Hono();
app.use(cors())


export const rpcConnections = new Map<string, WebSocket>();

app.get("/", (c) => c.text("Hello World"));

app.post("/chat", async (c) => {
	const { messages } = await c.req.json();

	
	return createUIMessageStreamResponse({
		stream: createUIMessageStream({
		  execute: ({ writer: dataStream }) => {
			const result = streamText({
			  messages: convertToModelMessages(messages),
			  model: "anthropic/claude-haiku-4.5",
			  system: SYSTEM_PROMPT,
			  temperature: 0.7,
			  stopWhen: stepCountIs(20),
			  experimental_transform: smoothStream({
				delayInMs: 10,
				chunking: "word",
			  }),
			  //maxRetries: 3,
			  tools: tool,

			});
			result.consumeStream();
			dataStream.merge(
			  result.toUIMessageStream({
				sendReasoning: true,
			  }),
			);
		  },
		  onFinish: async ({  }) => {
			  console.log("Finished");
			},
		}),
	});
});



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
  



