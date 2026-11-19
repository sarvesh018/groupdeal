/**
 * The app was renamed from Toli to GroupDeal. This changes the demo emails in an
 * existing database from @toli.demo to @groupdeal.demo. Passwords stay the same.
 * Run: npm run db:rename-demo
 */
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

/** postgres-js returns an array of rows; PGlite returns { rows }. */
const rowsOf = <T,>(r: unknown): T[] => (Array.isArray(r) ? (r as T[]) : ((r as { rows: T[] }).rows ?? []));

async function main() {
  const db = await getDb();
  const res = await db.execute(
    sql`update users set email = replace(email, '@toli.demo', '@groupdeal.demo') where email like '%@toli.demo' and not exists (select 1 from users u2 where u2.email = replace(users.email, '@toli.demo', '@groupdeal.demo')) returning email`,
  );
  const rows = rowsOf<{ email: string }>(res);
  console.log(rows.length ? `Renamed: ${rows.map((r) => r.email).join(", ")}` : "No @toli.demo accounts found. Nothing changed.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
