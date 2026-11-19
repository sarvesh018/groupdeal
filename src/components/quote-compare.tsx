import { PackageCheck, Star, Truck } from "lucide-react";
import type { GroupDetail } from "@/lib/queries";
import { rupees, shortDate } from "@/lib/format";
import { deliveryForMember, deliveryText, lineForMember, splitList, type LineLike } from "@/lib/rules";
import { withdrawAcceptance } from "@/app/actions/groups";
import { SubmitButton } from "./submit-button";
import { PickOffer } from "./pick-offer";

type Quote = GroupDetail["quoteRows"][number];
type Member = GroupDetail["memberRows"][number];

const ROWS: { label: string; get: (l: LineLike) => number; minus?: boolean }[] = [
  { label: "Ex-showroom price", get: (l) => l.exShowroom },
  { label: "Carmaker offer", get: (l) => l.makerOffer, minus: true },
  { label: "Showroom discount", get: (l) => l.dealerDiscount, minus: true },
  { label: "Insurance", get: (l) => l.insurance },
  { label: "RTO and registration", get: (l) => l.rto },
  { label: "Accessories", get: (l) => l.accessories },
  { label: "Other charges", get: (l) => l.otherCharges },
];

/** The price and delivery a showroom offers this member, from its rate card. */
function personal(q: Quote, me: Member | undefined) {
  const lines: (LineLike & { id: number })[] = q.lines.length ? q.lines : [{ ...q, variant: "All variants" }];
  const { line, exact } = lineForMember(lines, me?.variant ?? "");
  const d = deliveryForMember(q.colours, q.deliveryWeeks, me?.colour ?? "", splitList(me?.altColours ?? ""));
  return { line: line!, exact, delivery: d };
}

export function QuoteCompare({
  group,
  me,
  canAct,
}: {
  group: GroupDetail;
  me: Member | undefined;
  canAct: boolean;
}) {
  const quotes = group.quoteRows.map((q) => ({ q, p: personal(q, me) })).sort((a, b) => a.p.line.onRoad - b.p.line.onRoad);
  const lowest = quotes[0]?.p.line.onRoad;
  const myAcceptedId = me?.acceptedQuoteId ?? null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {me && (
        <p className="mb-5 text-sm text-dim">
          Prices for {me.variant ? <>the <span className="text-text">{me.variant}</span> variant</> : "the variant each showroom priced lowest"}
          {me.colour && <>, delivery for <span className="text-text">{me.colour}</span>{me.altColours && " or the colours you said are fine"}</>}.
        </p>
      )}
      <div className="grid min-w-max gap-3" style={{ gridTemplateColumns: `repeat(${quotes.length}, minmax(16.5rem, 1fr))` }}>
        {quotes.map(({ q, p }) => {
          const mine = myAcceptedId === q.id;
          const inStock = me && p.delivery.weeks === 0 && p.delivery.colour;
          return (
            <article key={q.id} className={`card flex flex-col p-5 ${mine ? "border-mint/60" : ""}`}>
              <h3 className="text-lg leading-snug">{q.showroom}</h3>
              <p className="mt-1 flex items-center gap-3 text-sm text-dim">
                <span>{q.showroomLocality}</span>
                {q.showroomRating > 0 && (
                  <span className="flex items-center gap-1"><Star className="size-3.5 fill-accent text-accent" aria-hidden />{q.showroomRating.toFixed(1)}</span>
                )}
              </p>
              <p className={`mt-4 text-xs ${me && !p.exact ? "text-accent" : "text-faint"}`}>
                {me && me.variant && !p.exact ? `No price for ${me.variant}. Showing ${p.line.variant}.` : p.line.variant}
              </p>
              <dl className="mt-2 space-y-2 text-sm">
                {ROWS.map((r) => {
                  const v = r.get(p.line);
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
                <p className="text-sm text-dim">{me ? "Your on-road price" : "On-road price from"}</p>
                <p className="tnum font-display text-3xl">{rupees(p.line.onRoad)}</p>
                {p.line.onRoad === lowest && quotes.length > 1 && <p className="mt-1 text-sm font-medium text-mint">Lowest for you</p>}
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-dim">
                {inStock ? <PackageCheck className="size-4 text-mint" aria-hidden /> : <Truck className="size-4" aria-hidden />}
                {inStock ? (
                  <span className="text-mint">In stock for you{p.delivery.colour !== me?.colour ? ` in ${p.delivery.colour}` : ""}</span>
                ) : (
                  <span>{deliveryText(p.delivery.weeks)}{p.delivery.colour ? ` in ${p.delivery.colour}` : ""}</span>
                )}
              </p>
              {q.lines.length > 1 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-dim hover:text-text">All {q.lines.length} variants</summary>
                  <ul className="mt-2 space-y-1">
                    {q.lines.map((l) => (
                      <li key={l.id} className="flex justify-between gap-4">
                        <span className="text-dim">{l.variant}</span>
                        <span className="tnum">{rupees(l.onRoad)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {q.note && <p className="mt-3 text-sm leading-snug text-dim">“{q.note}”</p>}
              <p className="mt-3 text-sm text-dim">Valid until {shortDate(q.validUntil)}</p>

              {canAct && (
                mine ? (
                  <form action={withdrawAcceptance} className="mt-5">
                    <input type="hidden" name="groupId" value={group.id} />
                    <SubmitButton className="btn btn-quiet w-full" pendingText="Updating">Change my mind</SubmitButton>
                  </form>
                ) : (
                  <PickOffer groupId={group.id} quoteId={q.id} showroom={q.showroom} switching={!!myAcceptedId} />
                )
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
