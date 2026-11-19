import { requireShowroom } from "@/lib/session";
import { listStaff } from "@/lib/showroom-queries";
import { removeStaff } from "@/app/actions/showroom";
import { StaffForm } from "@/components/showroom-forms";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireShowroom({ owner: true });
  const staff = await listStaff(ctx.showroom.id);
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section>
        <h2 className="text-2xl">Your team</h2>
        <ul className="rule mt-6">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 border-b border-line py-4">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block truncate text-sm text-dim">{s.email}, {s.role}</span>
              </span>
              {s.role !== "owner" && (
                <form action={removeStaff}>
                  <input type="hidden" name="userId" value={s.id} />
                  <SubmitButton className="text-sm text-dim hover:text-rose" pendingText="Removing">Remove</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-dim">Removing someone hands their buyers back to the shared list.</p>
      </section>
      <section>
        <h2 className="text-2xl">Add someone</h2>
        <p className="mt-2 text-dim">Give them the email and starting password. They can change it under Profile.</p>
        <div className="mt-6"><StaffForm /></div>
      </section>
    </div>
  );
}
