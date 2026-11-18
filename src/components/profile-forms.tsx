"use client";

import { useActionState, useState } from "react";
import { changePassword, updateProfile, type ProfileState } from "@/app/actions/profile";
import { CITY_LOCALITIES } from "@/lib/constants";
import { SubmitButton } from "./submit-button";
import { FormError, FormSaved } from "./form-message";

export function ProfileForm({
  user,
  cities,
}: {
  user: { name: string; email: string; phone: string; cityId: number; locality: string };
  cities: { id: number; name: string; slug: string }[];
}) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, null);
  const [cityId, setCityId] = useState(user.cityId);
  const slug = cities.find((c) => c.id === cityId)?.slug ?? "";
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" required defaultValue={user.name} className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" value={user.email} disabled className="field opacity-60" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" inputMode="numeric" required defaultValue={user.phone} className="field" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cityId">City</label>
          <select id="cityId" name="cityId" value={cityId} onChange={(e) => setCityId(Number(e.target.value))} className="field">
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="locality">Area</label>
          <select id="locality" name="locality" key={slug} defaultValue={cityId === user.cityId ? user.locality : ""} className="field">
            <option value="">Not set</option>
            {(CITY_LOCALITIES[slug] ?? []).map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton pendingText="Saving">Save changes</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ProfileState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-4" key={state?.saved}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" autoComplete="current-password" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="next">New password</label>
          <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className="field" />
        </div>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton className="btn btn-quiet" pendingText="Changing">Change password</SubmitButton>
    </form>
  );
}
