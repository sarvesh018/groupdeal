import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Two modes, chosen by the DATABASE_URL environment variable:
 *  - set    -> a real PostgreSQL server (Supabase, Neon, RDS...). Use this to launch.
 *  - unset  -> PGlite, a PostgreSQL that runs inside this app and stores its
 *              data in ./.data. Zero setup; meant for trying the app locally.
 */
async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    const client = postgres(url, {
      ssl: local ? false : "require",
      prepare: false, // required by Supabase's connection pooler
      max: 5,
    });
    return drizzle(client, { schema }) as unknown as DB;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  return drizzle(client, { schema }) as unknown as DB;
}

const g = globalThis as unknown as { __groupdealDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  return (g.__groupdealDb ??= create());
}

export { schema };
