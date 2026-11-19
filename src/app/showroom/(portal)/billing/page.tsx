import Link from "next/link";
import { requireShowroom } from "@/lib/session";
import { showroomBilling } from "@/lib/showroom-queries";
import { monthLabel } from "@/lib/rules";
import { rupees, shortDate } from "@/lib/format";
import { DisputeResponseForm } from "@/components/showroom-forms";

export const metadata = { title: "Billing" };

const FEE: Record<string, string> = { due: "To be billed", waived: "Free trial", paid: "Paid", cancelled: "Cancelled" };
const DISPUTE: Record<string, string> = {
  open: "Waiting for you",
  confirmed: "You confirmed",
  rejected: "GroupDeal is checking",
  fee_due: "Decided: fee due",
  no_fee: "Decided: no fee",
};

export default async function BillingPage() {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") return <p className="text-dim">Billing is handled by your manager.</p>;
  const { feeRows, statementRows, disputeRows } = await showroomBilling(ctx.showroom.id);
  const unbilled = feeRows.filter((f) => f.status === "due" && !f.statementId);
  const unbilledTotal = unbilled.reduce((a, f) => a + f.amount + f.gst, 0);
  const owed = statementRows.filter((s) => s.status === "issued").reduce((a, s) => a + s.amount + s.gst, 0);

  return (
    <div className="space-y-16">
      <dl className="grid gap-px overflow-hidden rounded-(--radius-card) border border-line bg-line sm:grid-cols-3">
        <div className="bg-panel p-6">
          <dt className="text-sm text-dim">Invoices to pay</dt>
          <dd className="tnum mt-1 font-display text-4xl tracking-[-0.03em]">{rupees(owed)}</dd>
        </div>
        <div className="bg-panel p-6">
          <dt className="text-sm text-dim">Next invoice so far</dt>
          <dd className="tnum mt-1 font-display text-4xl tracking-[-0.03em]">{rupees(unbilledTotal)}</dd>
          <dd className="mt-1 text-xs text-faint">{unbilled.length} {unbilled.length === 1 ? "booking" : "bookings"}, GST included</dd>
        </div>
        <div className="bg-panel p-6">
          <dt className="text-sm text-dim">Free bookings used</dt>
          <dd className="tnum mt-1 font-display text-4xl tracking-[-0.03em]">{feeRows.filter((f) => f.status === "waived").length} of {ctx.showroom.freeBookings}</dd>
        </div>
      </dl>

      <section id="disputes">
        <h2 className="text-2xl">Bookings buyers reported</h2>
        <p className="mt-2 max-w-2xl text-dim">When a buyer tells us they booked and you haven&apos;t recorded it, we ask you first. No answer in 7 days and GroupDeal decides from the receipt.</p>
        {disputeRows.length === 0 ? (
          <p className="mt-6 border-y border-line py-6 text-dim">None.</p>
        ) : (
          <ul className="rule mt-6">
            {disputeRows.map((d) => (
              <li key={d.id} className="grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <div>
                  <Link href={`/showroom/buyers/${d.referralId}`} className="tnum font-medium hover:text-accent">{d.code}</Link>
                  <span className="text-dim">, {d.model}. Buyer&apos;s booking number: </span>
                  <span className="tnum">{d.buyerBookingNo || "not given"}</span>
                  <p className={`mt-1 text-sm ${d.status === "open" ? "text-accent" : "text-dim"}`}>
                    {DISPUTE[d.status]}{d.status === "open" && `, answer by ${shortDate(d.respondBy)}`}
                  </p>
                  {d.showroomResponse && <p className="mt-1 text-sm text-dim">Your answer: {d.showroomResponse}</p>}
                  {d.resolutionNote && <p className="mt-1 text-sm text-dim">GroupDeal: {d.resolutionNote}</p>}
                </div>
                {d.status === "open" && <DisputeResponseForm disputeId={d.id} buyerBookingNo={d.buyerBookingNo} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl">Invoices</h2>
        {statementRows.length === 0 ? (
          <p className="mt-6 border-y border-line py-6 text-dim">No invoices yet. GroupDeal sends one at the start of each month for the previous month&apos;s bookings.</p>
        ) : (
          <ul className="rule mt-6">
            {statementRows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line py-4">
                <Link href={`/showroom/billing/${s.id}`} className="font-medium hover:text-accent">{monthLabel(s.month)}</Link>
                <span className="tnum text-dim">{s.number}</span>
                <span className="tnum">{rupees(s.amount + s.gst)}</span>
                <span className={s.status === "paid" ? "text-mint" : "text-accent"}>{s.status === "paid" ? "Paid" : "To pay"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl">Fees per booking</h2>
        {feeRows.length === 0 ? (
          <p className="mt-6 border-y border-line py-6 text-dim">No bookings yet. You pay only when a buyer you were referred books.</p>
        ) : (
          <div className="table-wrap mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dim">
                  <th className="px-4 py-3 font-medium">Booking</th>
                  <th className="px-4 py-3 font-medium">Car</th>
                  <th className="px-4 py-3 text-right font-medium">Fee</th>
                  <th className="px-4 py-3 text-right font-medium">GST</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {feeRows.map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <td className="tnum px-4 py-3"><Link href={`/showroom/buyers/${f.referralId}`} className="hover:text-accent">{f.code}</Link></td>
                    <td className="px-4 py-3 text-dim">{f.model}</td>
                    <td className={`tnum px-4 py-3 text-right ${f.status === "waived" ? "text-faint line-through" : ""}`}>{rupees(f.amount)}</td>
                    <td className="tnum px-4 py-3 text-right">{rupees(f.gst)}</td>
                    <td className="px-4 py-3">{f.statementId && f.status === "due" ? "On invoice" : FEE[f.status]}</td>
                    <td className="tnum px-4 py-3 text-dim">{shortDate(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
