import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { WorkerBindings } from "@/env";

const cache = new Map<string, Ratelimit>();

export function getRatelimit(env: WorkerBindings): Ratelimit {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }

  const key = `${url}:${token.slice(0, 8)}`;
  let ratelimit = cache.get(key);
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url,
        token,
      }),
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });
    cache.set(key, ratelimit);
  }

  return ratelimit;
}
