"use client";

import { useActionState, useState } from "react";
import { login, register, type FormState } from "@/app/actions/auth";
import { CITY_LOCALITIES } from "@/lib/constants";
import { SubmitButton } from "./submit-button";
import { FormError } from "./form-message";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, null);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} className="field" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Signing in">Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm({
  cities,
  next,
}: {
  cities: { id: number; name: string; slug: string }[];
  next?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(register, null);
  const [cityId, setCityId] = useState(state?.fields?.cityId ?? String(cities[0]?.id ?? ""));
  const slug = cities.find((c) => String(c.id) === cityId)?.slug ?? "";
  const localities = CITY_LOCALITIES[slug] ?? [];
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" autoComplete="name" required defaultValue={state?.fields?.name} className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" inputMode="numeric" autoComplete="tel-national" placeholder="10 digits" required defaultValue={state?.fields?.phone} className="field" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cityId">City</label>
          <select id="cityId" name="cityId" value={cityId} onChange={(e) => setCityId(e.target.value)} className="field">
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="locality">Area</label>
          <select id="locality" name="locality" key={slug} defaultValue={state?.fields?.locality ?? ""} className="field">
            <option value="">Choose later</option>
            {localities.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="field" />
        <p className="mt-1.5 text-xs text-faint">At least 8 characters.</p>
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Creating account">Create account</SubmitButton>
    </form>
  );
}
