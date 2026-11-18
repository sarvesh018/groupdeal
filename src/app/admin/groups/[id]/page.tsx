import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getGroup } from "@/lib/queries";
import { GROUP_STATUSES, MEMBER_STAGES, STAGE_LABEL, STATUS_LABEL } from "@/lib/constants";
import { referralCode, rupees, shortDate } from "@/lib/format";
import { deleteQuote, setGroupStatus, setMemberStage } from "@/app/actions/admin";
import { StatusBadge } from "@/components/status-badge";
import { Seats } from "@/components/seats";
import { ActionSelect } from "@/components/action-select";
import { QuoteForm } from "@/components/quote-form";

export default async function AdminGroup({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); // pages render alongside the layout, so each one checks for itself
  const { id } = await params;
  const g = await getGroup(Number(id));
  if (!g) notFound();
  const verified = g.memberRows.filter((m) => m.stage !== "interested").length;

  return (
    <div>
      <Link href="/admin/groups" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> All groups
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h2 className="text-4xl">{g.brand} {g.model}</h2>
          <p className="mt-1 text-dim">{g.city}. Closes {shortDate(g.deadline)}. <Link href={`/groups/${g.id}`} className="text-accent hover:underline">View as a buyer</Link></p>
          <div className="mt-4"><Seats filled={g.members} total={g.targetSize} showNext={false} /></div>
          <p className="mt-2 text-sm text-dim">
            <span className="tnum text-text">{g.members}</span> of {g.targetSize} buyers, <span className="tnum text-text">{verified}</span> verified
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-dim">Stage</p>
          <div className="mt-1"><StatusBadge status={g.status} /></div>
          <label className="label mt-4" htmlFor="status">Move this group to</label>
          <ActionSelect
            action={setGroupStatus}
            idName="groupId"
            id={g.id}
            name="status"
            value={g.status}
            label="Move this group to"
            selectId="status"
            className="field min-w-56"
            options={GROUP_STATUSES.map((x) => ({ value: x, label: STATUS_LABEL[x] }))}
          />
          <p className="mt-2 max-w-56 text-xs text-faint">Buyers see offers once the stage is “Offers in”.</p>
        </div>
      </div>

      <section className="mt-10">
        <h3 className="text-2xl">Members</h3>
        <p className="mt-1 text-sm text-dim">Call each buyer, then mark the serious ones as verified. Contact details are visible to admins only.</p>
        <div className="table-wrap mt-4">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Area</th><th>Buying in</th><th>Note</th><th>Reference</th><th>Stage</th></tr></thead>
            <tbody>
              {g.memberRows.map((m) => (
                <tr key={m.id}>
                  <td><span className="font-medium">{m.name}</span><span className="block text-xs text-faint">{m.email}</span></td>
                  <td className="tnum whitespace-nowrap">{m.phone}</td>
                  <td className="text-dim">{m.locality || "Not set"}</td>
                  <td className="whitespace-nowrap text-dim">{m.purchaseMonth || "Not said"}</td>
                  <td className="max-w-48 text-dim">{m.note}</td>
                  <td className="tnum whitespace-nowrap text-dim">{m.acceptedQuoteId ? referralCode(g.id, m.id) : ""}</td>
                  <td>
                    <ActionSelect
                      action={setMemberStage}
                      idName="membershipId"
                      id={m.id}
                      name="stage"
                      value={m.stage}
                      label={`Stage for ${m.name}`}
                      options={MEMBER_STAGES.map((x) => ({ value: x, label: STAGE_LABEL[x] }))}
                    />
                  </td>
                </tr>
              ))}
              {g.memberRows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-faint">Nobody has joined yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl">Quotes received</h3>
          <p className="mt-1 text-sm text-dim">Enter each showroom&apos;s written quote exactly as received.</p>
          <ul className="mt-4 space-y-3">
            {g.quoteRows.map((q) => {
              const picks = g.memberRows.filter((m) => m.acceptedQuoteId === q.id).length;
              return (
                <li key={q.id} className="card flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{q.showroom}</p>
                    <p className="tnum mt-0.5 font-display text-2xl">{rupees(q.onRoad)}</p>
                    <p className="mt-1 text-sm text-dim">
                      Discounts {rupees(q.makerOffer + q.dealerDiscount)}, delivery {q.deliveryWeeks} wk, valid until {shortDate(q.validUntil)}
                    </p>
                    <p className="mt-1 text-sm text-mint">{picks} {picks === 1 ? "member" : "members"} picked this</p>
                  </div>
                  <form action={deleteQuote}>
                    <input type="hidden" name="quoteId" value={q.id} />
                    <button className="grid size-9 place-items-center rounded-full text-dim transition hover:bg-rose/10 hover:text-rose" aria-label={`Delete quote from ${q.showroom}`} title="Delete quote">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                </li>
              );
            })}
            {g.quoteRows.length === 0 && <li className="rounded-xl border border-dashed border-line p-6 text-sm text-faint">No quotes yet. Add the first one.</li>}
          </ul>
        </div>
        <div className="card p-6">
          <h3 className="mb-5 text-xl">Add a quote</h3>
          <QuoteForm
            groupId={g.id}
            showrooms={g.localShowrooms.map((s) => ({ id: s.id, name: s.name, locality: s.locality }))}
            suggestedPrice={Math.round((g.priceMin + g.priceMax) / 2 / 1000) * 1000}
          />
        </div>
      </section>
    </div>
  );
}
