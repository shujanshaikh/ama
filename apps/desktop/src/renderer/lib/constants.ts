const isDev = window.location.hostname === "localhost";

export const API_URL = isDev
  ? "http://localhost:3000"
  : "https://bridge.ama.shujan.xyz";

export const WEB_URL = isDev
  ? "http://localhost:3001"
  : "https://ama.shujan.xyz";

/** tRPC lives on the web app, not the API server */
export const TRPC_URL = WEB_URL;
