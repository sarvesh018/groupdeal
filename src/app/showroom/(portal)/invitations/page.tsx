import Link from "next/link";
import { requireShowroom } from "@/lib/session";
import { invitationOpen, listInvitations } from "@/lib/showroom-queries";
import { deadlineText, shortDate } from "@/lib/format";

export const metadata = { title: "Invitations" };

const LABEL: Record<string, string> = { invited: "New", accepted: "Quote in progress", declined: "Declined", quoted: "Quote sent" };

export default async function InvitationsPage() {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") return <p className="text-dim">Invitations are handled by your manager.</p>;
  const rows = await listInvitations(ctx.showroom.id);
  const open = rows.filter((r) => invitationOpen(r, r.groupStatus));
  const closed = rows.filter((r) => !invitationOpen(r, r.groupStatus));
  return (
    <div className="space-y-14">
      <section>
        <h2 className="text-2xl">Open</h2>
        <p className="mt-2 text-dim">Groups of {ctx.showroom.brand} buyers in {ctx.showroom.city} asking for your best price. Quotes are sealed: other showrooms never see yours.</p>
        <List rows={open} empty="No open invitations right now." />
      </section>
      {closed.length > 0 && (
        <section>
          <h2 className="text-2xl">Closed</h2>
          <List rows={closed} closed />
        </section>
      )}
    </div>
  );
}

function List({ rows, empty, closed }: { rows: Awaited<ReturnType<typeof listInvitations>>; empty?: string; closed?: boolean }) {
  if (rows.length === 0) return <p className="mt-6 border-y border-line py-6 text-dim">{empty}</p>;
  return (
    <ul className="rule mt-6">
      {rows.map((r) => (
        <li key={r.id} className="border-b border-line">
          <Link href={`/showroom/invitations/${r.id}`} className="group grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_10rem] sm:items-baseline">
            <span className="min-w-0">
              <span className="block truncate font-display text-2xl tracking-[-0.03em] group-hover:text-accent">{r.brand} {r.model}</span>
              <span className="block text-sm text-dim">Group #{r.groupId}, {r.members} buyers</span>
            </span>
            <span className={`text-sm ${r.status === "invited" && !closed ? "text-accent" : "text-dim"}`}>
              {closed && r.status !== "quoted" && r.status !== "declined" ? "Not sent" : LABEL[r.status]}
              {r.quoteStatus === "draft" && !closed && " (draft)"}
            </span>
            <span className="tnum text-sm text-dim">{closed ? `Closed ${shortDate(r.deadline)}` : deadlineText(r.deadline)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
