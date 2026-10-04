import { Pool } from "pg";

import { databaseUrl } from "./env";

/**
 * Shared PostgreSQL pool for application data access.
 *
 * Better Auth keeps its own pool inside `lib/auth.ts`; this one is for the
 * course/learner repositories. In development the pool is cached on
 * `globalThis` so Next.js hot reloads do not open a new pool on every edit.
 */
const globalForDb = globalThis as unknown as { edvancePool?: Pool };

export const pool =
  globalForDb.edvancePool ??
  new Pool({
    // Required: throws a readable error at import if neither DATABASE_URL nor
    // the POSTGRES_URL that Vercel's Postgres integration injects is present.
    connectionString: databaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.edvancePool = pool;
}
