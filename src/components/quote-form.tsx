"use client";

import { useActionState, useState } from "react";
import { addQuote, type AdminState } from "@/app/actions/admin";
import { rupees } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import { FormError, FormSaved } from "./form-message";

const FIELDS = [
  { name: "exShowroom", label: "Ex-showroom price", sign: 1 },
  { name: "makerOffer", label: "Carmaker offer", sign: -1 },
  { name: "dealerDiscount", label: "Showroom discount", sign: -1 },
  { name: "insurance", label: "Insurance", sign: 1 },
  { name: "rto", label: "RTO and registration", sign: 1 },
  { name: "accessories", label: "Accessories", sign: 1 },
  { name: "otherCharges", label: "Other charges", sign: 1 },
] as const;

export function QuoteForm({
  groupId,
  showrooms,
  suggestedPrice,
}: {
  groupId: number;
  showrooms: { id: number; name: string; locality: string }[];
  suggestedPrice: number;
}) {
  const [state, action] = useActionState<AdminState, FormData>(addQuote, null);
  const [v, setV] = useState<Record<string, number>>({
    exShowroom: suggestedPrice,
    makerOffer: 0,
    dealerDiscount: 0,
    insurance: Math.round((suggestedPrice * 0.032) / 100) * 100,
    rto: Math.round((suggestedPrice * 0.11) / 100) * 100,
    accessories: 0,
    otherCharges: 0,
  });
  const onRoad = FIELDS.reduce((sum, f) => sum + f.sign * (v[f.name] || 0), 0);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <div>
        <label className="label" htmlFor="showroomId">Showroom</label>
        <select id="showroomId" name="showroomId" className="field">
          {showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.locality}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="label" htmlFor={f.name}>{f.label} (₹){f.sign < 0 && <span className="text-mint"> deducted</span>}</label>
            <input
              id={f.name}
              name={f.name}
              type="number"
              min={0}
              step={100}
              value={v[f.name]}
              onChange={(e) => setV({ ...v, [f.name]: Number(e.target.value) })}
              className="field tnum"
            />
          </div>
        ))}
        <div>
          <label className="label" htmlFor="deliveryWeeks">Delivery (weeks, 0 = in stock)</label>
          <input id="deliveryWeeks" name="deliveryWeeks" type="number" min={0} max={52} defaultValue={2} className="field tnum" />
        </div>
        <div>
          <label className="label" htmlFor="validDays">Valid for (days)</label>
          <input id="validDays" name="validDays" type="number" min={1} max={60} defaultValue={7} className="field tnum" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-ink/50 px-4 py-3">
        <span className="text-sm text-dim">On-road price, worked out from the lines above</span>
        <span className="tnum font-display text-2xl">{rupees(onRoad)}</span>
      </div>
      <FormError message={state?.error} />
      <FormSaved message={state?.saved} />
      <SubmitButton pendingText="Adding">Add quote</SubmitButton>
    </form>
  );
}
