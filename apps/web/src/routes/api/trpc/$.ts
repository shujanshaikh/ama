import { createFileRoute } from "@tanstack/react-router";
import { createContext } from "../../../server/context";
import { appRouter } from "../../../server/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const CORS_ORIGINS = ["http://localhost:3001", "http://localhost:5173"];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function handler({ request }: { request: Request }) {
  return fetchRequestHandler({
    req: request,
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
    responseMeta() {
      return { headers: getCorsHeaders(request) };
    },
  });
}

function optionsHandler({ request }: { request: Request }) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      OPTIONS: optionsHandler,
    },
  },
});
