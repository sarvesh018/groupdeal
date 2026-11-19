"use client";

import { useActionState, useState } from "react";
import { createStatements, inviteShowrooms, resolveDispute, saveFeeBands, type AdminState } from "@/app/actions/admin";
import { SubmitButton } from "./submit-button";
import { FormError, FormSaved } from "./form-message";

export function InviteForm({
  groupId,
  showrooms,
}: {
  groupId: number;
  showrooms: { id: number; name: string; locality: string; invited: boolean }[];
}) {
  const [state, action] = useActionState<AdminState, FormData>(inviteShowrooms, null);
  if (showrooms.length === 0) return <p className="text-sm text-dim">No verified showrooms of this brand in this city yet.</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <fieldset className="space-y-2">
        <legend className="label">Showrooms</legend>
        {showrooms.map((s) => (
          <label key={s.id} className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="showroomId" value={s.id} defaultChecked={!s.invited} className="size-4 accent-accent" />
            <span>{s.name} <span className="text-dim">{s.locality}</span>{s.invited && <span className="text-faint"> (invited, ticking extends the deadline)</span>}</span>
          </label>
        ))}
      </fieldset>
      <div>
        <label className="label" htmlFor="inv-days">Quotes close in</label>
        <select id="inv-days" name="days" defaultValue="3" className="field">
          <option value="2">2 days</option>
          <option value="3">3 days</option>
          <option value="5">5 days</option>
          <option value="7">7 days</option>
        </select>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton pendingText="Inviting">Invite to quote</SubmitButton>
    </form>
  );
}

export function ResolveDisputeForm({ disputeId }: { disputeId: number }) {
  const [state, action] = useActionState<AdminState, FormData>(resolveDispute, null);
  if (state?.saved) return <FormSaved message={state.saved} />;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="disputeId" value={disputeId} />
      <select name="decision" aria-label="Decision" className="field py-1.5">
        <option value="fee_due">Booked through us: fee due</option>
        <option value="no_fee">Not proven: no fee</option>
      </select>
      <input name="note" required minLength={5} placeholder="Reason, for example: receipt matches" aria-label="Reason" className="field py-1.5" />
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary btn-sm" pendingText="Saving">Decide</SubmitButton>
    </form>
  );
}

export function FeeBandsForm({ bands }: { bands: { minPrice: number; fee: number }[] }) {
  const [state, action] = useActionState<AdminState, FormData>(saveFeeBands, null);
  const [rows, setRows] = useState(Math.max(bands.length, 1));
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm text-dim">
        <span>From ex-showroom price (lakh)</span>
        <span>Fee per booking (₹, before GST)</span>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-2 gap-3">
          <input name={`min_${i}`} defaultValue={bands[i] ? String(bands[i].minPrice / 100000) : ""} inputMode="decimal" aria-label={`Band ${i + 1} starts at, in lakh`} className="field tnum" />
          <input name={`fee_${i}`} defaultValue={bands[i]?.fee ?? ""} inputMode="numeric" aria-label={`Band ${i + 1} fee`} className="field tnum" />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {rows < 8 && <button type="button" onClick={() => setRows(rows + 1)} className="btn btn-quiet btn-sm">Add a band</button>}
        <span className="text-xs text-faint">Clear both boxes to remove a band. Each band runs up to the next one&apos;s start.</span>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton pendingText="Saving">Save fee bands</SubmitButton>
    </form>
  );
}

export function StatementsForm({ months }: { months: { key: string; label: string }[] }) {
  const [state, action] = useActionState<AdminState, FormData>(createStatements, null);
  if (months.length === 0) return <p className="text-sm text-dim">No fees yet.</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="st-month">Month</label>
        <select id="st-month" name="month" className="field min-w-48">
          {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>
      <SubmitButton pendingText="Creating">Create invoices</SubmitButton>
      <div className="basis-full">
        <FormError message={state?.error} />
        <FormSaved message={state?.saved} />
      </div>
    </form>
  );
}
