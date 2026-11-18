import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { listCities, listGroups } from "@/lib/queries";
import { GROUP_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { shortDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { AutoForm } from "@/components/auto-form";

export default async function AdminGroups({ searchParams }: { searchParams: Promise<{ city?: string; status?: string; q?: string }> }) {
  await requireAdmin(); // pages render alongside the layout, so each one checks for itself
  const { city = "", status = "", q = "" } = await searchParams;
  const [all, cities] = await Promise.all([listGroups({ includeClosed: true }), listCities()]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = all.filter(
    (g) =>
      (!city || g.citySlug === city) &&
      (!status || g.status === status) &&
      words.every((w) => `${g.brand} ${g.model} ${g.city}`.toLowerCase().includes(w)),
  );
  return (
    <div>
      <AutoForm className="grid gap-2 sm:grid-cols-[1fr_12rem_14rem_auto]">
        <input name="q" defaultValue={q} placeholder="Search car or brand" aria-label="Search" className="field" />
        <select name="city" defaultValue={city} aria-label="City" className="field">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={status} aria-label="Stage" className="field">
          <option value="">All stages</option>
          {GROUP_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <button className="btn btn-quiet">Search</button>
      </AutoForm>
      <p className="mt-4 text-sm text-dim"><span className="tnum font-semibold text-text">{rows.length}</span> groups</p>
      <div className="table-wrap mt-3">
        <table>
          <thead>
            <tr><th>Car</th><th>City</th><th>Stage</th><th className="text-right">Buyers</th><th>Closes</th><th><span className="sr-only">Open</span></th></tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td className="font-medium">{g.brand} {g.model}</td>
                <td className="text-dim">{g.city}</td>
                <td><StatusBadge status={g.status} /></td>
                <td className="tnum text-right">{g.members} / {g.targetSize}</td>
                <td className="whitespace-nowrap text-dim">{shortDate(g.deadline)}</td>
                <td className="text-right"><Link href={`/admin/groups/${g.id}`} className="font-semibold text-accent hover:underline">Manage</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-faint">No groups match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
