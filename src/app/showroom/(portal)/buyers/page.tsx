import Link from "next/link";
import { requireShowroom } from "@/lib/session";
import { listShowroomReferrals, listStaff } from "@/lib/showroom-queries";
import { REFERRAL_LABEL } from "@/lib/rules";
import { daysLeft, shortDate } from "@/lib/format";

export const metadata = { title: "Buyers" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "sent", label: "New" },
  { key: "active", label: "Talking" },
  { key: "booked", label: "Booked" },
  { key: "closed", label: "Closed" },
];
const match = (f: string, s: string) =>
  !f ||
  (f === "sent" && s === "sent") ||
  (f === "active" && ["acknowledged", "contacted", "test_drive"].includes(s)) ||
  (f === "booked" && ["booked", "delivered"].includes(s)) ||
  (f === "closed" && ["lost", "cancelled", "expired"].includes(s));

export default async function BuyersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireShowroom();
  const { status = "" } = await searchParams;
  const exec = ctx.staffRole === "executive";
  const [all, staff] = await Promise.all([listShowroomReferrals(ctx.showroom.id, exec ? ctx.user.id : undefined), listStaff(ctx.showroom.id)]);
  const rows = all.filter((r) => match(status, r.status));
  const nameOf = (id: number | null) => staff.find((s) => s.id === id)?.name ?? "Unassigned";

  return (
    <div>
      <p className="max-w-2xl text-dim">
        {exec ? "Buyers assigned to you." : "Buyers who picked your offer and agreed to be contacted."} Contact details appear once you acknowledge a buyer.
        Each referral is valid for 90 days.
      </p>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter buyers">
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key ? `/showroom/buyers?status=${f.key}` : "/showroom/buyers"} className={`chip ${status === f.key ? "chip-on" : ""}`}>
            {f.label}
            <span className="tnum opacity-70">{all.filter((r) => match(f.key, r.status)).length}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="mt-6 border-y border-line py-6 text-dim">No buyers here yet.</p>
      ) : (
        <div className="table-wrap mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dim">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Wants</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {!exec && <th className="px-4 py-3 font-medium">With</th>}
                <th className="px-4 py-3 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const left = daysLeft(r.expiresAt);
                const open = ["sent", "acknowledged", "contacted", "test_drive"].includes(r.status);
                return (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/showroom/buyers/${r.id}`} className="tnum font-medium text-text underline-offset-4 hover:text-accent hover:underline">{r.code}</Link>
                    </td>
                    <td className="px-4 py-3">{r.hidden ? <span className="text-dim">{r.name}, details on acknowledge</span> : r.name}</td>
                    <td className="px-4 py-3 text-dim">{[r.model, r.variant, r.colour].filter(Boolean).join(", ")}</td>
                    <td className="px-4 py-3">
                      <span className={r.status === "sent" ? "text-accent" : ["booked", "delivered"].includes(r.status) ? "text-mint" : ""}>{REFERRAL_LABEL[r.status]}</span>
                      {open && left <= 14 && <span className="block text-xs text-rose">{left} days left</span>}
                    </td>
                    {!exec && <td className="px-4 py-3 text-dim">{nameOf(r.assignedTo)}</td>}
                    <td className="tnum px-4 py-3 text-dim">{shortDate(r.sentAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
