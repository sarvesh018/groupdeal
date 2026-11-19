import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { adminBilling } from "@/lib/admin-queries";
import { markStatementPaid, setFeeStatus } from "@/app/actions/admin";
import { monthLabel } from "@/lib/rules";
import { lakh, rupees, shortDate } from "@/lib/format";
import { FeeBandsForm, StatementsForm } from "@/components/admin-portal-forms";
import { ActionSelect } from "@/components/action-select";
import { SubmitButton } from "@/components/submit-button";

const FEE: Record<string, string> = { due: "Due", waived: "Free trial / waived", paid: "Paid", cancelled: "Cancelled" };

export default async function AdminBilling() {
  await requireAdmin();
  const { bands, feeRows, statementRows, months } = await adminBilling();
  const byMonth = months.map((m) => {
    const list = feeRows.filter((f) => f.month === m);
    const billable = list.filter((f) => f.status === "due" || f.status === "paid");
    return {
      month: m,
      bookings: list.length,
      waived: list.filter((f) => f.status === "waived").length,
      amount: billable.reduce((a, f) => a + f.amount, 0),
      unbilled: list.filter((f) => f.status === "due" && !f.statementId).length,
    };
  });

  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-3xl">Fee per booking</h2>
          <p className="mt-2 text-dim">Charged once per confirmed booking, by the car&apos;s ex-showroom price. Changes apply to new bookings only.</p>
          <ul className="mt-5 text-sm">
            {bands.map((b) => (
              <li key={b.id} className="flex justify-between border-b border-line py-2">
                <span className="text-dim">{b.maxPrice ? `${lakh(b.minPrice)} to ${lakh(b.maxPrice)}` : `${lakh(b.minPrice)} and above`}</span>
                <span className="tnum">{rupees(b.fee)} + GST</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <FeeBandsForm bands={bands} />
        </div>
      </section>

      <section>
        <h2 className="text-3xl">By month</h2>
        <div className="table-wrap mt-6">
          <table>
            <thead><tr><th>Month</th><th className="text-right">Bookings</th><th className="text-right">Free trial</th><th className="text-right">Fees (before GST)</th><th className="text-right">Not yet invoiced</th></tr></thead>
            <tbody>
              {byMonth.map((m) => (
                <tr key={m.month}>
                  <td>{monthLabel(m.month)}</td>
                  <td className="tnum text-right">{m.bookings}</td>
                  <td className="tnum text-right">{m.waived}</td>
                  <td className="tnum text-right">{rupees(m.amount)}</td>
                  <td className={`tnum text-right ${m.unbilled ? "text-accent" : "text-dim"}`}>{m.unbilled}</td>
                </tr>
              ))}
              {byMonth.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-faint">No bookings yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <StatementsForm months={months.map((m) => ({ key: m, label: monthLabel(m) }))} />
          <p className="mt-2 text-xs text-faint">Makes one invoice per showroom for that month&apos;s unbilled fees, and tells the showroom owner.</p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl">Invoices</h2>
        <div className="table-wrap mt-6">
          <table>
            <thead><tr><th>Number</th><th>Showroom</th><th>Month</th><th className="text-right">Total with GST</th><th>Status</th><th /></tr></thead>
            <tbody>
              {statementRows.map(({ st, showroom }) => (
                <tr key={st.id}>
                  <td className="tnum"><Link href={`/admin/billing/${st.id}`} className="hover:text-accent">{st.number}</Link></td>
                  <td>{showroom}</td>
                  <td className="text-dim">{monthLabel(st.month)}</td>
                  <td className="tnum text-right">{rupees(st.amount + st.gst)}</td>
                  <td className={st.status === "paid" ? "text-mint" : "text-accent"}>{st.status === "paid" ? `Paid ${st.paidAt ? shortDate(st.paidAt) : ""}` : "Unpaid"}</td>
                  <td>
                    {st.status !== "paid" && (
                      <form action={markStatementPaid}>
                        <input type="hidden" name="statementId" value={st.id} />
                        <SubmitButton className="btn btn-quiet btn-sm" pendingText="Saving">Mark paid</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {statementRows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-faint">No invoices yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-3xl">Every fee</h2>
        <div className="table-wrap mt-6">
          <table>
            <thead><tr><th>Booking</th><th>Showroom</th><th className="text-right">Fee</th><th className="text-right">GST</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {feeRows.map((f) => (
                <tr key={f.id}>
                  <td className="tnum">{f.code}</td>
                  <td className="text-dim">{f.showroom}</td>
                  <td className="tnum text-right">{rupees(f.amount)}</td>
                  <td className="tnum text-right">{rupees(f.gst)}</td>
                  <td>
                    {f.statementId || f.status === "paid" ? (
                      <span className="text-dim">{f.status === "paid" ? "Paid" : "On invoice"}</span>
                    ) : (
                      <ActionSelect
                        action={setFeeStatus}
                        idName="feeId"
                        id={f.id}
                        name="status"
                        value={f.status}
                        label={`Status of fee for ${f.code}`}
                        options={["due", "waived", "cancelled"].map((v) => ({ value: v, label: FEE[v] }))}
                      />
                    )}
                    {f.note && <span className="block text-xs text-faint">{f.note}</span>}
                  </td>
                  <td className="tnum whitespace-nowrap text-dim">{shortDate(f.createdAt)}</td>
                </tr>
              ))}
              {feeRows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-faint">No fees yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
