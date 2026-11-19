import path from "node:path";
import fs from "node:fs";

const migrationsFolder = path.join(process.cwd(), "drizzle");

export async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    const client = postgres(url, { ssl: local ? false : "require", prepare: false, max: 1, onnotice: () => {} });
    await migrate(drizzle(client), { migrationsFolder });
    await client.end();
    console.log("Tables are up to date (PostgreSQL).");
  } else {
    fs.mkdirSync(path.join(process.cwd(), ".data"), { recursive: true });
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite(path.join(process.cwd(), ".data", "pglite"));
    await migrate(drizzle(client), { migrationsFolder });
    await client.close();
    console.log("Tables are up to date (local database in ./.data).");
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
