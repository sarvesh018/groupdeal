"use client";

import { useActionState } from "react";
import { acceptQuote, type GroupFormState } from "@/app/actions/groups";
import { SubmitButton } from "./submit-button";
import { FormError } from "./form-message";

/** Picking an offer shares the buyer's name and phone with that one showroom, so we ask first. */
export function PickOffer({ groupId, quoteId, showroom, switching }: { groupId: number; quoteId: number; showroom: string; switching: boolean }) {
  const [state, action] = useActionState<GroupFormState, FormData>(acceptQuote, null);
  return (
    <form action={action} className="mt-5 space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <label className="flex items-start gap-2.5 text-[13px] leading-snug text-dim">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-accent" />
        <span>Share my name and phone number with {showroom} so they can call me about this offer.</span>
      </label>
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Saving">
        {switching ? "Switch to this offer" : "I want this offer"}
      </SubmitButton>
    </form>
  );
}
