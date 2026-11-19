import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listNotifications } from "@/lib/showroom-queries";
import { markNotificationsRead } from "@/app/actions/showroom";
import { shortDate } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Updates" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const rows = await listNotifications(user.id);
  const unread = rows.filter((r) => !r.readAt).length;
  return (
    <div className="shell max-w-3xl pt-12 lg:pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-6xl leading-none">Updates</h1>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <SubmitButton className="btn btn-quiet btn-sm" pendingText="Marking">Mark {unread} as read</SubmitButton>
          </form>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="mt-10 border-y border-line py-6 text-dim">Nothing yet. Offers, referrals and bookings show up here.</p>
      ) : (
        <ul className="rule mt-10">
          {rows.map((n) => (
            <li key={n.id} className="border-b border-line">
              <Link href={n.href || "#"} className="group flex gap-4 py-5">
                <span className={`mt-2 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent"}`} aria-label={n.readAt ? undefined : "Unread"} />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.readAt ? "text-dim" : "font-medium"} group-hover:text-accent`}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-sm text-dim">{n.body}</span>}
                </span>
                <span className="tnum shrink-0 text-xs text-faint">{shortDate(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
