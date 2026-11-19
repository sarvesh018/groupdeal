import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { adminReferrals } from "@/lib/admin-queries";
import { REFERRAL_LABEL } from "@/lib/rules";
import { shortDate } from "@/lib/format";
import { AutoForm } from "@/components/auto-form";
import { ResolveDisputeForm } from "@/components/admin-portal-forms";

const DISPUTE: Record<string, string> = {
  open: "Waiting for showroom",
  confirmed: "Showroom confirmed",
  rejected: "Showroom disagrees: decide",
  fee_due: "Decided: fee due",
  no_fee: "Decided: no fee",
};

export default async function AdminReferrals({ searchParams }: { searchParams: Promise<{ status?: string; showroom?: string }> }) {
  await requireAdmin();
  const { status = "", showroom = "" } = await searchParams;
  const { rows, disputes } = await adminReferrals();
  const shown = rows.filter((r) => (!status || r.status === status) && (!showroom || String(r.showroomId) === showroom));
  const rooms = [...new Map(rows.map((r) => [r.showroomId, r.showroom])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-3xl">Bookings to check</h2>
        <p className="mt-2 max-w-2xl text-dim">A buyer reported a booking the showroom hadn&apos;t recorded. The showroom answers first; you decide when it disagrees or doesn&apos;t answer in 7 days.</p>
        {disputes.length === 0 ? (
          <p className="mt-6 border-y border-line py-6 text-dim">None.</p>
        ) : (
          <div className="table-wrap mt-6">
            <table>
              <thead><tr><th>Referral</th><th>Buyer says</th><th>Showroom says</th><th>Status</th><th>Decision</th></tr></thead>
              <tbody>
                {disputes.map((d) => {
                  const decide = d.needsDecision;
                  return (
                    <tr key={d.d.id}>
                      <td>
                        <span className="tnum font-medium">{d.code}</span>
                        <span className="block text-xs text-dim">{d.buyer}, {d.model}, {d.showroom}</span>
                      </td>
                      <td className="text-dim">
                        Booking <span className="tnum text-text">{d.buyerBookingNo || "no number"}</span>
                        {d.proofs.map((p) => (
                          <a key={p.id} href={`/admin/documents/${p.id}?kind=receipt`} target="_blank" rel="noreferrer" className="block text-xs underline underline-offset-4 hover:text-accent">{p.fileName}</a>
                        ))}
                      </td>
                      <td className="max-w-64 text-dim">{d.d.showroomResponse || (d.d.status === "open" ? `Answer due ${shortDate(d.d.respondBy)}` : "")}</td>
                      <td className={decide ? "text-accent" : "text-dim"}>{d.d.status === "open" && decide ? "No answer: decide" : DISPUTE[d.d.status]}</td>
                      <td className="min-w-64">{decide ? <ResolveDisputeForm disputeId={d.d.id} /> : <span className="text-sm text-dim">{d.d.resolutionNote}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-3xl">All referrals</h2>
        <p className="mt-2 max-w-2xl text-dim">Every buyer sent to a showroom, after they picked its offer and agreed to be contacted.</p>
        <AutoForm className="mt-6 grid gap-2 sm:grid-cols-[14rem_18rem]">
          <select name="status" defaultValue={status} aria-label="Status" className="field">
            <option value="">Any status</option>
            {Object.entries(REFERRAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="showroom" defaultValue={showroom} aria-label="Showroom" className="field">
            <option value="">All showrooms</option>
            {rooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </AutoForm>
        <div className="table-wrap mt-4">
          <table>
            <thead><tr><th>Referral</th><th>Buyer</th><th>Car</th><th>Showroom</th><th>Status</th><th>Booking</th><th>Sent</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="tnum font-medium"><Link href={`/admin/groups/${r.groupId}`} className="hover:text-accent">{r.code}</Link></td>
                  <td>{r.name}<span className="block text-xs text-faint">{r.phone}</span></td>
                  <td className="text-dim">{[r.model, r.variant, r.colour].filter(Boolean).join(", ")}</td>
                  <td className="text-dim">{r.showroom}</td>
                  <td className={["booked", "delivered"].includes(r.status) ? "text-mint" : r.status === "sent" ? "text-accent" : ""}>
                    {REFERRAL_LABEL[r.status]}
                    {r.lostReason && <span className="block text-xs text-faint">{r.lostReason}</span>}
                  </td>
                  <td className="tnum text-dim">{r.bookingNo}</td>
                  <td className="tnum whitespace-nowrap text-dim">{shortDate(r.sentAt)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-faint">No referrals match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
