import { requireAdmin } from "@/lib/session";
import { AdminTab } from "@/components/admin-tab";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="shell pt-10 lg:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-5xl leading-none sm:text-6xl">Admin</h1>
        <nav className="flex gap-1 overflow-x-auto rounded-full border border-line bg-panel p-1" aria-label="Admin sections">
          <AdminTab href="/admin" exact>Dashboard</AdminTab>
          <AdminTab href="/admin/groups">Groups</AdminTab>
          <AdminTab href="/admin/users">Users</AdminTab>
          <AdminTab href="/admin/showrooms">Showrooms</AdminTab>
        </nav>
      </div>
      <div className="mt-10">{children}</div>
    </div>
  );
}
