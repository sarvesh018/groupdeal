import { Star, Truck } from "lucide-react";
import type { GroupDetail } from "@/lib/queries";
import { rupees, shortDate } from "@/lib/format";
import { acceptQuote, withdrawAcceptance } from "@/app/actions/groups";
import { SubmitButton } from "./submit-button";

type Quote = GroupDetail["quoteRows"][number];

const ROWS: { label: string; get: (q: Quote) => number; minus?: boolean }[] = [
  { label: "Ex-showroom price", get: (q) => q.exShowroom },
  { label: "Carmaker offer", get: (q) => q.makerOffer, minus: true },
  { label: "Showroom discount", get: (q) => q.dealerDiscount, minus: true },
  { label: "Insurance", get: (q) => q.insurance },
  { label: "RTO and registration", get: (q) => q.rto },
  { label: "Accessories", get: (q) => q.accessories },
  { label: "Other charges", get: (q) => q.otherCharges },
];

export function QuoteCompare({
  group,
  myAcceptedId,
  canAct,
}: {
  group: GroupDetail;
  myAcceptedId: number | null;
  canAct: boolean;
}) {
  const quotes = group.quoteRows;
  const lowest = Math.min(...quotes.map((q) => q.onRoad));
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="grid min-w-max gap-3" style={{ gridTemplateColumns: `repeat(${quotes.length}, minmax(16.5rem, 1fr))` }}>
        {quotes.map((q) => {
          const mine = myAcceptedId === q.id;
          return (
            <article key={q.id} className={`card flex flex-col p-5 ${mine ? "border-mint/60" : ""}`}>
              <h3 className="text-lg leading-snug">{q.showroom}</h3>
              <p className="mt-1 flex items-center gap-3 text-sm text-dim">
                <span>{q.showroomLocality}</span>
                <span className="flex items-center gap-1"><Star className="size-3.5 fill-accent text-accent" aria-hidden />{q.showroomRating.toFixed(1)}</span>
              </p>
              <dl className="mt-5 space-y-2 text-sm">
                {ROWS.map((r) => {
                  const v = r.get(q);
                  return (
                    <div key={r.label} className="flex justify-between gap-4">
                      <dt className="text-dim">{r.label}</dt>
                      <dd className={`tnum ${r.minus && v > 0 ? "text-mint" : ""}`}>
                        {r.minus && v > 0 ? "− " : ""}{v === 0 ? "None" : rupees(v)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm text-dim">On-road price</p>
                <p className="tnum font-display text-3xl">{rupees(q.onRoad)}</p>
                {q.onRoad === lowest && quotes.length > 1 && (
                  <p className="mt-1 text-sm font-medium text-mint">Lowest on-road price</p>
                )}
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-dim">
                <Truck className="size-4" aria-hidden />
                {q.deliveryWeeks === 0 ? "In stock" : `Delivery in about ${q.deliveryWeeks} ${q.deliveryWeeks === 1 ? "week" : "weeks"}`}
              </p>
              <p className="mt-1 text-sm text-dim">Valid until {shortDate(q.validUntil)}</p>

              {canAct && (
                <form action={mine ? withdrawAcceptance : acceptQuote} className="mt-5">
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="quoteId" value={q.id} />
                  {mine ? (
                    <SubmitButton className="btn btn-quiet w-full" pendingText="Updating">Change my mind</SubmitButton>
                  ) : (
                    <SubmitButton className="btn btn-primary w-full" pendingText="Saving">I want this offer</SubmitButton>
                  )}
                </form>
              )}
            </article>
          );
        })}
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-dim">
        The lowest price is not always the best deal. Check delivery time, what the insurance covers and
        which accessories are included before you choose. Sample quotes, for demonstration only.
      </p>
    </div>
  );
}
