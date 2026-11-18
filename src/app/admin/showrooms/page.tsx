import { requireAdmin } from "@/lib/session";
import { Star } from "lucide-react";
import { adminShowrooms, listCities } from "@/lib/queries";
import { AutoForm } from "@/components/auto-form";

export default async function AdminShowrooms({ searchParams }: { searchParams: Promise<{ city?: string; brand?: string }> }) {
  await requireAdmin(); // pages render alongside the layout, so each one checks for itself
  const { city = "", brand = "" } = await searchParams;
  const [all, cities] = await Promise.all([adminShowrooms(), listCities()]);
  const cityId = cities.find((c) => c.slug === city)?.id;
  const brands = [...new Set(all.map((s) => s.brand))].sort();
  const rows = all.filter((s) => (!cityId || s.cityId === cityId) && (!brand || s.brand === brand));
  return (
    <div>
      <AutoForm className="grid gap-2 sm:grid-cols-[12rem_12rem]">
        <select name="city" defaultValue={city} aria-label="City" className="field">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="brand" defaultValue={brand} aria-label="Brand" className="field">
          <option value="">All brands</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
      </AutoForm>
      <p className="mt-4 text-sm text-dim">
        <span className="tnum font-semibold text-text">{rows.length}</span> showrooms. These are invented names for the demo, not real dealerships.
      </p>
      <div className="table-wrap mt-3">
        <table>
          <thead><tr><th>Showroom</th><th>Brand</th><th>City</th><th>Area</th><th>Phone</th><th className="text-right">Rating</th><th className="text-right">Quotes sent</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td className="text-dim">{s.brand}</td>
                <td className="text-dim">{s.city}</td>
                <td className="text-dim">{s.locality}</td>
                <td className="tnum whitespace-nowrap text-dim">{s.phone}</td>
                <td className="tnum text-right"><span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-accent text-accent" aria-hidden />{s.rating.toFixed(1)}</span></td>
                <td className="tnum text-right">{s.quotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
