import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

export const startHttpServer = () => {
  const app = new Hono();
  app.use(cors());

  app.get("/", (c) => {
    return c.text("Hello World");
  });

  const server = serve({ fetch: app.fetch, port: 3456 });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[http] Port 3456 is already in use, skipping HTTP server`);
    } else {
      throw err;
    }
  });
};
