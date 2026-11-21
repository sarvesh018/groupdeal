import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireShowroom } from "@/lib/session";
import { getInvitation, invitationOpen, type Tally } from "@/lib/showroom-queries";
import { respondInvitation } from "@/app/actions/showroom";
import { deadlineText, priceRange, shortDate } from "@/lib/format";
import { QuoteBuilder } from "@/components/quote-builder";
import { SubmitButton } from "@/components/submit-button";
import { CarPhoto } from "@/components/car-photo";

export const metadata = { title: "Invitation" };

function Bars({ title, rows, total }: { title: string; rows: Tally; total: number }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-medium text-dim">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[8rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-raised">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (r.n / Math.max(1, total)) * 100)}%` }} />
            </span>
            <span className="tnum text-right text-dim">{r.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") notFound();
  const { id } = await params;
  const inv = await getInvitation(Number(id), ctx.showroom.id);
  if (!inv) notFound();
  const open = invitationOpen(inv.inv, inv.group.status);
  const d = inv.demand;
  const demandByVariant = Object.fromEntries(d.variants.map((v) => [v.label, v.n]));

  return (
    <div>
      <Link href="/showroom/invitations" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Invitations
      </Link>
      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <CarPhoto brand={inv.brand} model={inv.model} bodyType={inv.bodyType} width={640} credit className="aspect-[16/10] w-full max-w-xs rounded-(--radius-card) border border-line" />
        <div className="mr-auto">
          <p className="text-sm text-dim">Group #{inv.group.id} in {inv.city}</p>
          <h2 className="mt-2 text-5xl leading-none tracking-[-0.04em] sm:text-6xl">{inv.brand} {inv.model}</h2>
          <p className="mt-3 text-dim">{priceRange(inv.priceMin, inv.priceMax)} ex-showroom range</p>
        </div>
        <div className="text-right">
          <p className={`text-lg ${open ? "text-accent" : "text-dim"}`}>{open ? deadlineText(inv.inv.deadline) : "Closed"}</p>
          <p className="text-sm text-dim">Quotes close {shortDate(inv.inv.deadline)}</p>
        </div>
      </header>

      <section className="mt-12 grid gap-10 rounded-(--radius-card) border border-line p-6 sm:p-8 lg:grid-cols-3">
        <div className="lg:col-span-3 flex flex-wrap gap-x-12 gap-y-4">
          <p><span className="tnum font-display text-5xl tracking-[-0.04em]">{d.members}</span> <span className="text-dim">buyers</span></p>
          <p><span className="tnum font-display text-5xl tracking-[-0.04em]">{d.verified}</span> <span className="text-dim">verified</span></p>
          <p><span className="tnum font-display text-5xl tracking-[-0.04em]">{d.flexible}</span> <span className="text-dim">open to a nearby variant</span></p>
        </div>
        <Bars title="Variant" rows={d.variants} total={d.members} />
        <Bars title="First-choice colour" rows={d.colours} total={d.members} />
        <Bars title="Also fine with" rows={d.alsoOk} total={d.members} />
        <Bars title="Gearbox" rows={d.transmission} total={d.members} />
        <Bars title="Must-have features" rows={d.features} total={d.members} />
        <Bars title="Plans to buy" rows={d.months} total={d.members} />
        <p className="text-sm text-dim lg:col-span-3">Names and phone numbers are shared only with the showroom each buyer picks, and only with their consent.</p>
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {inv.inv.status === "declined" ? (
            <p className="border-y border-line py-6 text-dim">You declined this invitation.</p>
          ) : (
            <QuoteBuilder
              invitationId={inv.inv.id}
              variants={inv.variants}
              colours={inv.colours}
              demandByVariant={demandByVariant}
              existing={inv.lines}
              existingColours={inv.colourRows}
              deliveryWeeks={inv.quote?.deliveryWeeks ?? 2}
              note={inv.quote?.note ?? ""}
              locked={!open}
              defaults={{ priceMin: inv.priceMin, priceMax: inv.priceMax }}
            />
          )}
        </div>
        <aside className="space-y-4 text-sm text-dim">
          <p>
            Status:{" "}
            <span className="text-text">
              {inv.quote?.status === "submitted" ? "Quote sent" : inv.quote ? "Draft saved, not sent" : inv.inv.status === "declined" ? "Declined" : "No quote yet"}
            </span>
          </p>
          <p>Your quote is sealed. Buyers see all quotes together after the deadline, each with the price for their own variant and colour.</p>
          <p>You pay a fee only when a buyer you were referred books. No fee for quoting.</p>
          {open && inv.inv.status !== "quoted" && inv.inv.status !== "declined" && (
            <form action={respondInvitation}>
              <input type="hidden" name="invitationId" value={inv.inv.id} />
              <input type="hidden" name="decision" value="decline" />
              <SubmitButton className="text-dim underline-offset-4 hover:text-rose hover:underline" pendingText="Declining">Decline this invitation</SubmitButton>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
