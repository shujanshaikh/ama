import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import type { WorkerBindings } from "@/env";

neonConfig.poolQueryViaFetch = true;

const cache = new Map<string, ReturnType<typeof drizzle<typeof schema>>>();

export function getDb(env: WorkerBindings) {
  const connection = env.DATABASE_URL;
  if (!connection) {
    throw new Error("DATABASE_URL is required");
  }

  let db = cache.get(connection);
  if (!db) {
    const sql = neon(connection);
    db = drizzle(sql, { schema });
    cache.set(connection, db);
  }

  return db;
}

export type DB = ReturnType<typeof getDb>;
