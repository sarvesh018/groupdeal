import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { adminShowrooms, listCities } from "@/lib/queries";
import { AutoForm } from "@/components/auto-form";

const STATUS: Record<string, string> = { pending: "To verify", approved: "Verified", suspended: "Paused" };
const TONE: Record<string, string> = { pending: "text-accent", approved: "text-mint", suspended: "text-rose" };

export default async function AdminShowrooms({ searchParams }: { searchParams: Promise<{ city?: string; brand?: string; status?: string }> }) {
  await requireAdmin(); // pages render alongside the layout, so each one checks for itself
  const { city = "", brand = "", status = "" } = await searchParams;
  const [all, cities] = await Promise.all([adminShowrooms(), listCities()]);
  const cityId = cities.find((c) => c.slug === city)?.id;
  const brands = [...new Set(all.map((s) => s.brand))].sort();
  const rows = all
    .filter((s) => (!cityId || s.cityId === cityId) && (!brand || s.brand === brand) && (!status || s.status === status))
    .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  const pending = all.filter((s) => s.status === "pending").length;
  return (
    <div>
      {pending > 0 && !status && (
        <Link href="/admin/showrooms?status=pending" className="mb-6 block rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent hover:bg-accent/15">
          {pending} {pending === 1 ? "showroom is" : "showrooms are"} waiting to be verified.
        </Link>
      )}
      <AutoForm className="grid gap-2 sm:grid-cols-[12rem_12rem_12rem]">
        <select name="city" defaultValue={city} aria-label="City" className="field">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="brand" defaultValue={brand} aria-label="Brand" className="field">
          <option value="">All brands</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select name="status" defaultValue={status} aria-label="Status" className="field">
          <option value="">Any status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </AutoForm>
      <p className="mt-4 text-sm text-dim">
        <span className="tnum font-semibold text-text">{rows.length}</span> showrooms. The seeded ones are invented names, not real dealerships.
      </p>
      <div className="table-wrap mt-3">
        <table>
          <thead>
            <tr><th>Showroom</th><th>Brand</th><th>City</th><th>Status</th><th className="text-right">Logins</th><th className="text-right">Quotes</th><th className="text-right">Buyers sent</th><th className="text-right">Booked</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/admin/showrooms/${s.id}`} className="font-medium hover:text-accent">{s.name}</Link>
                  <span className="block text-xs text-faint">{s.locality}</span>
                </td>
                <td className="text-dim">{s.brand}</td>
                <td className="text-dim">{s.city}</td>
                <td className={TONE[s.status]}>{STATUS[s.status]}</td>
                <td className="tnum text-right">{s.staff}</td>
                <td className="tnum text-right">{s.quotes}</td>
                <td className="tnum text-right">{s.referrals}</td>
                <td className="tnum text-right">{s.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
