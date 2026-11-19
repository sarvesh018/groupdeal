import { FEATURES } from "@/lib/rules";

export type Choices = {
  variant: string;
  colour: string;
  altColours: string;
  transmission: string;
  features: string;
  flexibleTrim: boolean;
};

const none: Choices = { variant: "", colour: "", altColours: "", transmission: "", features: "", flexibleTrim: false };

/**
 * A member's own choices within the group's car. Showrooms see these as totals
 * ("6 want the Top variant, 4 in white") and quote per variant and colour.
 */
export function ChoiceFields({
  variants,
  colours,
  value = none,
  idPrefix = "c",
}: {
  variants: string[];
  colours: string[];
  value?: Choices;
  idPrefix?: string;
}) {
  const alt = value.altColours.split(",");
  const feats = value.features.split(",");
  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-lg tracking-[-0.02em]">Your choices</legend>
      <p className="-mt-2 text-sm text-dim">Showrooms price each variant and say which colours they can deliver soonest.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${idPrefix}-variant`}>Variant</label>
          <select id={`${idPrefix}-variant`} name="variant" defaultValue={value.variant} className="field">
            <option value="">No preference yet</option>
            {variants.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-tx`}>Gearbox</label>
          <select id={`${idPrefix}-tx`} name="myTransmission" defaultValue={value.transmission} className="field">
            <option value="">Either</option>
            <option>Manual</option>
            <option>Automatic</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-colour`}>First-choice colour</label>
        <select id={`${idPrefix}-colour`} name="colour" defaultValue={value.colour} className="field">
          <option value="">No preference</option>
          {colours.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <p className="label">Also fine with</p>
        <div className="flex flex-wrap gap-2">
          {colours.map((c) => (
            <label key={c} className="chip cursor-pointer has-[:checked]:border-accent has-[:checked]:text-text">
              <input type="checkbox" name="altColours" value={c} defaultChecked={alt.includes(c)} className="accent-accent" />
              {c}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-faint">More colours often means a quicker delivery.</p>
      </div>
      <div>
        <p className="label">Must-have features</p>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <label key={f} className="chip cursor-pointer has-[:checked]:border-accent has-[:checked]:text-text">
              <input type="checkbox" name="features" value={f} defaultChecked={feats.includes(f)} className="accent-accent" />
              {f}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="flexibleTrim" defaultChecked={value.flexibleTrim} className="mt-0.5 size-4 accent-accent" />
        <span>I&apos;d take a nearby variant if it&apos;s in stock or cheaper.</span>
      </label>
    </fieldset>
  );
}
