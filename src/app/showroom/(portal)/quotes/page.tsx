import Link from "next/link";
import { requireShowroom } from "@/lib/session";
import { listShowroomQuotes } from "@/lib/showroom-queries";
import { rupees, shortDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Quotes" };

export default async function QuotesPage() {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") return <p className="text-dim">Quotes are handled by your manager.</p>;
  const rows = await listShowroomQuotes(ctx.showroom.id);
  return (
    <div>
      <p className="max-w-2xl text-dim">How each quote did. Your rank against other showrooms appears once buyers can see the offers.</p>
      {rows.length === 0 ? (
        <p className="mt-6 border-y border-line py-6 text-dim">No quotes yet. Open an invitation to send one.</p>
      ) : (
        <div className="table-wrap mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dim">
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 text-right font-medium">From</th>
                <th className="px-4 py-3 text-right font-medium">Rank</th>
                <th className="px-4 py-3 text-right font-medium">Picked you</th>
                <th className="px-4 py-3 text-right font-medium">Picked another</th>
                <th className="px-4 py-3 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.model}</span>
                    <span className="block text-xs text-dim">#{r.groupId}, {r.members} buyers</span>
                  </td>
                  <td className="px-4 py-3">{r.status === "draft" ? <span className="text-accent">Draft, not sent</span> : <StatusBadge status={r.groupStatus} />}</td>
                  <td className="tnum px-4 py-3 text-right">{rupees(r.onRoad)}</td>
                  <td className="tnum px-4 py-3 text-right">{r.rank ? `${r.rank} of ${r.rivals}` : <span className="text-faint">Sealed</span>}</td>
                  <td className="tnum px-4 py-3 text-right text-mint">{r.released ? r.picks : "–"}</td>
                  <td className="tnum px-4 py-3 text-right">{r.released ? r.picksElsewhere : "–"}</td>
                  <td className="tnum px-4 py-3 text-dim">{r.submittedAt ? shortDate(r.submittedAt) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm text-dim">Rank compares your lowest on-road price with other showrooms&apos; lowest. <Link href="/showroom/invitations" className="text-text underline underline-offset-4">Open invitations</Link></p>
    </div>
  );
}
