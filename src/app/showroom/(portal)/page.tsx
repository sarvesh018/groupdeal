import Link from "next/link";
import { ArrowUpRight, Clock, ShieldAlert } from "lucide-react";
import { requireShowroom } from "@/lib/session";
import { showroomHome } from "@/lib/showroom-queries";
import { rupees, shortDate } from "@/lib/format";

export default async function ShowroomHome() {
  const ctx = await requireShowroom({ approved: false });
  const s = ctx.showroom;

  if (s.status !== "approved") {
    const suspended = s.status === "suspended";
    return (
      <section className="card max-w-2xl p-7 sm:p-9">
        {suspended ? <ShieldAlert className="size-7 text-rose" aria-hidden /> : <Clock className="size-7 text-accent" aria-hidden />}
        <h2 className="mt-5 text-3xl leading-tight">{suspended ? "Your account is paused" : "We're checking your showroom"}</h2>
        <p className="mt-3 leading-relaxed text-dim">
          {suspended
            ? "You can't receive invitations or buyers while the account is paused. Contact GroupDeal support to sort it out."
            : "Before a showroom sees any buyer, we confirm it is an authorised dealer. This usually takes two working days. A GST certificate or the carmaker's dealership letter speeds it up."}
        </p>
        {!suspended && ctx.staffRole === "owner" && (
          <Link href="/showroom/settings" className="btn btn-primary mt-6">Add a document</Link>
        )}
      </section>
    );
  }

  const exec = ctx.staffRole === "executive";
  const h = await showroomHome(s.id, ctx.user.id, exec);
  const todo = [
    !exec && h.openInvitations > 0 && { href: "/showroom/invitations", n: h.openInvitations, text: h.openInvitations === 1 ? "group waiting for your quote" : "groups waiting for your quote" },
    h.newBuyers > 0 && { href: "/showroom/buyers?status=sent", n: h.newBuyers, text: h.newBuyers === 1 ? "new buyer to acknowledge" : "new buyers to acknowledge" },
    !exec && h.openDisputes > 0 && { href: "/showroom/billing#disputes", n: h.openDisputes, text: h.openDisputes === 1 ? "booking a buyer reported, to confirm" : "bookings buyers reported, to confirm" },
  ].filter(Boolean) as { href: string; n: number; text: string }[];

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <h2 className="text-2xl">To do</h2>
        {todo.length === 0 ? (
          <p className="mt-4 border-y border-line py-6 text-dim">Nothing waiting. New invitations and buyers show up here.</p>
        ) : (
          <ul className="rule mt-4">
            {todo.map((t) => (
              <li key={t.href} className="border-b border-line">
                <Link href={t.href} className="group flex items-baseline gap-5 py-5">
                  <span className="tnum font-display text-5xl leading-none tracking-[-0.04em] text-accent">{t.n}</span>
                  <span className="flex-1 text-lg">{t.text}</span>
                  <ArrowUpRight className="size-5 text-faint transition group-hover:text-text" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border border-line bg-line sm:grid-cols-4">
          {[
            ["Talking to", h.inProgress],
            ["Booked or delivered", h.booked],
            ...(exec ? [] : [["Fees due", rupees(h.amountDue)]]),
            ["Free bookings left", Math.max(0, s.freeBookings - h.bookingsCharged)],
          ].map(([k, v]) => (
            <div key={String(k)} className="bg-panel p-5">
              <dt className="text-sm text-dim">{k}</dt>
              <dd className="tnum mt-1 font-display text-3xl tracking-[-0.03em]">{v}</dd>
            </div>
          ))}
        </dl>
        {!exec && <p className="mt-3 text-xs text-faint">Free bookings are the first {s.freeBookings} confirmed bookings, with no fee.</p>}
      </div>

      <aside>
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl">Recent</h2>
          <Link href="/notifications" className="text-sm text-dim hover:text-text">All updates</Link>
        </div>
        <ul className="rule mt-4">
          {h.recent.length === 0 && <li className="border-b border-line py-4 text-sm text-dim">No updates yet.</li>}
          {h.recent.map((n) => (
            <li key={n.id} className="border-b border-line py-4">
              <Link href={n.href || "/notifications"} className="block hover:text-accent">
                <span className={`block text-sm ${n.readAt ? "text-dim" : "font-medium text-text"}`}>{n.title}</span>
                <span className="mt-0.5 block text-xs text-faint">{shortDate(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
