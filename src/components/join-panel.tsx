"use client";

import { useActionState } from "react";
import Link from "next/link";
import { joinGroup, leaveGroup, type GroupFormState } from "@/app/actions/groups";
import { SubmitButton } from "./submit-button";
import { FormError } from "./form-message";

export function JoinForm({ groupId, months }: { groupId: number; months: string[] }) {
  const [state, action] = useActionState<GroupFormState, FormData>(joinGroup, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <div>
        <label className="label" htmlFor="purchaseMonth">When do you plan to buy?</label>
        <select id="purchaseMonth" name="purchaseMonth" className="field" defaultValue={months[0]}>
          {months.map((m) => <option key={m}>{m}</option>)}
          <option>Not sure yet</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="note">Anything the showroom should know? <span className="text-faint">(optional)</span></label>
        <input id="note" name="note" maxLength={200} placeholder="Colour, exchange, loan" className="field" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full py-3 text-base" pendingText="Taking your seat">Take a seat</SubmitButton>
      <p className="text-center text-xs text-faint">Free. No deposit. Leave any time.</p>
    </form>
  );
}

export function LeaveForm({ groupId }: { groupId: number }) {
  return (
    <form action={leaveGroup}>
      <input type="hidden" name="groupId" value={groupId} />
      <SubmitButton className="text-sm text-dim underline-offset-4 hover:text-rose hover:underline" pendingText="Leaving">
        Leave this group
      </SubmitButton>
    </form>
  );
}

export function SignInToJoin({ groupId }: { groupId: number }) {
  const next = encodeURIComponent(`/groups/${groupId}`);
  return (
    <div className="space-y-3">
      <Link href={`/register?next=${next}`} className="btn btn-primary w-full py-3 text-base">Create account to join</Link>
      <Link href={`/login?next=${next}`} className="btn btn-quiet w-full">I already have an account</Link>
      <p className="text-center text-xs text-faint">Free. No deposit. Leave any time.</p>
    </div>
  );
}
