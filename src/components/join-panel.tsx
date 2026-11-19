"use client";

import { useActionState } from "react";
import Link from "next/link";
import { joinGroup, leaveGroup, updateChoices, type GroupFormState } from "@/app/actions/groups";
import { ChoiceFields, type Choices } from "./choice-fields";
import { SubmitButton } from "./submit-button";
import { FormError, FormSaved } from "./form-message";

export function JoinForm({ groupId, months, variants, colours }: { groupId: number; months: string[]; variants: string[]; colours: string[] }) {
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
      <ChoiceFields variants={variants} colours={colours} idPrefix="join" />
      <div>
        <label className="label" htmlFor="note">Anything else the showroom should know? <span className="text-faint">(optional)</span></label>
        <input id="note" name="note" maxLength={200} placeholder="Exchange, loan" className="field" />
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

export function ChoicesForm({
  groupId,
  months,
  variants,
  colours,
  value,
  purchaseMonth,
}: {
  groupId: number;
  months: string[];
  variants: string[];
  colours: string[];
  value: Choices;
  purchaseMonth: string;
}) {
  const [state, action] = useActionState<GroupFormState, FormData>(updateChoices, null);
  const options = months.includes(purchaseMonth) || !purchaseMonth ? months : [purchaseMonth, ...months];
  return (
    // Remount with the saved values: React resets uncontrolled fields after a save.
    <form key={`${JSON.stringify(value)}${purchaseMonth}`} action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <ChoiceFields variants={variants} colours={colours} value={value} idPrefix="edit" />
      <div>
        <label className="label" htmlFor="edit-month">When do you plan to buy?</label>
        <select id="edit-month" name="purchaseMonth" className="field" defaultValue={purchaseMonth || months[0]}>
          {options.map((m) => <option key={m}>{m}</option>)}
          <option>Not sure yet</option>
        </select>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton className="btn btn-quiet w-full" pendingText="Saving">Save my choices</SubmitButton>
    </form>
  );
}
