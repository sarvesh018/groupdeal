import { Check } from "lucide-react";
import type { myReferral } from "@/lib/queries";
import { REFERRAL_LABEL } from "@/lib/rules";
import { shortDate } from "@/lib/format";
import { ReportBooking } from "./report-booking";

type Referral = NonNullable<Awaited<ReturnType<typeof myReferral>>>;

const STEPS = [
  { key: "sent", label: "Sent to showroom" },
  { key: "acknowledged", label: "Showroom has your details" },
  { key: "contacted", label: "Showroom called you" },
  { key: "test_drive", label: "Test drive" },
  { key: "booked", label: "Booked" },
  { key: "delivered", label: "Delivered" },
];

/** Where the buyer's referral stands, with the reference to quote at the showroom. */
export function ReferralCard({
  referral,
  showroom,
  locality,
  city,
  phone,
  groupId,
}: {
  referral: Referral;
  showroom: string;
  locality: string;
  city: string;
  phone: string;
  groupId: number;
}) {
  // Once booked, the calls in between no longer matter, so they aren't shown as steps.
  const steps = ["booked", "delivered"].includes(referral.status) ? STEPS.filter((s) => !["contacted", "test_drive"].includes(s.key)) : STEPS;
  const at = steps.findIndex((s) => s.key === referral.status);
  const closed = at === -1;
  const booked = referral.status === "booked" || referral.status === "delivered";
  const d = referral.dispute;
  return (
    <section className="mt-14 rounded-(--radius-card) border border-mint/40 bg-mint/[0.06] p-6 sm:p-8">
      <h2 className="text-3xl leading-tight">You picked {showroom}</h2>
      <p className="mt-3 max-w-xl leading-relaxed text-dim">
        Give this reference when you visit or call, so the showroom applies the group price. Picking an offer
        is not a booking. You pay the showroom directly, only if you decide to buy.
      </p>
      <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-xs text-faint">Your reference</p>
          <p className="tnum font-display text-3xl tracking-[-0.02em] text-mint">{referral.code}</p>
        </div>
        <div>
          <p className="text-xs text-faint">Showroom</p>
          <p>{locality}, {city}</p>
        </div>
        <div>
          <p className="text-xs text-faint">Phone</p>
          <p className="tnum">{phone}</p>
        </div>
      </div>

      {closed ? (
        <p className="mt-8 border-t border-line pt-5 text-sm text-dim">
          Status: <span className="text-text">{REFERRAL_LABEL[referral.status]}</span>
          {referral.status === "expired" && ". The 90-day window passed without a booking. Pick the offer again if you're still interested."}
        </p>
      ) : (
        <ol className={`mt-8 grid gap-3 border-t border-line pt-5 ${steps.length === 6 ? "sm:grid-cols-6" : "sm:grid-cols-4"}`}>
          {steps.map((s, i) => (
            <li key={s.key} className={`flex items-center gap-2 text-[13px] leading-tight sm:flex-col sm:items-start ${i <= at ? "text-text" : "text-faint"}`}>
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${i <= at ? "border-mint bg-mint text-ink" : "border-line"}`}>
                {i <= at && <Check className="size-3" aria-hidden />}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
      )}
      {!closed && <p className="mt-3 text-xs text-faint">Valid until {shortDate(referral.expiresAt)}.</p>}

      {booked ? (
        <p className="mt-6 text-sm text-mint">
          Booking {referral.bookingNo || referral.buyerBookingNo} recorded{referral.bookedAt ? ` on ${shortDate(referral.bookedAt)}` : ""}.
        </p>
      ) : referral.buyerReportedAt ? (
        <p className="mt-6 text-sm text-dim">
          You told us you booked ({referral.buyerBookingNo}).{" "}
          {d?.status === "open" && `We've asked the showroom to confirm by ${shortDate(d.respondBy)}.`}
          {d?.status === "rejected" && "The showroom disagreed. GroupDeal is checking and will contact you."}
          {d?.status === "no_fee" && "This one is closed."}
        </p>
      ) : (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-text">Booked already? Tell us</summary>
          <p className="mt-2 max-w-xl text-sm text-dim">This helps us check that the showroom honoured the group price. Your booking stays between you and the showroom.</p>
          <div className="mt-4"><ReportBooking groupId={groupId} /></div>
        </details>
      )}
    </section>
  );
}
