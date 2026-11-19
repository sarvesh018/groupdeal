import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { adminShowroom } from "@/lib/admin-queries";
import { setFreeBookings, setShowroomStatus } from "@/app/actions/admin";
import { REFERRAL_LABEL } from "@/lib/rules";
import { rupees, shortDate } from "@/lib/format";
import { ActionSelect } from "@/components/action-select";
import { SubmitButton } from "@/components/submit-button";

export default async function AdminShowroomPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const d = await adminShowroom(Number(id));
  if (!d) notFound();
  const s = d.s;
  const facts = [
    ["Brand", d.brand],
    ["City", `${s.locality}, ${d.city}`],
    ["Address", s.address || "Not given"],
    ["Phone", s.phone],
    ["GSTIN", s.gstNumber || "Not given"],
    ["Dealer code", s.dealerCode || "Not given"],
    ["Joined", shortDate(s.createdAt)],
    ["Verified", s.verifiedAt ? shortDate(s.verifiedAt) : "Not yet"],
  ];
  return (
    <div>
      <Link href="/admin/showrooms" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> All showrooms
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <h2 className="text-4xl">{s.name}</h2>
        <div className="card flex flex-wrap items-end gap-6 p-5">
          <div>
            <label className="label" htmlFor="sr-status">Status</label>
            <ActionSelect
              selectId="sr-status"
              action={setShowroomStatus}
              idName="showroomId"
              id={s.id}
              name="status"
              value={s.status}
              label="Status"
              className="field min-w-44"
              options={[
                { value: "pending", label: "To verify" },
                { value: "approved", label: "Verified" },
                { value: "suspended", label: "Paused" },
              ]}
            />
          </div>
          <form action={setFreeBookings} className="flex items-end gap-2">
            <input type="hidden" name="showroomId" value={s.id} />
            <div>
              <label className="label" htmlFor="free">Free bookings</label>
              <input id="free" name="freeBookings" type="number" min={0} max={50} defaultValue={s.freeBookings} className="field w-24" />
            </div>
            <SubmitButton className="btn btn-quiet" pendingText="Saving">Save</SubmitButton>
          </form>
        </div>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <section>
          <h3 className="text-2xl">Details</h3>
          <dl className="mt-4">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 border-b border-line py-2.5 text-sm">
                <dt className="text-dim">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-10 text-2xl">Documents</h3>
          {d.docs.length === 0 ? (
            <p className="mt-3 text-sm text-dim">None uploaded. Ask for a GST certificate or the carmaker&apos;s dealership letter before verifying.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {d.docs.map((doc) => (
                <li key={doc.id}>
                  <a href={`/admin/documents/${doc.id}?kind=showroom`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-accent">{doc.fileName}</a>
                  <span className="text-dim">, {shortDate(doc.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h3 className="text-2xl">Team</h3>
          <ul className="mt-4">
            {d.staff.map((u) => (
              <li key={u.id} className="flex justify-between gap-4 border-b border-line py-2.5 text-sm">
                <span>{u.name} <span className="text-dim">{u.email}</span></span>
                <span className="text-dim">{u.role}</span>
              </li>
            ))}
            {d.staff.length === 0 && <li className="py-2.5 text-sm text-dim">No logins. This showroom was added by GroupDeal.</li>}
          </ul>
          <h3 className="mt-10 text-2xl">Activity</h3>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-dim">Invited to quote</dt><dd className="tnum text-right">{d.invitations.invited}</dd>
            <dt className="text-dim">Quoted</dt><dd className="tnum text-right">{d.invitations.quoted}</dd>
            {d.byStatus.map((b) => (
              <Fragment key={b.status}>
                <dt className="text-dim">Buyers: {REFERRAL_LABEL[b.status]}</dt>
                <dd className="tnum text-right">{b.n}</dd>
              </Fragment>
            ))}
            <dt className="text-dim">Fees earned</dt><dd className="tnum text-right">{rupees(d.fees.billed)}</dd>
            <dt className="text-dim">Free-trial bookings</dt><dd className="tnum text-right">{d.fees.waived}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
