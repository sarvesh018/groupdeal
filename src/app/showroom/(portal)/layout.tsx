import { requireShowroom } from "@/lib/session";
import { AdminTab } from "@/components/admin-tab";

export const metadata = { title: "Showroom" };

export default async function ShowroomLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireShowroom({ approved: false });
  const approved = ctx.showroom.status === "approved";
  const owner = ctx.staffRole === "owner";
  return (
    <div className="shell pt-10 lg:pt-14">
      <div className="print-hide flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-dim">
            {ctx.showroom.brand}, {ctx.showroom.city}
            <span className="ml-3 text-faint">Signed in as {ctx.user.name}, {ctx.staffRole}</span>
          </p>
          <h1 className="mt-2 truncate text-4xl leading-none sm:text-5xl">{ctx.showroom.name}</h1>
        </div>
        <nav className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-panel p-1" aria-label="Showroom sections">
          <AdminTab href="/showroom" exact>Home</AdminTab>
          {approved && (
            <>
              {ctx.staffRole !== "executive" && <AdminTab href="/showroom/invitations">Invitations</AdminTab>}
              {ctx.staffRole !== "executive" && <AdminTab href="/showroom/quotes">Quotes</AdminTab>}
              <AdminTab href="/showroom/buyers">Buyers</AdminTab>
              {ctx.staffRole !== "executive" && <AdminTab href="/showroom/billing">Billing</AdminTab>}
              {owner && <AdminTab href="/showroom/team">Team</AdminTab>}
            </>
          )}
          {owner && <AdminTab href="/showroom/settings">Settings</AdminTab>}
        </nav>
      </div>
      <div className="mt-10">{children}</div>
    </div>
  );
}
