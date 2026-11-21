"use client";

import { startTransition, useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { saveQuote, type PortalState } from "@/app/actions/showroom";
import { rupees } from "@/lib/format";
import { onRoadOf } from "@/lib/rules";
import { FormError, FormSaved } from "./form-message";

type Line = {
  variant: string;
  exShowroom: number;
  makerOffer: number;
  dealerDiscount: number;
  insurance: number;
  rto: number;
  accessories: number;
  otherCharges: number;
};

const FIELDS: { key: keyof Omit<Line, "variant">; label: string; minus?: boolean }[] = [
  { key: "exShowroom", label: "Ex-showroom" },
  { key: "makerOffer", label: "Carmaker offer", minus: true },
  { key: "dealerDiscount", label: "Your discount", minus: true },
  { key: "insurance", label: "Insurance" },
  { key: "rto", label: "RTO and registration" },
  { key: "accessories", label: "Accessories" },
  { key: "otherCharges", label: "Other charges" },
];

const num = (s: string) => {
  const n = Number(s.replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function Buttons({ disabled, pending, which }: { disabled: boolean; pending: boolean; which: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button type="submit" name="intent" value="submit" disabled={disabled || pending} className="btn btn-primary">
        {pending && which === "submit" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Send quote
      </button>
      <button type="submit" name="intent" value="draft" disabled={disabled || pending} className="btn btn-quiet">
        {pending && which === "draft" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Save draft
      </button>
    </div>
  );
}

/**
 * The rate card a showroom sends a group: a price per variant it can supply,
 * plus delivery time per colour. Buyers each see the line for their own choice.
 */
export function QuoteBuilder({
  invitationId,
  variants,
  colours,
  demandByVariant,
  existing,
  existingColours,
  deliveryWeeks,
  note,
  locked,
  defaults,
}: {
  invitationId: number;
  variants: string[];
  colours: string[];
  demandByVariant: Record<string, number>;
  existing: Line[];
  existingColours: { colour: string; deliveryWeeks: number }[];
  deliveryWeeks: number;
  note: string;
  locked: boolean;
  defaults: { priceMin: number; priceMax: number };
}) {
  const [state, action, pending] = useActionState<PortalState, FormData>(saveQuote, null);
  const [which, setWhich] = useState("");
  const rows = [...variants, "All variants"];
  const [values, setValues] = useState(() =>
    rows.map((variant, i) => {
      const have = existing.find((l) => l.variant === variant);
      // A starting price spread across the model's range, lowest variant first. The showroom edits it.
      const t = variant === "All variants" || variants.length < 2 ? 0.5 : i / (variants.length - 1);
      const ex = Math.round((defaults.priceMin + (defaults.priceMax - defaults.priceMin) * t) / 1000) * 1000;
      const base: Line = have ?? {
        variant,
        exShowroom: ex,
        makerOffer: 0,
        dealerDiscount: 0,
        insurance: Math.round((ex * 0.034) / 100) * 100,
        rto: Math.round((ex * 0.11) / 100) * 100,
        accessories: 0,
        otherCharges: 0,
      };
      // Pre-tick the variants members asked for, or the saved lines.
      const on = existing.length ? !!have : variant !== "All variants" && (demandByVariant[variant] ?? 0) > 0;
      return { on, v: Object.fromEntries(FIELDS.map((f) => [f.key, String(base[f.key])])) as Record<string, string> };
    }),
  );
  // Controlled, because React resets uncontrolled fields after each save.
  const [colourWeeks, setColourWeeks] = useState<Record<string, string>>(() =>
    Object.fromEntries(colours.map((c) => [c, String(existingColours.find((x) => x.colour === c)?.deliveryWeeks ?? "")])),
  );
  const [usual, setUsual] = useState(String(deliveryWeeks));
  const [valid, setValid] = useState("10");
  const [noteText, setNoteText] = useState(note);
  const set = (i: number, patch: Partial<{ on: boolean; v: Record<string, string> }>) =>
    setValues((all) => all.map((row, k) => (k === i ? { ...row, ...patch, v: { ...row.v, ...(patch.v ?? {}) } } : row)));

  return (
    <form
      className="space-y-10"
      // Submitted by hand rather than with action={}: React resets a form after an action,
      // which would wipe the colour choices between "Save draft" and "Send quote".
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        setWhich(String(fd.get("intent") ?? ""));
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="invitationId" value={invitationId} />
      <fieldset disabled={locked} className="space-y-4">
        <legend className="font-display text-2xl tracking-[-0.02em]">Price per variant</legend>
        <p className="-mt-2 text-sm text-dim">Tick the variants you can supply. Whole rupees, every charge listed: buyers compare the on-road total.</p>
        {rows.map((variant, i) => {
          const row = values[i];
          const total = onRoadOf(Object.fromEntries(FIELDS.map((f) => [f.key, num(row.v[f.key])])) as Omit<Line, "variant">);
          const asked = demandByVariant[variant] ?? 0;
          return (
            <div key={variant} className={`rounded-(--radius-card) border p-5 transition-colors ${row.on ? "border-line-strong bg-panel" : "border-line"}`}>
              <label className="flex flex-wrap items-center gap-3">
                <input type="checkbox" name={`line_${i}_on`} checked={row.on} onChange={(e) => set(i, { on: e.target.checked })} className="size-4 accent-accent" />
                <span className="font-display text-xl tracking-[-0.02em]">{variant}</span>
                {variant === "All variants" ? (
                  <span className="text-sm text-faint">One price for anyone whose variant you don&apos;t list</span>
                ) : (
                  asked > 0 && <span className="text-sm text-accent">{asked} {asked === 1 ? "buyer wants" : "buyers want"} this</span>
                )}
                {row.on && <span className="tnum ml-auto font-display text-xl">{rupees(total)}</span>}
              </label>
              {row.on && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="label text-xs" htmlFor={`l${i}${f.key}`}>{f.label}{f.minus && " (−)"}</label>
                      <input
                        id={`l${i}${f.key}`}
                        name={`line_${i}_${f.key}`}
                        inputMode="numeric"
                        value={row.v[f.key]}
                        onChange={(e) => set(i, { v: { [f.key]: e.target.value } })}
                        className="field tnum py-2"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

      <fieldset disabled={locked} className="space-y-4">
        <legend className="font-display text-2xl tracking-[-0.02em]">Delivery by colour</legend>
        <p className="-mt-2 text-sm text-dim">Buyers whose colour you have in stock see &ldquo;In stock for you&rdquo;.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {colours.map((c, j) => {
            return (
              <div key={c} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5">
                <label htmlFor={`colour_${j}`} className="text-sm">{c}</label>
                <select id={`colour_${j}`} name={`colour_${j}`} value={colourWeeks[c]} onChange={(e) => setColourWeeks({ ...colourWeeks, [c]: e.target.value })} className="field w-40 py-1.5">
                  <option value="">Usual time</option>
                  <option value="0">In stock</option>
                  {[1, 2, 3, 4, 6, 8, 10, 12].map((w) => <option key={w} value={w}>{w} {w === 1 ? "week" : "weeks"}</option>)}
                </select>
              </div>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="deliveryWeeks">Usual delivery time</label>
            <select id="deliveryWeeks" name="deliveryWeeks" value={usual} onChange={(e) => setUsual(e.target.value)} className="field">
              <option value="0">In stock</option>
              {[1, 2, 3, 4, 6, 8, 10, 12].map((w) => <option key={w} value={w}>{w} {w === 1 ? "week" : "weeks"}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="validDays">Prices valid for</label>
            <select id="validDays" name="validDays" value={valid} onChange={(e) => setValid(e.target.value)} className="field">
              {[7, 10, 14, 21, 30].map((d) => <option key={d} value={d}>{d} days after you send</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="note">Note to buyers <span className="text-faint">(optional)</span></label>
          <textarea id="note" name="note" rows={2} maxLength={400} value={noteText} onChange={(e) => setNoteText(e.target.value)} className="field" placeholder="For example: exchange bonus of ₹15,000 on any old car, free 3-year maintenance." />
        </div>
      </fieldset>

      <div className="space-y-3 border-t border-line pt-6">
        <FormError message={state?.error} />
        <FormSaved message={state?.saved} />
        {locked ? <p className="text-dim">This invitation is closed.</p> : <Buttons disabled={locked} pending={pending} which={which} />}
      </div>
    </form>
  );
}
