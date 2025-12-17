import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { connectToServer, getConnectionStatus } from "./server"
import { cors } from "hono/cors"
import { upgradeWebSocket } from "hono/bun"

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


    app.get("/daemon.status/stream", (c) => {
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

    serve({ fetch: app.fetch, port: 3456 });

}
