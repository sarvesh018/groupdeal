import { adminUsers, listCities } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { shortDate } from "@/lib/format";
import { setUserRole } from "@/app/actions/admin";
import { AutoForm } from "@/components/auto-form";
import { ActionSelect } from "@/components/action-select";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ city?: string; q?: string }> }) {
  const { city = "", q = "" } = await searchParams;
  const me = await requireAdmin();
  const [all, cities] = await Promise.all([adminUsers(), listCities()]);
  const cityId = cities.find((c) => c.slug === city)?.id;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = all.filter(
    (u) => (!cityId || u.cityId === cityId) && words.every((w) => `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(w)),
  );
  return (
    <div>
      <AutoForm className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" aria-label="Search" className="field" />
        <select name="city" defaultValue={city} aria-label="City" className="field">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button className="btn btn-quiet">Search</button>
      </AutoForm>
      <p className="mt-4 text-sm text-dim"><span className="tnum font-semibold text-text">{rows.length}</span> users</p>
      <div className="table-wrap mt-3">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>City</th><th className="text-right">Groups</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td><span className="font-medium">{u.name}</span><span className="block text-xs text-faint">{u.email}</span></td>
                <td className="tnum whitespace-nowrap">{u.phone}</td>
                <td className="text-dim">{u.city}{u.locality ? `, ${u.locality}` : ""}</td>
                <td className="tnum text-right">{u.groups}</td>
                <td className="whitespace-nowrap text-dim">{shortDate(u.createdAt)}</td>
                <td>
                  {u.id === me.id ? (
                    <span className="text-sm text-dim">Admin (you)</span>
                  ) : u.role === "showroom" ? (
                    <span className="text-sm text-dim">Showroom staff</span>
                  ) : (
                    <ActionSelect
                      action={setUserRole}
                      idName="userId"
                      id={u.id}
                      name="role"
                      value={u.role}
                      label={`Role for ${u.name}`}
                      className="field min-w-28 py-1.5"
                      options={[{ value: "buyer", label: "Buyer" }, { value: "admin", label: "Admin" }]}
                    />
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-faint">No users match this search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
