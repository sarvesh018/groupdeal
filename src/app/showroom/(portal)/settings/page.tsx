import { asc, eq } from "drizzle-orm";
import { requireShowroom } from "@/lib/session";
import { getDb, schema } from "@/db";
import { shortDate } from "@/lib/format";
import { ShowroomSettingsForm } from "@/components/showroom-forms";

export const metadata = { title: "Showroom settings" };

export default async function SettingsPage() {
  const ctx = await requireShowroom({ owner: true, approved: false });
  const db = await getDb();
  const docs = await db
    .select({ id: schema.showroomDocuments.id, fileName: schema.showroomDocuments.fileName, createdAt: schema.showroomDocuments.createdAt })
    .from(schema.showroomDocuments)
    .where(eq(schema.showroomDocuments.showroomId, ctx.showroom.id))
    .orderBy(asc(schema.showroomDocuments.id));
  const s = ctx.showroom;
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section>
        <h2 className="text-2xl">Showroom details</h2>
        <p className="mt-2 text-dim">Buyers see the name, area and phone. The GSTIN goes on your invoices.</p>
        <div className="mt-6">
          <ShowroomSettingsForm value={{ phone: s.phone, locality: s.locality, address: s.address, gstNumber: s.gstNumber, dealerCode: s.dealerCode }} />
        </div>
      </section>
      <section>
        <h2 className="text-2xl">Documents</h2>
        {docs.length === 0 ? (
          <p className="mt-4 text-dim">None uploaded.</p>
        ) : (
          <ul className="rule mt-4">
            {docs.map((d) => (
              <li key={d.id} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
                <span className="truncate">{d.fileName}</span>
                <span className="shrink-0 text-dim">{shortDate(d.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-sm text-dim">The showroom name and brand can be changed only by GroupDeal, to protect buyers.</p>
      </section>
    </div>
  );
}
