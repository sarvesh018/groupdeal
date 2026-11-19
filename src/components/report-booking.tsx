"use client";

import { useActionState } from "react";
import { reportBooking, type GroupFormState } from "@/app/actions/groups";
import { SubmitButton } from "./submit-button";
import { FormError, FormSaved } from "./form-message";

export function ReportBooking({ groupId }: { groupId: number }) {
  const [state, action] = useActionState<GroupFormState, FormData>(reportBooking, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="bookingNo">Booking number</label>
          <input id="bookingNo" name="bookingNo" required minLength={3} maxLength={40} className="field" placeholder="From your receipt" />
        </div>
        <div>
          <label className="label" htmlFor="receipt">Receipt photo <span className="text-faint">(optional, up to 2 MB)</span></label>
          <input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="field file:mr-3 file:rounded-full file:border-0 file:bg-raised file:px-3 file:py-1 file:text-sm file:text-text" />
        </div>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton className="btn btn-quiet" pendingText="Sending">I&apos;ve booked</SubmitButton>
    </form>
  );
}
