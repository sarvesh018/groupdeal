/**
 * Saves every table to backups/backup-<time>.json before you change the database.
 * Run: npm run db:backup   (uses DATABASE_URL from .env.local if set)
 * Uploaded files are included as data URLs, so the backup can be large.
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

/** postgres-js returns an array of rows; PGlite returns { rows }. */
const rowsOf = <T,>(r: unknown): T[] => (Array.isArray(r) ? (r as T[]) : ((r as { rows: T[] }).rows ?? []));

async function main() {
  const db = await getDb();
  const res = await db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
  );
  const tables = rowsOf<{ table_name: string }>(res).map((r) => r.table_name);
  const out: Record<string, unknown[]> = {};
  for (const t of tables) {
    const rows = await db.execute(sql.raw(`select * from "${t.replace(/"/g, "")}"`));
    out[t] = rowsOf<unknown>(rows);
  }
  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), tables: out }, null, 1));
  console.log(`Saved ${tables.length} tables to ${path.relative(process.cwd(), file)}`);
  for (const t of tables) console.log(`  ${t.padEnd(22)} ${out[t].length} rows`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
