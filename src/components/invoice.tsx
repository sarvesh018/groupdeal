import { rupees, shortDate } from "@/lib/format";
import { monthLabel } from "@/lib/rules";
import type { getStatement } from "@/lib/showroom-queries";
import { PrintButton } from "./print-button";

type Statement = NonNullable<Awaited<ReturnType<typeof getStatement>>>;

// Your business details for invoices. Set these in the environment before you bill anyone.
const SELLER = {
  name: process.env.BUSINESS_NAME || "GroupDeal (set BUSINESS_NAME)",
  gstin: process.env.BUSINESS_GSTIN || "Not set (BUSINESS_GSTIN)",
  address: process.env.BUSINESS_ADDRESS || "Set BUSINESS_ADDRESS",
  state: process.env.BUSINESS_STATE || "Maharashtra",
};

/** A tax invoice for one month's referral fees. Same state: CGST + SGST. Other state: IGST. */
export function Invoice({ s }: { s: Statement }) {
  const intra = s.state === SELLER.state;
  const total = s.st.amount + s.st.gst;
  return (
    <article className="invoice mx-auto max-w-3xl rounded-(--radius-card) border border-line bg-panel p-8 sm:p-10 print:border-0 print:bg-white print:p-0 print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-display text-3xl tracking-[-0.03em]">Tax invoice</p>
          <p className="tnum mt-1 text-dim print:text-black">{s.st.number}</p>
        </div>
        <div className="text-right text-sm">
          <p>Issued {shortDate(s.st.issuedAt)}</p>
          <p className="text-dim print:text-black">For {monthLabel(s.st.month)}</p>
          <p className={s.st.status === "paid" ? "text-mint" : "text-accent"}>{s.st.status === "paid" ? `Paid ${s.st.paidAt ? shortDate(s.st.paidAt) : ""}` : "Due within 15 days"}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-faint print:text-black">From</p>
          <p className="mt-1 font-medium">{SELLER.name}</p>
          <p className="text-dim print:text-black">{SELLER.address}</p>
          <p className="text-dim print:text-black">GSTIN {SELLER.gstin}</p>
        </div>
        <div>
          <p className="text-xs text-faint print:text-black">To</p>
          <p className="mt-1 font-medium">{s.showroom.name}</p>
          <p className="text-dim print:text-black">{s.showroom.address || `${s.showroom.locality}, ${s.city}`}</p>
          <p className="text-dim print:text-black">{s.state}. GSTIN {s.showroom.gstNumber || "not provided"}</p>
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-dim print:text-black">
            <th className="py-2 font-medium">Referral fee for booking</th>
            <th className="py-2 font-medium">Booked</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {s.items.map((i) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-2">
                <span className="tnum">{i.code}</span>, {i.model}
                {i.bookingNo && <span className="text-dim print:text-black"> (booking {i.bookingNo})</span>}
              </td>
              <td className="py-2">{i.bookedAt ? shortDate(i.bookedAt) : ""}</td>
              <td className="tnum py-2 text-right">{rupees(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-dim print:text-black">Taxable value (SAC 998599)</dt><dd className="tnum">{rupees(s.st.amount)}</dd></div>
        {intra ? (
          <>
            <div className="flex justify-between"><dt className="text-dim print:text-black">CGST 9%</dt><dd className="tnum">{rupees(Math.floor(s.st.gst / 2))}</dd></div>
            <div className="flex justify-between"><dt className="text-dim print:text-black">SGST 9%</dt><dd className="tnum">{rupees(s.st.gst - Math.floor(s.st.gst / 2))}</dd></div>
          </>
        ) : (
          <div className="flex justify-between"><dt className="text-dim print:text-black">IGST 18%</dt><dd className="tnum">{rupees(s.st.gst)}</dd></div>
        )}
        <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="tnum">{rupees(total)}</dd></div>
      </dl>
      <p className="mt-8 text-xs text-faint print:text-black">
        Free-trial bookings are not billed. If you deduct TDS, send the certificate with your payment.
      </p>
      <div className="mt-6 print:hidden"><PrintButton /></div>
    </article>
  );
}
