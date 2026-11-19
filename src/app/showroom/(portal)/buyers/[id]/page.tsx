import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { requireShowroom } from "@/lib/session";
import { getShowroomReferral, listStaff } from "@/lib/showroom-queries";
import { acknowledgeReferral, assignReferral } from "@/app/actions/showroom";
import { REFERRAL_LABEL, deliveryText } from "@/lib/rules";
import { rupees, shortDate } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { ActionSelect } from "@/components/action-select";
import { ReferralUpdateForm } from "@/components/showroom-forms";

export const metadata = { title: "Buyer" };

const EVENT: Record<string, string> = {
  created: "Referral sent",
  reopened: "Referral re-sent",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  contacted: "Contacted",
  test_drive: "Test drive",
  booked: "Booked",
  delivered: "Delivered",
  lost: "Lost",
  cancelled: "Withdrawn",
  expired: "Expired",
  buyer_reported: "Buyer reported a booking",
  receipt: "Receipt uploaded",
  dispute_rejected: "Showroom disputed the booking",
  fee_due: "GroupDeal decided: fee due",
  no_fee: "GroupDeal decided: no fee",
};

export default async function BuyerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireShowroom();
  const { id } = await params;
  const r = await getShowroomReferral(Number(id), ctx.showroom.id);
  if (!r) notFound();
  const exec = ctx.staffRole === "executive";
  if (exec && r.assignedTo !== ctx.user.id) notFound();
  const staff = exec ? [] : await listStaff(ctx.showroom.id);
  const wa = `https://wa.me/91${r.phone}?text=${encodeURIComponent(`Hello ${r.name.split(" ")[0]}, this is ${ctx.user.name} from ${ctx.showroom.name} about your GroupDeal offer ${r.code} for the ${r.brand} ${r.model}.`)}`;
  const wants = [
    ["Variant", r.variant || "No preference"],
    ["Colour", r.colour || "No preference"],
    ["Also fine with", r.altColours.split(",").filter(Boolean).join(", ") || "None"],
    ["Gearbox", r.transmission || "Either"],
    ["Must-haves", r.features.split(",").filter(Boolean).join(", ") || "None"],
    ["Plans to buy", r.purchaseMonth || "Not sure yet"],
  ];

  return (
    <div>
      <Link href="/showroom/buyers" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Buyers
      </Link>
      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="tnum text-sm text-dim">{r.code}</p>
          <h2 className="mt-2 text-5xl leading-none tracking-[-0.04em]">{r.name}</h2>
          <p className="mt-3 text-dim">{r.brand} {r.model}, {r.locality || r.city}</p>
        </div>
        <p className={`text-lg ${["booked", "delivered"].includes(r.status) ? "text-mint" : r.status === "sent" ? "text-accent" : ""}`}>{REFERRAL_LABEL[r.status]}</p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-12">
          <section>
            <h3 className="text-2xl">Contact</h3>
            {r.hidden ? (
              <div className="mt-4 rounded-(--radius-card) border border-accent/40 bg-accent/[0.06] p-5">
                <p className="text-dim">Acknowledge this buyer to see their phone and email. The buyer is told you have their details, so call within a day.</p>
                <form action={acknowledgeReferral} className="mt-4">
                  <input type="hidden" name="referralId" value={r.id} />
                  <SubmitButton pendingText="Acknowledging">Acknowledge and show contact</SubmitButton>
                </form>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href={`tel:+91${r.phone}`} className="btn btn-quiet"><Phone className="size-4" aria-hidden /> {r.phone}</a>
                <a href={wa} target="_blank" rel="noreferrer" className="btn btn-quiet"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>
                <a href={`mailto:${r.email}`} className="text-sm text-dim underline-offset-4 hover:text-text hover:underline">{r.email}</a>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-2xl">What they want</h3>
            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {wants.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-3 text-sm">
                  <dt className="text-dim">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {r.note && <p className="mt-4 text-sm text-dim">Note from buyer: “{r.note}”</p>}
            {r.price && (
              <p className="mt-6 rounded-xl border border-line bg-panel px-4 py-3 text-sm">
                Your quoted price for them: <span className="tnum font-semibold">{rupees(r.price.onRoad)}</span> on-road ({r.price.variant}),{" "}
                {deliveryText(r.price.weeks).toLowerCase()}{r.price.colour ? ` in ${r.price.colour}` : ""}. Please honour it.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-2xl">Timeline</h3>
            <ol className="mt-4 border-l border-line pl-5">
              {r.events.map((e) => (
                <li key={e.id} className="relative pb-5">
                  <span className="absolute -left-[1.42rem] top-1.5 size-2 rounded-full bg-text/60" aria-hidden />
                  <p className="text-sm font-medium">{EVENT[e.kind] ?? e.kind}</p>
                  <p className="text-xs text-dim">{shortDate(e.at)}{e.actor ? `, ${e.actor}` : ""}</p>
                  {e.note && <p className="mt-1 text-sm text-dim">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-8">
          {!r.hidden && (
            <div className="card p-6">
              <h3 className="text-lg">Update</h3>
              <div className="mt-4">
                <ReferralUpdateForm referralId={r.id} status={r.status} />
                {["lost", "cancelled", "delivered"].includes(r.status) && <p className="text-sm text-dim">This referral is closed.</p>}
              </div>
            </div>
          )}
          {!exec && (
            <div>
              <label className="label" htmlFor="assign">Handled by</label>
              <ActionSelect
                selectId="assign"
                action={assignReferral}
                idName="referralId"
                id={r.id}
                name="userId"
                value={String(r.assignedTo ?? "")}
                label="Handled by"
                className="field"
                options={[{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: String(s.id), label: `${s.name} (${s.role})` }))]}
              />
            </div>
          )}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-dim">Sent</dt><dd>{shortDate(r.sentAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-dim">Valid until</dt><dd>{shortDate(r.expiresAt)}</dd></div>
            {r.bookingNo && <div className="flex justify-between"><dt className="text-dim">Booking</dt><dd className="tnum">{r.bookingNo}</dd></div>}
            {r.fee && !exec && (
              <div className="flex justify-between"><dt className="text-dim">Fee</dt><dd>{r.fee.status === "waived" ? "Free trial" : rupees(r.fee.amount + r.fee.gst)}</dd></div>
            )}
          </dl>
          {r.dispute?.status === "open" && !exec && (
            <p className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
              The buyer says they booked ({r.buyerBookingNo}). <Link href="/showroom/billing#disputes" className="font-semibold underline">Answer by {shortDate(r.dispute.respondBy)}</Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
