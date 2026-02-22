export interface WorkerBindings {
  BRIDGE_SESSION_DO: DurableObjectNamespace;
  DATABASE_URL: string;
  WORKOS_CLIENT_ID?: string;
  WORKOS_API_KEY?: string;
  WORKOS_COOKIE_PASSWORD?: string;
  WORKOS_COOKIE_NAME?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  EXA_API_KEY?: string;
  SUPERMEMORY_API_KEY?: string;
  OPENCODE_API_KEY?: string;
  REDIS_URL?: string;
  GATEWAY_AUTH_SECRET?: string;
  CORS_ORIGIN?: string;
  NODE_ENV?: string;
}

export type AppEnv = {
  Bindings: WorkerBindings;
  Variables: {
    userId: string;
  };
};
