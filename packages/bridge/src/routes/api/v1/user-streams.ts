import { Hono } from "hono";

// WebSocket handling moved to /src/worker.ts and Durable Object session bridge.
export const userStreams = new Hono();
