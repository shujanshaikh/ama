import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

export const startHttpServer = () => {
  const app = new Hono();
  app.use(cors());

  app.get("/", (c) => {
    return c.text("Hello World");
  });

  serve({ fetch: app.fetch, port: 3456 });
};
