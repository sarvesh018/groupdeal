"use client";

import { useActionState, useState } from "react";
import {
  addStaff,
  registerShowroom,
  respondDispute,
  updateReferral,
  updateShowroomSettings,
  type PortalState,
} from "@/app/actions/showroom";
import { CITY_LOCALITIES } from "@/lib/constants";
import { LOST_REASONS, REFERRAL_LABEL } from "@/lib/rules";
import { SubmitButton } from "./submit-button";
import { FormError, FormSaved } from "./form-message";

const fileClass =
  "field file:mr-3 file:rounded-full file:border-0 file:bg-raised file:px-3 file:py-1 file:text-sm file:text-text";

export function ShowroomRegisterForm({
  cities,
  brands,
}: {
  cities: { id: number; name: string; slug: string }[];
  brands: { id: number; name: string }[];
}) {
  const [state, action] = useActionState<PortalState, FormData>(registerShowroom, null);
  const f = state?.fields ?? {};
  const [cityId, setCityId] = useState(f.cityId ?? String(cities[0]?.id ?? ""));
  const slug = cities.find((c) => String(c.id) === cityId)?.slug ?? "";
  return (
    <form action={action} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-xl tracking-[-0.02em]">The showroom</legend>
        <div>
          <label className="label" htmlFor="showroomName">Showroom name</label>
          <input id="showroomName" name="showroomName" required defaultValue={f.showroomName} className="field" placeholder="As on your dealership board" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brandId">Brand you sell</label>
            <select id="brandId" name="brandId" defaultValue={f.brandId} className="field">
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cityId">City</label>
            <select id="cityId" name="cityId" value={cityId} onChange={(e) => setCityId(e.target.value)} className="field">
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="locality">Area</label>
            <input id="locality" name="locality" required list="sr-localities" defaultValue={f.locality} className="field" />
            <datalist id="sr-localities">{(CITY_LOCALITIES[slug] ?? []).map((l) => <option key={l} value={l} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="dealerCode">Dealer code <span className="text-faint">(optional)</span></label>
            <input id="dealerCode" name="dealerCode" defaultValue={f.dealerCode} className="field" placeholder="Issued by the carmaker" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Address <span className="text-faint">(optional)</span></label>
          <textarea id="address" name="address" rows={2} defaultValue={f.address} className="field" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="gstNumber">GSTIN <span className="text-faint">(optional now)</span></label>
            <input id="gstNumber" name="gstNumber" maxLength={15} defaultValue={f.gstNumber} className="field uppercase" placeholder="27ABCDE1234F1Z5" />
          </div>
          <div>
            <label className="label" htmlFor="document">Dealership letter or GST certificate <span className="text-faint">(optional, 2 MB)</span></label>
            <input id="document" name="document" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={fileClass} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl tracking-[-0.02em]">You</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ownerName">Your name</label>
            <input id="ownerName" name="ownerName" required autoComplete="name" defaultValue={f.ownerName} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile</label>
            <input id="phone" name="phone" required inputMode="numeric" autoComplete="tel-national" defaultValue={f.phone} className="field" placeholder="10 digits" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input id="email" name="email" type="email" required autoComplete="email" defaultValue={f.email} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
          </div>
        </div>
      </fieldset>

      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary w-full py-3 text-base" pendingText="Sending">Apply as a showroom</SubmitButton>
      <p className="text-sm text-dim">We check every showroom before it can see buyers. Usually within two working days.</p>
    </form>
  );
}

const ACTIONS: Record<string, string[]> = {
  acknowledged: ["contacted", "test_drive", "booked", "lost"],
  contacted: ["test_drive", "booked", "lost"],
  test_drive: ["booked", "lost"],
  booked: ["delivered"],
  expired: ["booked"],
};

export function ReferralUpdateForm({ referralId, status }: { referralId: number; status: string }) {
  const [state, action] = useActionState<PortalState, FormData>(updateReferral, null);
  const options = ACTIONS[status] ?? [];
  const [picked, setNext] = useState(options[0] ?? "");
  if (options.length === 0) return null;
  const next = options.includes(picked) ? picked : options[0];
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="referralId" value={referralId} />
      <div>
        <label className="label" htmlFor="ref-status">Move to</label>
        <select id="ref-status" name="status" value={next} onChange={(e) => setNext(e.target.value)} className="field">
          {options.map((o) => <option key={o} value={o}>{REFERRAL_LABEL[o]}</option>)}
        </select>
      </div>
      {next === "booked" && (
        <div>
          <label className="label" htmlFor="bookingNo">Booking or order number</label>
          <input id="bookingNo" name="bookingNo" required minLength={3} maxLength={40} className="field" />
          <p className="mt-1.5 text-xs text-faint">The fee for this booking is added to your monthly statement.</p>
        </div>
      )}
      {next === "lost" && (
        <div>
          <label className="label" htmlFor="lostReason">Why didn&apos;t it happen?</label>
          <select id="lostReason" name="lostReason" className="field">
            {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      )}
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton className="btn btn-primary" pendingText="Saving">Save</SubmitButton>
    </form>
  );
}

export function DisputeResponseForm({ disputeId, buyerBookingNo }: { disputeId: number; buyerBookingNo: string }) {
  const [state, action] = useActionState<PortalState, FormData>(respondDispute, null);
  const [decision, setDecision] = useState("confirm");
  if (state?.saved) return <FormSaved message={state.saved} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="disputeId" value={disputeId} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Your answer">
        {[
          ["confirm", "Yes, they booked with us"],
          ["reject", "No, not with us"],
        ].map(([v, l]) => (
          <label key={v} className={`chip ${decision === v ? "chip-on" : ""}`}>
            <input type="radio" name="decision" value={v} checked={decision === v} onChange={() => setDecision(v)} className="sr-only" />
            {l}
          </label>
        ))}
      </div>
      {decision === "confirm" ? (
        <input name="bookingNo" defaultValue={buyerBookingNo} aria-label="Booking number" className="field" />
      ) : (
        <textarea name="response" rows={2} required minLength={10} aria-label="Why this booking isn't yours" placeholder="For example: no booking with this number in our DMS." className="field" />
      )}
      <FormError message={state?.error} />
      <SubmitButton className="btn btn-primary btn-sm" pendingText="Sending">Send answer</SubmitButton>
    </form>
  );
}

export function StaffForm() {
  const [state, action] = useActionState<PortalState, FormData>(addStaff, null);
  return (
    <form action={action} className="space-y-4" key={state?.saved}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="st-name">Name</label>
          <input id="st-name" name="name" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="st-role">Role</label>
          <select id="st-role" name="role" className="field">
            <option value="executive">Sales executive: sees only buyers assigned to them</option>
            <option value="manager">Manager: sees everything, sends quotes</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="st-email">Email</label>
          <input id="st-email" name="email" type="email" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="st-phone">Mobile</label>
          <input id="st-phone" name="phone" required inputMode="numeric" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="st-pw">Starting password</label>
          <input id="st-pw" name="password" type="text" required minLength={8} className="field" />
        </div>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton className="btn btn-primary" pendingText="Adding">Add to team</SubmitButton>
    </form>
  );
}

export function ShowroomSettingsForm({
  value,
}: {
  value: { phone: string; locality: string; address: string; gstNumber: string; dealerCode: string };
}) {
  const [state, action] = useActionState<PortalState, FormData>(updateShowroomSettings, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-phone">Showroom phone</label>
          <input id="s-phone" name="phone" defaultValue={value.phone} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="s-locality">Area</label>
          <input id="s-locality" name="locality" defaultValue={value.locality} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="s-address">Address</label>
        <textarea id="s-address" name="address" rows={2} defaultValue={value.address} className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-gst">GSTIN</label>
          <input id="s-gst" name="gstNumber" maxLength={15} defaultValue={value.gstNumber} className="field uppercase" />
        </div>
        <div>
          <label className="label" htmlFor="s-code">Dealer code</label>
          <input id="s-code" name="dealerCode" defaultValue={value.dealerCode} className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="s-doc">Add a document <span className="text-faint">(JPG, PNG or PDF, 2 MB)</span></label>
        <input id="s-doc" name="document" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={fileClass} />
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton className="btn btn-primary" pendingText="Saving">Save changes</SubmitButton>
    </form>
  );
}
